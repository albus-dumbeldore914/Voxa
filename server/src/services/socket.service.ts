import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'voxa_super_secret_jwt_key_2026_messenger_app';

interface SocketUser {
  id: string;
  phone: string;
  email: string;
  name: string;
}

// Track online socket connections
const onlineUsers = new Map<string, Set<string>>(); // userId -> Set of socketIds

export const initSocketService = (httpServer: HTTPServer, allowedOrigins: string[]) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Socket Authentication Middleware
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      // Allow unauthenticated connection or reject
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as SocketUser;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user: SocketUser | undefined = (socket as any).user;
    const userId = user?.id || (socket.handshake.query.userId as string);

    if (userId) {
      // Register user in online set
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)!.add(socket.id);

      // Join user's personal room for direct notifications
      socket.join(`user:${userId}`);

      // Update user presence in DB & broadcast
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: true },
        });
      } catch {}

      io.emit('user_online', { userId });
      console.log(`[Socket.IO] User online: ${userId} (Socket: ${socket.id})`);
    }

    // Join conversation room
    socket.on('join_conversation', (conversationId: string) => {
      socket.join(`conv:${conversationId}`);
      console.log(`[Socket.IO] Socket ${socket.id} joined conv:${conversationId}`);
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId: string) => {
      socket.leave(`conv:${conversationId}`);
    });

    // Send Message Real-Time Event
    socket.on('send_message', async (data: {
      conversationId: string;
      content: string;
      mediaUrl?: string;
      senderId?: string;
    }) => {
      try {
        const senderId = user?.id || data.senderId;
        if (!senderId) return;

        const newMessage = await prisma.message.create({
          data: {
            conversationId: data.conversationId,
            senderId,
            content: data.content,
            mediaUrl: data.mediaUrl || null,
            mediaType: data.mediaUrl ? 'image' : null,
            status: 'SENT',
          },
        });

        await prisma.conversation.update({
          where: { id: data.conversationId },
          data: { lastMessageAt: new Date() },
        });

        const formattedMessage = {
          id: newMessage.id,
          conversationId: newMessage.conversationId,
          senderId: newMessage.senderId,
          content: newMessage.content,
          mediaUrl: newMessage.mediaUrl,
          mediaType: newMessage.mediaType,
          status: newMessage.status,
          createdAt: newMessage.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        // Broadcast to everyone in conversation room
        io.to(`conv:${data.conversationId}`).emit('receive_message', formattedMessage);

        // Also notify members who might not have the chat room open currently
        const members = await prisma.conversationMember.findMany({
          where: { conversationId: data.conversationId },
        });

        for (const member of members) {
          if (member.userId !== senderId) {
            io.to(`user:${member.userId}`).emit('conversation_updated', {
              conversationId: data.conversationId,
              lastMessage: formattedMessage,
            });
          }
        }
      } catch (err) {
        console.error('[Socket.IO] Error handling send_message:', err);
      }
    });

    // Typing Indicators
    socket.on('typing_start', (data: { conversationId: string; userId: string; userName: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('user_typing_start', data);
    });

    socket.on('typing_stop', (data: { conversationId: string; userId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('user_typing_stop', data);
    });

    // Mark as Read event
    socket.on('message_read', async (data: { conversationId: string; readerId: string }) => {
      try {
        await prisma.message.updateMany({
          where: {
            conversationId: data.conversationId,
            senderId: { not: data.readerId },
            status: { not: 'READ' },
          },
          data: { status: 'READ' },
        });

        socket.to(`conv:${data.conversationId}`).emit('messages_marked_read', {
          conversationId: data.conversationId,
          readerId: data.readerId,
        });
      } catch (err) {
        console.error('[Socket.IO] Error handling message_read:', err);
      }
    });

    // Disconnect
    socket.on('disconnect', async () => {
      if (userId) {
        const userSockets = onlineUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            onlineUsers.delete(userId);

            const lastSeen = new Date();
            try {
              await prisma.user.update({
                where: { id: userId },
                data: { isOnline: false, lastSeen },
              });
            } catch {}

            io.emit('user_offline', { userId, lastSeen: lastSeen.toISOString() });
            console.log(`[Socket.IO] User offline: ${userId}`);
          }
        }
      }
    });
  });

  return io;
};
