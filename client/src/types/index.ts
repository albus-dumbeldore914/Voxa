export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  avatar?: string;
  bio?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'file';
  status: MessageStatus;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participant: User;
  lastMessage?: Message | null;
  unreadCount: number;
  updatedAt: string;
  isTyping?: boolean;
}

export interface AuthResponse {
  user: User;
  token: string;
}
