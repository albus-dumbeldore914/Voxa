import type { User, Conversation, Message } from '../types';

export const mockCurrentUser: User = {
  id: 'usr-1',
  name: 'Pawan Kumar',
  phone: '+91 98765 43210',
  email: 'pawan@voxa.app',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  bio: 'Building awesome apps with VOXA ⚡',
  isOnline: true,
};

export const mockUsers: User[] = [
  {
    id: 'usr-2',
    name: 'Rahul Sharma',
    phone: '+91 98111 22334',
    email: 'rahul@voxa.app',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    bio: 'Coffee, code, and chill ☕',
    isOnline: true,
  },
  {
    id: 'usr-3',
    name: 'Priya Patel',
    phone: '+91 98222 33445',
    email: 'priya@voxa.app',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    bio: 'Product Designer @ Studio 🎨',
    isOnline: true,
  },
  {
    id: 'usr-4',
    name: 'Arjun Mehta',
    phone: '+91 98333 44556',
    email: 'arjun@voxa.app',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    bio: 'Let’s build something great 🚀',
    isOnline: false,
    lastSeen: '15m ago',
  },
  {
    id: 'usr-5',
    name: 'Akash Gupta',
    phone: '+91 98444 55667',
    email: 'akash@voxa.app',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    bio: 'Always up for a short convo! 💬',
    isOnline: false,
    lastSeen: '2h ago',
  },
  {
    id: 'usr-6',
    name: 'Sneha Reddy',
    phone: '+91 98555 66778',
    email: 'sneha@voxa.app',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    bio: 'Music enthusiast & traveler 🎧',
    isOnline: true,
  }
];

export const initialConversations: Conversation[] = [
  {
    id: 'conv-1',
    participant: mockUsers[0], // Rahul
    lastMessage: {
      id: 'msg-104',
      conversationId: 'conv-1',
      senderId: 'usr-2',
      content: 'Let’s quickly test the real-time messages! ⚡',
      status: 'READ',
      createdAt: '10:45 AM',
    },
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: 'conv-2',
    participant: mockUsers[1], // Priya
    lastMessage: {
      id: 'msg-202',
      conversationId: 'conv-2',
      senderId: 'usr-3',
      content: 'The light blue & white UI of VOXA looks crisp! ✨',
      status: 'DELIVERED',
      createdAt: 'Yesterday',
    },
    unreadCount: 2,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'conv-3',
    participant: mockUsers[2], // Arjun
    lastMessage: {
      id: 'msg-301',
      conversationId: 'conv-3',
      senderId: 'usr-1',
      content: 'Hey Arjun, did you get the OTP verification working?',
      status: 'READ',
      createdAt: '2 days ago',
    },
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: 'conv-4',
    participant: mockUsers[3], // Akash
    lastMessage: {
      id: 'msg-401',
      conversationId: 'conv-4',
      senderId: 'usr-5',
      content: 'Hey Pawan! Catch you later.',
      status: 'READ',
      createdAt: 'May 12',
    },
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
  }
];

export const initialMessages: Record<string, Message[]> = {
  'conv-1': [
    {
      id: 'msg-101',
      conversationId: 'conv-1',
      senderId: 'usr-1',
      content: 'Hey Rahul! Welcome to VOXA 🚀',
      status: 'READ',
      createdAt: '10:30 AM',
    },
    {
      id: 'msg-102',
      conversationId: 'conv-1',
      senderId: 'usr-2',
      content: 'Hey Pawan! Loving this super clean White & Sky Blue theme 😍',
      status: 'READ',
      createdAt: '10:32 AM',
    },
    {
      id: 'msg-103',
      conversationId: 'conv-1',
      senderId: 'usr-1',
      content: 'Yes! It has instant OTP login, phone & email connect, and real-time read receipts.',
      status: 'READ',
      createdAt: '10:35 AM',
    },
    {
      id: 'msg-104',
      conversationId: 'conv-1',
      senderId: 'usr-2',
      content: 'Let’s quickly test the real-time messages! ⚡',
      status: 'READ',
      createdAt: '10:45 AM',
    },
  ],
  'conv-2': [
    {
      id: 'msg-201',
      conversationId: 'conv-2',
      senderId: 'usr-1',
      content: 'Hey Priya, how are the designs looking?',
      status: 'READ',
      createdAt: 'Yesterday',
    },
    {
      id: 'msg-202',
      conversationId: 'conv-2',
      senderId: 'usr-3',
      content: 'The light blue & white UI of VOXA looks crisp! ✨',
      status: 'DELIVERED',
      createdAt: 'Yesterday',
    }
  ]
};
