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

// Track online socket connections (userId -> Set of socketIds)
const onlineUsers = new Map<string, Set<string>>();
let ioInstance: SocketIOServer | null = null;

export const getIO = (): SocketIOServer | null => ioInstance;

export const initSocketService = (httpServer: HTTPServer, allowedOrigins: string[]) => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        callback(null, true);
      },
      methods: ['GET', 'POST', 'DELETE', 'PATCH'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  ioInstance = io;

  // Socket Authentication Middleware
  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1] ||
      (socket.handshake.query?.token as string);

    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as SocketUser;
      (socket as any).user = decoded;
      next();
    } catch {
      next();
    }
  });

  io.on('connection', async (socket: Socket) => {
    const user: SocketUser | undefined = (socket as any).user;
    const userId = user?.id || (socket.handshake.query.userId as string);

    if (userId) {
      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId)!.add(socket.id);

      // Join user's personal notification room
      socket.join(`user:${userId}`);

      try {
        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: true },
        });
      } catch {}

      io.emit('user_online', { userId });
      console.log(`[Socket.IO] 🟢 User online: ${userId} (Socket: ${socket.id})`);
    }

    // Join conversation room
    socket.on('join_conversation', async (conversationId: string) => {
      if (!conversationId) return;
      socket.join(`conv:${conversationId}`);
      console.log(`[Socket.IO] Socket ${socket.id} (User: ${userId || 'guest'}) joined conv:${conversationId}`);

      // When user joins a conversation, automatically mark incoming messages as READ
      if (userId) {
        try {
          await prisma.message.updateMany({
            where: {
              conversationId,
              senderId: { not: userId },
              status: { not: 'READ' },
            },
            data: { status: 'READ' },
          });

          io.to(`conv:${conversationId}`).emit('messages_marked_read', {
            conversationId,
            readerId: userId,
          });

          // Also notify conversation members directly
          const members = await prisma.conversationMember.findMany({
            where: { conversationId },
          });
          for (const member of members) {
            if (member.userId !== userId) {
              io.to(`user:${member.userId}`).emit('messages_marked_read', {
                conversationId,
                readerId: userId,
              });
            }
          }
        } catch (err) {
          console.error('[Socket.IO] Error auto-marking read on join:', err);
        }
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (conversationId: string) => {
      if (!conversationId) return;
      socket.leave(`conv:${conversationId}`);
    });

    // Send Message Event
    socket.on('send_message', async (data: {
      conversationId: string;
      content: string;
      mediaUrl?: string;
      senderId?: string;
      tempId?: string;
    }) => {
      try {
        const senderId = user?.id || data.senderId;
        if (!senderId || !data.conversationId) return;

        // Check if recipient members are online
        const members = await prisma.conversationMember.findMany({
          where: { conversationId: data.conversationId },
        });

        const otherMembers = members.filter((m) => m.userId !== senderId);
        const isAnyRecipientOnline = otherMembers.some((m) => onlineUsers.has(m.userId) && onlineUsers.get(m.userId)!.size > 0);

        // Initial status: DELIVERED if recipient is online, otherwise SENT
        const initialStatus = isAnyRecipientOnline ? 'DELIVERED' : 'SENT';

        // Persist message to database
        const newMessage = await prisma.message.create({
          data: {
            conversationId: data.conversationId,
            senderId,
            content: data.content || '',
            mediaUrl: data.mediaUrl || null,
            mediaType: data.mediaUrl ? 'image' : null,
            status: initialStatus,
          },
        });

        // Update conversation lastMessageAt
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

        // 1. Echo back to SENDER with tempId so they can replace optimistic message
        if (data.tempId) {
          io.to(`user:${senderId}`).emit('receive_message', { ...formattedMessage, tempId: data.tempId });
        }

        // 2. Broadcast to OTHER members (not sender — they already got their echo above)
        for (const member of members) {
          if (member.userId !== senderId) {
            io.to(`user:${member.userId}`).emit('receive_message', formattedMessage);
            io.to(`user:${member.userId}`).emit('conversation_updated', {
              conversationId: data.conversationId,
              lastMessage: formattedMessage,
            });
          }
        }

        // 3. Also broadcast to conversation room (for any other listeners)
        socket.to(`conv:${data.conversationId}`).emit('receive_message', formattedMessage);

        console.log(`[Socket.IO] ✉️ Message delivered (${formattedMessage.status}) in conv:${data.conversationId}`);
      } catch (err) {
        console.error('[Socket.IO] Error handling send_message:', err);
      }
    });

    // Message Delivered Event (client received the message)
    socket.on('message_delivered', async (data: { messageId: string; conversationId: string; senderId: string }) => {
      try {
        await prisma.message.updateMany({
          where: {
            id: data.messageId,
            status: 'SENT',
          },
          data: { status: 'DELIVERED' },
        });

        io.to(`conv:${data.conversationId}`).emit('message_status_updated', {
          messageId: data.messageId,
          conversationId: data.conversationId,
          status: 'DELIVERED',
        });

        io.to(`user:${data.senderId}`).emit('message_status_updated', {
          messageId: data.messageId,
          conversationId: data.conversationId,
          status: 'DELIVERED',
        });
      } catch (err) {
        console.error('[Socket.IO] Error in message_delivered:', err);
      }
    });

    // Message Read Event (client opened/viewed the message)
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

        io.to(`conv:${data.conversationId}`).emit('messages_marked_read', {
          conversationId: data.conversationId,
          readerId: data.readerId,
        });

        const members = await prisma.conversationMember.findMany({
          where: { conversationId: data.conversationId },
        });
        for (const member of members) {
          io.to(`user:${member.userId}`).emit('messages_marked_read', {
            conversationId: data.conversationId,
            readerId: data.readerId,
          });
        }
      } catch (err) {
        console.error('[Socket.IO] Error in message_read:', err);
      }
    });

    // Typing Indicators
    socket.on('typing_start', async (data: { conversationId: string; userId: string; userName: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('user_typing_start', data);

      const members = await prisma.conversationMember.findMany({
        where: { conversationId: data.conversationId },
      });
      for (const member of members) {
        if (member.userId !== data.userId) {
          io.to(`user:${member.userId}`).emit('user_typing_start', data);
        }
      }
    });

    socket.on('typing_stop', async (data: { conversationId: string; userId: string }) => {
      socket.to(`conv:${data.conversationId}`).emit('user_typing_stop', data);

      const members = await prisma.conversationMember.findMany({
        where: { conversationId: data.conversationId },
      });
      for (const member of members) {
        if (member.userId !== data.userId) {
          io.to(`user:${member.userId}`).emit('user_typing_stop', data);
        }
      }
    });

    // Clear Chat Real-Time Event
    socket.on('clear_chat', async (data: { conversationId: string; userId: string }) => {
      try {
        io.to(`conv:${data.conversationId}`).emit('chat_cleared', {
          conversationId: data.conversationId,
          clearedBy: data.userId,
        });

        const members = await prisma.conversationMember.findMany({
          where: { conversationId: data.conversationId },
        });
        for (const member of members) {
          io.to(`user:${member.userId}`).emit('chat_cleared', {
            conversationId: data.conversationId,
            clearedBy: data.userId,
          });
        }
      } catch (err) {
        console.error('[Socket.IO] Error in clear_chat event:', err);
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
            console.log(`[Socket.IO] 🔴 User offline: ${userId}`);
          }
        }
      }
    });
  });

  return io;
};
