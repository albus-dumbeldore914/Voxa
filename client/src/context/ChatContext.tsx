import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { Conversation, Message, User } from '../types';
import { useAuth } from './AuthContext';
import { sounds } from '../utils/sound';
import { apiClient } from '../api/apiClient';
import { getSocket } from '../api/socketClient';

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

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({});
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeConvRef = useRef<string | null>(null);
  activeConvRef.current = activeConversationId;

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const messages = activeConversationId ? allMessages[activeConversationId] || [] : [];

  // Fetch all conversations from backend
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

  // 🔒 EPHEMERAL PRIVACY: Clear chat on tab close or page reload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const convId = activeConvRef.current;
      const token = localStorage.getItem('voxa_token');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

      if (convId && token) {
        // Securely wipe the active conversation messages from the database on exit
        try {
          fetch(`${apiUrl}/chat/conversations/${convId}/messages`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            keepalive: true,
          });
        } catch {}
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
    };
  }, []);

  // Socket.IO real-time event listeners
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    // Join active conversation room if set
    if (activeConversationId) {
      socket.emit('join_conversation', activeConversationId);
    }

    const handleReceiveMessage = (msg: Message) => {
      console.log('[Socket.IO] ✉️ Received incoming message:', msg);

      // Play chime for incoming messages from the other user
      if (msg.senderId !== user.id) {
        sounds.playReceived();

        // 1. Acknowledge delivery immediately so sender sees Delivered (✓✓)
        socket.emit('message_delivered', {
          messageId: msg.id,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
        });
      }

      // 2. Append message to store
      setAllMessages((prev) => {
        const existingList = prev[msg.conversationId] || [];
        if (existingList.some((m) => m.id === msg.id)) {
          return prev;
        }
        return {
          ...prev,
          [msg.conversationId]: [...existingList, msg],
        };
      });

      // 3. Update conversation list preview & order
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === msg.conversationId);
        if (index === -1) {
          refreshConversations();
          return prev;
        }

        const targetConv = prev[index];
        const isCurrentActive = targetConv.id === activeConversationId;
        const updatedConv: Conversation = {
          ...targetConv,
          lastMessage: msg,
          unreadCount: isCurrentActive ? 0 : targetConv.unreadCount + 1,
          updatedAt: new Date().toISOString(),
        };

        const filtered = prev.filter((c) => c.id !== msg.conversationId);
        return [updatedConv, ...filtered];
      });

      // 4. If this chat is currently open, auto-mark as read so sender sees Blue Ticks (🔵✓✓)
      if (msg.conversationId === activeConversationId && msg.senderId !== user.id) {
        try {
          apiClient.patch(`/chat/conversations/${activeConversationId}/read`);
          socket.emit('message_read', { conversationId: activeConversationId, readerId: user.id });
        } catch {}
      }
    };

    const handleNewConversation = (newConv: Conversation) => {
      console.log('[Socket.IO] 🤝 New conversation started with:', newConv.participant.name);
      setConversations((prev) => {
        if (prev.some((c) => c.id === newConv.id)) return prev;
        return [newConv, ...prev];
      });
    };

    const handleMessageStatusUpdated = (data: { messageId: string; conversationId: string; status: 'DELIVERED' | 'READ' }) => {
      console.log(`[Socket.IO] ✓✓ Message status updated: ${data.messageId} -> ${data.status}`);
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
      console.log('[Socket.IO] 🔵✓✓ Messages marked READ by:', data.readerId);
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

    const handleConversationUpdated = (data: { conversationId: string; lastMessage: Message }) => {
      setConversations((prev) => {
        const exists = prev.some((c) => c.id === data.conversationId);
        if (!exists) {
          refreshConversations();
          return prev;
        }
        return prev.map((c) =>
          c.id === data.conversationId
            ? { ...c, lastMessage: data.lastMessage, updatedAt: new Date().toISOString() }
            : c
        );
      });
    };

    const handleChatCleared = (data: { conversationId: string; clearedBy: string }) => {
      console.log('[Socket.IO] 🗑️ Chat cleared event received for:', data.conversationId);
      setAllMessages((prev) => ({
        ...prev,
        [data.conversationId]: [],
      }));

      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId
            ? { ...c, lastMessage: null, unreadCount: 0 }
            : c
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
        prev.map((c) => (c.participant.id === data.userId ? { ...c, participant: { ...c.participant, isOnline: true } } : c))
      );
    };

    const handleUserOffline = (data: { userId: string }) => {
      setConversations((prev) =>
        prev.map((c) => (c.participant.id === data.userId ? { ...c, participant: { ...c.participant, isOnline: false } } : c))
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

  const selectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    markAsRead(conversationId);
    // In ephemeral mode, messages exist in live memory and clear on reload/close
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
      socket.emit('typing_stop', {
        conversationId: activeConversationId,
        userId: user.id,
      });
    }
  };

  const sendMessage = async (content: string, mediaUrl?: string) => {
    if (!activeConversation || !user) return;
    sounds.playSent();

    const tempId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const tempMsg: Message = {
      id: tempId,
      conversationId: activeConversation.id,
      senderId: user.id,
      content,
      mediaUrl,
      mediaType: mediaUrl ? 'image' : undefined,
      status: activeConversation.participant.isOnline ? 'DELIVERED' : 'SENT',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Optimistic UI update
    setAllMessages((prev) => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] || []), tempMsg],
    }));

    setConversations((prev) => {
      const filtered = prev.filter((c) => c.id !== activeConversation.id);
      const updated: Conversation = {
        ...activeConversation,
        lastMessage: tempMsg,
        updatedAt: new Date().toISOString(),
      };
      return [updated, ...filtered];
    });

    // 1. Emit real-time message via Socket.IO
    const socket = getSocket();
    socket.emit('send_message', {
      conversationId: activeConversation.id,
      senderId: user.id,
      content,
      mediaUrl,
    });

    // 2. Persist to backend database via REST API
    try {
      const res = await apiClient.post(`/chat/conversations/${activeConversation.id}/messages`, {
        content,
        mediaUrl,
      });
      if (res.data?.message) {
        const persistedMsg = res.data.message;
        setAllMessages((prev) => ({
          ...prev,
          [activeConversation.id]: (prev[activeConversation.id] || []).map((m) =>
            m.id === tempId ? persistedMsg : m
          ),
        }));
      }
    } catch (err) {
      console.error('[ChatContext] Failed to persist message:', err);
    }
  };

  const clearChat = async (conversationId: string) => {
    if (!user || !conversationId) return;

    // 1. Optimistically clear local state
    setAllMessages((prev) => ({
      ...prev,
      [conversationId]: [],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId ? { ...c, lastMessage: null, unreadCount: 0 } : c
      )
    );

    // 2. Emit clear_chat event to Socket.IO (clears real-time for other participant)
    const socket = getSocket();
    socket.emit('clear_chat', { conversationId, userId: user.id });

    // 3. Delete from database
    try {
      await apiClient.delete(`/chat/conversations/${conversationId}/messages`);
    } catch (err) {
      console.error('[ChatContext] Failed to clear chat history in database:', err);
    }
  };

  const startNewConversation = async (targetUser: User) => {
    const existing = conversations.find((c) => c.participant.id === targetUser.id);
    if (existing) {
      selectConversation(existing.id);
      return;
    }

    try {
      const res = await apiClient.post('/chat/conversations', {
        targetUserId: targetUser.id,
      });

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

    // Fallback local creation
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
