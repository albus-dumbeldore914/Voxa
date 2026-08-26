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
  searchUsers: (query: string) => Promise<User[]>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({});
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const hasFetched = useRef(false);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;
  const messages = activeConversationId ? allMessages[activeConversationId] || [] : [];

  // Fetch conversations from backend on login
  const fetchConversations = useCallback(async () => {
    if (!user || hasFetched.current) return;
    hasFetched.current = true;
    try {
      const res = await apiClient.get('/chat/conversations');
      if (res.data?.conversations) {
        setConversations(res.data.conversations);
      }
    } catch {
      setConversations([]);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      hasFetched.current = false;
      fetchConversations();
    } else {
      setConversations([]);
      setAllMessages({});
      setActiveConversationId(null);
      hasFetched.current = false;
    }
  }, [user?.id]);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId || !user) return;
    if (allMessages[activeConversationId]) return; // already loaded

    const fetchMessages = async () => {
      try {
        const res = await apiClient.get(`/chat/conversations/${activeConversationId}/messages`);
        if (res.data?.messages) {
          setAllMessages((prev) => ({ ...prev, [activeConversationId]: res.data.messages }));
        }
      } catch {
        setAllMessages((prev) => ({ ...prev, [activeConversationId]: [] }));
      }
    };

    fetchMessages();
  }, [activeConversationId, user]);

  // Socket.IO real-time listeners
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    if (activeConversationId) {
      socket.emit('join_conversation', activeConversationId);
    }

    const handleReceiveMessage = (msg: Message) => {
      if (msg.senderId !== user.id) sounds.playReceived();

      setAllMessages((prev) => {
        const current = prev[msg.conversationId] || [];
        if (current.some((m) => m.id === msg.id)) return prev;
        return { ...prev, [msg.conversationId]: [...current, msg] };
      });

      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? { ...c, lastMessage: msg, unreadCount: c.id === activeConversationId ? 0 : c.unreadCount + 1, updatedAt: new Date().toISOString() }
            : c
        )
      );
    };

    const handleTypingStart = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConversationId && data.userId !== user.id) setIsTyping(true);
    };

    const handleTypingStop = (data: { conversationId: string; userId: string }) => {
      if (data.conversationId === activeConversationId && data.userId !== user.id) setIsTyping(false);
    };

    const handleMessagesRead = (data: { conversationId: string }) => {
      if (data.conversationId === activeConversationId) {
        setAllMessages((prev) => ({
          ...prev,
          [data.conversationId]: (prev[data.conversationId] || []).map((m) => ({ ...m, status: 'READ' as const })),
        }));
      }
    };

    const handleUserOnline = (data: { userId: string }) => {
      setConversations((prev) =>
        prev.map((c) => c.participant.id === data.userId ? { ...c, participant: { ...c.participant, isOnline: true } } : c)
      );
    };

    const handleUserOffline = (data: { userId: string }) => {
      setConversations((prev) =>
        prev.map((c) => c.participant.id === data.userId ? { ...c, participant: { ...c.participant, isOnline: false } } : c)
      );
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('user_typing_start', handleTypingStart);
    socket.on('user_typing_stop', handleTypingStop);
    socket.on('messages_marked_read', handleMessagesRead);
    socket.on('user_online', handleUserOnline);
    socket.on('user_offline', handleUserOffline);

    return () => {
      if (activeConversationId) socket.emit('leave_conversation', activeConversationId);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('user_typing_start', handleTypingStart);
      socket.off('user_typing_stop', handleTypingStop);
      socket.off('messages_marked_read', handleMessagesRead);
      socket.off('user_online', handleUserOnline);
      socket.off('user_offline', handleUserOffline);
    };
  }, [user, activeConversationId]);

  const selectConversation = (conversationId: string) => {
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
      if (user) socket.emit('message_read', { conversationId, readerId: user.id });
    } catch {}
  };

  const emitTyping = (typingState: boolean) => {
    if (!activeConversationId || !user) return;
    const socket = getSocket();
    if (typingState) {
      socket.emit('typing_start', { conversationId: activeConversationId, userId: user.id, userName: user.name });
    } else {
      socket.emit('typing_stop', { conversationId: activeConversationId, userId: user.id });
    }
  };

  const sendMessage = async (content: string, mediaUrl?: string) => {
    if (!activeConversation || !user) return;
    sounds.playSent();

    const tempMsg: Message = {
      id: `msg-${Date.now()}`,
      conversationId: activeConversation.id,
      senderId: user.id,
      content,
      mediaUrl,
      mediaType: mediaUrl ? 'image' : undefined,
      status: 'SENT',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setAllMessages((prev) => ({
      ...prev,
      [activeConversation.id]: [...(prev[activeConversation.id] || []), tempMsg],
    }));
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id ? { ...c, lastMessage: tempMsg, updatedAt: new Date().toISOString() } : c
      )
    );

    const socket = getSocket();
    socket.emit('send_message', { conversationId: activeConversation.id, senderId: user.id, content, mediaUrl });

    try {
      await apiClient.post(`/chat/conversations/${activeConversation.id}/messages`, { content, mediaUrl });
    } catch {}
  };

  const startNewConversation = async (targetUser: User) => {
    // If already have a convo with them, just open it
    const existing = conversations.find((c) => c.participant.id === targetUser.id);
    if (existing) {
      setActiveConversationId(existing.id);
      return;
    }

    try {
      const res = await apiClient.post('/chat/conversations', { targetUserId: targetUser.id });
      if (res.data?.conversation) {
        const newConv = res.data.conversation;
        setConversations((prev) => [newConv, ...prev]);
        setAllMessages((prev) => ({ ...prev, [newConv.id]: [] }));
        setActiveConversationId(newConv.id);
        return;
      }
    } catch {}

    // Fallback: create conversation locally
    const newConvId = `conv-${Date.now()}`;
    const newConv: Conversation = { id: newConvId, participant: targetUser, unreadCount: 0, updatedAt: new Date().toISOString() };
    setConversations((prev) => [newConv, ...prev]);
    setAllMessages((prev) => ({ ...prev, [newConvId]: [] }));
    setActiveConversationId(newConvId);
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
        searchUsers,
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
