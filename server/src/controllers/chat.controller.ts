import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getConversations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get all conversations user is part of
    const memberships = await prisma.conversationMember.findMany({
      where: { userId },
      include: {
        conversation: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true,
                    avatar: true,
                    bio: true,
                    isOnline: true,
                    lastSeen: true,
                  },
                },
              },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: {
        conversation: {
          lastMessageAt: 'desc',
        },
      },
    });

    const conversations = await Promise.all(
      memberships.map(async (m) => {
        const conv = m.conversation;
        const otherMember = conv.members.find((member) => member.userId !== userId);
        const lastMessage = conv.messages[0] || null;

        // Calculate unread count
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            status: { not: 'READ' },
          },
        });

        return {
          id: conv.id,
          participant: otherMember ? otherMember.user : null,
          lastMessage: lastMessage
            ? {
                id: lastMessage.id,
                conversationId: lastMessage.conversationId,
                senderId: lastMessage.senderId,
                content: lastMessage.content,
                mediaUrl: lastMessage.mediaUrl,
                mediaType: lastMessage.mediaType,
                status: lastMessage.status,
                createdAt: lastMessage.createdAt.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              }
            : null,
          unreadCount,
          updatedAt: conv.lastMessageAt.toISOString(),
        };
      })
    );

    res.status(200).json({
      conversations: conversations.filter((c) => c.participant !== null),
    });
  } catch (error) {
    console.error('Error in getConversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
};

export const getOrCreateConversation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { targetUserId } = req.body;

    if (!userId || !targetUserId) {
      res.status(400).json({ error: 'targetUserId is required' });
      return;
    }

    if (userId === targetUserId) {
      res.status(400).json({ error: 'Cannot create conversation with yourself.' });
      return;
    }

    // Check if conversation already exists between userId and targetUserId
    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                avatar: true,
                bio: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existing) {
      const otherMember = existing.members.find((m) => m.userId !== userId);
      res.status(200).json({
        conversation: {
          id: existing.id,
          participant: otherMember ? otherMember.user : null,
          lastMessage: existing.messages[0] || null,
          unreadCount: 0,
          updatedAt: existing.lastMessageAt.toISOString(),
        },
      });
      return;
    }

    // Create new conversation
    const newConv = await prisma.conversation.create({
      data: {
        isGroup: false,
        members: {
          create: [{ userId }, { userId: targetUserId }],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                avatar: true,
                bio: true,
                isOnline: true,
                lastSeen: true,
              },
            },
          },
        },
      },
    });

    const otherMember = newConv.members.find((m) => m.userId !== userId);

    res.status(201).json({
      conversation: {
        id: newConv.id,
        participant: otherMember ? otherMember.user : null,
        lastMessage: null,
        unreadCount: 0,
        updatedAt: newConv.lastMessageAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Error in getOrCreateConversation:', error);
    res.status(500).json({ error: 'Failed to create or fetch conversation.' });
  }
};

export const getMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
    });

    const formatted = messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      content: m.content,
      mediaUrl: m.mediaUrl,
      mediaType: m.mediaType,
      status: m.status,
      createdAt: m.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));

    res.status(200).json({ messages: formatted });
  } catch (error) {
    console.error('Error in getMessages:', error);
    res.status(500).json({ error: 'Failed to fetch messages.' });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;
    const { content, mediaUrl, mediaType } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!content && !mediaUrl) {
      res.status(400).json({ error: 'Message content or media is required.' });
      return;
    }

    const newMessage = await prisma.message.create({
      data: {
        conversationId: id,
        senderId: userId,
        content: content || '',
        mediaUrl: mediaUrl || null,
        mediaType: mediaType || (mediaUrl ? 'image' : null),
        status: 'SENT',
      },
    });

    // Update conversation timestamp
    await prisma.conversation.update({
      where: { id },
      data: { lastMessageAt: new Date() },
    });

    res.status(201).json({
      message: {
        id: newMessage.id,
        conversationId: newMessage.conversationId,
        senderId: newMessage.senderId,
        content: newMessage.content,
        mediaUrl: newMessage.mediaUrl,
        mediaType: newMessage.mediaType,
        status: newMessage.status,
        createdAt: newMessage.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    });
  } catch (error) {
    console.error('Error in sendMessage:', error);
    res.status(500).json({ error: 'Failed to send message.' });
  }
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await prisma.message.updateMany({
      where: {
        conversationId: id,
        senderId: { not: userId },
        status: { not: 'READ' },
      },
      data: { status: 'READ' },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in markAsRead:', error);
    res.status(500).json({ error: 'Failed to mark messages as read.' });
  }
};
