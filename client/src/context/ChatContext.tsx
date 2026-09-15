import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Conversation, Message, User } from '../types';
import { useAuth } from './AuthContext';
import { sounds } from '../utils/sound';
import { apiClient } from '../api/apiClient';
import { getSocket } from '../api/socketClient';
import { encryptMessage, decryptMessage } from '../utils/crypto';

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: Message[];
  isTyping: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectConversation: (conversationId: string) => void;
  sendMessage: (content: string, mediaUrl?: string) => Promise<void>;
  startNewConversation: (targetUser: User) => Promise<void>;
  markAsRead: (conversationId: string) => void;
  emitTyping: (isTyping: boolean) => void;
  clearChat: (conversationId: string) => Promise<void>;
  searchUsers: (query: string) => Promise<User[]>;
  refreshConversations: () => Promise<void>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Helper: wipe a conversation's messages from the DB (fire-and-forget)
function wipeConversationFromDB(convId: string) {
  const token = localStorage.getItem('voxa_token');
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  if (!convId || !token) return;
  fetch(`${apiUrl}/chat/conversations/${convId}/messages`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
    keepalive: true,
  }).catch(() => {});
}

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({});
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeConvRef = useRef<string | null>(null);
  activeConvRef.current = activeConversationId;

  // Track temp IDs of optimistically-added messages so the server echo replaces them
  const pendingTempIds = useRef<Set<string>>(new Set());

  // Track sent message IDs to avoid double-processing the server echo
  const sentMessageIds = useRef<Set<string>>(new Set());

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const messages = activeConversationId ? allMessages[activeConversationId] || [] : [];

  // ─── Fetch conversations ───────────────────────────────────────────────────
  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      const res = await apiClient.get('/chat/conversations');
      if (res.data?.conversations) {
        setConversations(res.data.conversations);
      }
    } catch (err) {
      console.warn('[ChatContext] Failed to fetch conversations:', err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshConversations();
    } else {
      setConversations([]);
      setAllMessages({});
      setActiveConversationId(null);
    }
  }, [user?.id, refreshConversations]);

  // ─── 🔒 Ephemeral Privacy: wipe DB on tab close / page reload ─────────────
  useEffect(() => {
    const handleBeforeUnload = () => {
      const convId = activeConvRef.current;
      if (convId) wipeConversationFromDB(convId);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, []);

  // ─── Socket.IO real-time events ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    if (activeConversationId) {
      socket.emit('join_conversation', activeConversationId);
    }

    const handleReceiveMessage = async (msg: Message & { tempId?: string | null }) => {
      console.log('[Socket] receive_message', msg.id, '| from:', msg.senderId, '| me:', user.id);

      // ── Decrypt the message content ──────────────────────────────────────
      let plainContent = msg.content;
      try {
        plainContent = await decryptMessage(msg.content, msg.conversationId);
      } catch {}
      const decryptedMsg: Message = { ...msg, content: plainContent };

      // ── OWN message echoed back from server: replace optimistic temp ──────
      if (msg.senderId === user.id) {
        const tempId = msg.tempId;
        if (tempId) pendingTempIds.current.delete(tempId);

        // Skip if we've already processed this real message ID
        if (sentMessageIds.current.has(msg.id)) return;
        sentMessageIds.current.add(msg.id);

        setAllMessages((prev) => {
          const list = prev[msg.conversationId] || [];
          // Already in list (real ID) → skip
          if (list.some((m) => m.id === msg.id)) return prev;
          // Find and replace the temp message
          const idx = tempId ? list.findIndex((m) => m.id === tempId) : -1;
          if (idx !== -1) {
            const updated = [...list];
            updated[idx] = decryptedMsg;
            return { ...prev, [msg.conversationId]: updated };
          }
          // Temp already cleaned up or not found — don't add duplicate
          return prev;
        });

        // Update sidebar preview with plaintext
        setConversations((prev) =>
          prev.map((c) =>
            c.id === msg.conversationId
              ? { ...c, lastMessage: decryptedMsg, updatedAt: new Date().toISOString() }
              : c
          )
        );
        return;
      }

      // ── Incoming message from the OTHER user ─────────────────────────────
      sounds.playReceived();

      // Acknowledge delivery so sender sees ✓✓
      socket.emit('message_delivered', {
        messageId: msg.id,
        conversationId: msg.conversationId,
        senderId: msg.senderId,
      });

      // Deduplicate by real ID
      setAllMessages((prev) => {
        const list = prev[msg.conversationId] || [];
        if (list.some((m) => m.id === msg.id)) return prev;
        return { ...prev, [msg.conversationId]: [...list, decryptedMsg] };
      });

      // Update conversation sidebar
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.conversationId);
        if (idx === -1) {
          refreshConversations();
          return prev;
        }
        const conv = prev[idx];
        const updated: Conversation = {
          ...conv,
          lastMessage: decryptedMsg,
          unreadCount: conv.id === activeConversationId ? 0 : conv.unreadCount + 1,
          updatedAt: new Date().toISOString(),
        };
        return [updated, ...prev.filter((c) => c.id !== msg.conversationId)];
      });

      // Auto-mark as read if this conversation is currently open
      if (msg.conversationId === activeConversationId) {
        try {
          apiClient.patch(`/chat/conversations/${activeConversationId}/read`);
          socket.emit('message_read', { conversationId: activeConversationId, readerId: user.id });
        } catch {}
      }
    };

    const handleNewConversation = (newConv: Conversation) => {
      setConversations((prev) => {
        if (prev.some((c) => c.id === newConv.id)) return prev;
        return [newConv, ...prev];
      });
    };

    const handleMessageStatusUpdated = (data: {
      messageId: string;
      conversationId: string;
      status: 'DELIVERED' | 'READ';
    }) => {
      setAllMessages((prev) => {
        const list = prev[data.conversationId] || [];
        return {
          ...prev,
          [data.conversationId]: list.map((m) =>
            m.id === data.messageId ? { ...m, status: data.status } : m
          ),
        };
      });

      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId && c.lastMessage?.id === data.messageId
            ? { ...c, lastMessage: { ...c.lastMessage, status: data.status } }
            : c
        )
      );
    };

    const handleMessagesRead = (data: { conversationId: string; readerId: string }) => {
      setAllMessages((prev) => {
        const list = prev[data.conversationId] || [];
        return {
          ...prev,
          [data.conversationId]: list.map((m) =>
            m.senderId !== data.readerId ? { ...m, status: 'READ' as const } : m
          ),
        };
      });
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId && c.lastMessage && c.lastMessage.senderId !== data.readerId
            ? { ...c, lastMessage: { ...c.lastMessage, status: 'READ' as const } }
            : c
        )
      );
    };

    const handleConversationUpdated = async (data: {
      conversationId: string;
      lastMessage: Message;
    }) => {
      // Decrypt the preview text
      let preview = data.lastMessage;
      try {
        const plain = await decryptMessage(data.lastMessage.content, data.conversationId);
        preview = { ...data.lastMessage, content: plain };
      } catch {}

      setConversations((prev) => {
        if (!prev.some((c) => c.id === data.conversationId)) {
          refreshConversations();
          return prev;
        }
        return prev.map((c) =>
          c.id === data.conversationId
            ? { ...c, lastMessage: preview, updatedAt: new Date().toISOString() }
            : c
        );
      });
    };

    const handleChatCleared = (data: { conversationId: string }) => {
      setAllMessages((prev) => ({ ...prev, [data.conversationId]: [] }));
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId ? { ...c, lastMessage: null, unreadCount: 0 } : c
        )
      );
    };

    const handleTypingStart = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConversationId && data.userId !== user.id) {
        setIsTyping(true);
      }
    };

    const handleTypingStop = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConversationId && data.userId !== user.id) {
        setIsTyping(false);
      }
    };

    const handleUserOnline = (data: { userId: string }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.participant.id === data.userId
            ? { ...c, participant: { ...c.participant, isOnline: true } }
            : c
        )
      );
    };

    const handleUserOffline = (data: { userId: string }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.participant.id === data.userId
            ? { ...c, participant: { ...c.participant, isOnline: false } }
            : c
        )
      );
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('new_conversation', handleNewConversation);
    socket.on('message_status_updated', handleMessageStatusUpdated);
    socket.on('messages_marked_read', handleMessagesRead);
    socket.on('conversation_updated', handleConversationUpdated);
    socket.on('chat_cleared', handleChatCleared);
    socket.on('user_typing_start', handleTypingStart);
    socket.on('user_typing_stop', handleTypingStop);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      if (activeConversationId) {
        socket.emit('leave_conversation', activeConversationId);
      }
      socket.off('receive_message', handleReceiveMessage);
      socket.off('new_conversation', handleNewConversation);
      socket.off('message_status_updated', handleMessageStatusUpdated);
      socket.off('messages_marked_read', handleMessagesRead);
      socket.off('conversation_updated', handleConversationUpdated);
      socket.off('chat_cleared', handleChatCleared);
      socket.off('user_typing_start', handleTypingStart);
      socket.off('user_typing_stop', handleTypingStop);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, [user, activeConversationId, refreshConversations]);

  // ─── Select conversation (clears previous conv locally + from DB) ──────────
  const selectConversation = (conversationId: string) => {
    const previousId = activeConvRef.current;

    // 🔒 EPHEMERAL: clear previous conversation from local state AND database
    if (previousId && previousId !== conversationId) {
      setAllMessages((prev) => ({ ...prev, [previousId]: [] }));
      wipeConversationFromDB(previousId);
    }

    setActiveConversationId(conversationId);
    markAsRead(conversationId);
  };

  const markAsRead = (conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
    );
    setAllMessages((prev) => ({
      ...prev,
      [conversationId]: (prev[conversationId] || []).map((m) =>
        m.status !== 'READ' ? { ...m, status: 'READ' as const } : m
      ),
    }));
    try {
      apiClient.patch(`/chat/conversations/${conversationId}/read`);
      const socket = getSocket();
      if (user) {
        socket.emit('message_read', { conversationId, readerId: user.id });
      }
    } catch {}
  };

  const emitTyping = (typingState: boolean) => {
    if (!activeConversationId || !user) return;
    const socket = getSocket();
    if (typingState) {
      socket.emit('typing_start', {
        conversationId: activeConversationId,
        userId: user.id,
        userName: user.name,
      });
    } else {
      socket.emit('typing_stop', { conversationId: activeConversationId, userId: user.id });
    }
  };

  // ─── Send message (encrypted) ─────────────────────────────────────────────
  const sendMessage = async (content: string, mediaUrl?: string) => {
    if (!activeConversation || !user) return;
    sounds.playSent();

    const tempId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    // Show plaintext in our own UI immediately (optimistic)
    const tempMsg: Message = {
      id: tempId,
      conversationId: activeConversation.id,
      senderId: user.id,
      content, // plain text in local UI
      mediaUrl,
      mediaType: mediaUrl ? 'image' : undefined,
      status: activeConversation.participant.isOnline ? 'DELIVERED' : 'SENT',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    pendingTempIds.current.add(tempId);

    setAllMessages((prev) => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] || []), tempMsg],
    }));
    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== activeConversation.id);
      return [{ ...activeConversation, lastMessage: tempMsg, updatedAt: new Date().toISOString() }, ...filtered];
    });

    // 🔒 Encrypt content before sending to server
    const encryptedContent = await encryptMessage(content, activeConversation.id);

    // Send via Socket.IO only (server persists to DB, echoes back with real ID)
    const socket = getSocket();
    socket.emit('send_message', {
      conversationId: activeConversation.id,
      senderId: user.id,
      content: encryptedContent,
      mediaUrl,
      tempId,
    });
  };

  // ─── Clear chat ────────────────────────────────────────────────────────────
  const clearChat = async (conversationId: string) => {
    if (!user || !conversationId) return;

    setAllMessages((prev) => ({ ...prev, [conversationId]: [] }));
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, lastMessage: null, unreadCount: 0 } : c
      )
    );

    const socket = getSocket();
    socket.emit('clear_chat', { conversationId, userId: user.id });

    try {
      await apiClient.delete(`/chat/conversations/${conversationId}/messages`);
    } catch (err) {
      console.error('[ChatContext] Failed to clear chat:', err);
    }
  };

  // ─── Start new conversation ────────────────────────────────────────────────
  const startNewConversation = async (targetUser: User) => {
    const existing = conversations.find((c) => c.participant.id === targetUser.id);
    if (existing) {
      selectConversation(existing.id);
      return;
    }

    try {
      const res = await apiClient.post('/chat/conversations', { targetUserId: targetUser.id });
      if (res.data?.conversation) {
        const newConv = res.data.conversation;
        setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
        setAllMessages((prev) => ({ ...prev, [newConv.id]: [] }));
        selectConversation(newConv.id);
        return;
      }
    } catch (err) {
      console.error('[ChatContext] Failed to create conversation:', err);
    }

    // Fallback
    const newConvId = `conv-${Date.now()}`;
    const newConv: Conversation = {
      id: newConvId,
      participant: targetUser,
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [newConv, ...prev]);
    setAllMessages((prev) => ({ ...prev, [newConvId]: [] }));
    selectConversation(newConvId);
  };

  // ─── Search users ─────────────────────────────────────────────────────────
  const searchUsers = async (query: string): Promise<User[]> => {
    if (!query.trim()) return [];
    try {
      const res = await apiClient.get(`/users/search?q=${encodeURIComponent(query)}`);
      return res.data?.users || [];
    } catch {
      return [];
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        isTyping,
        searchQuery,
        setSearchQuery,
        selectConversation,
        sendMessage,
        startNewConversation,
        markAsRead,
        emitTyping,
        clearChat,
        searchUsers,
        refreshConversations,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within a ChatProvider');
  return context;
};
