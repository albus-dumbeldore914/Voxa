import { Response } from 'express';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';

export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.userId;

    const allUsers = await prisma.user.findMany({
      where: currentUserId ? { id: { not: currentUserId } } : {},
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
      orderBy: { name: 'asc' },
    });

    res.status(200).json({ users: allUsers });
  } catch (error) {
    console.error('Error in getUsers:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

export const searchUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query = ((req.query.q as string) || '').trim().toLowerCase();
    const currentUserId = req.userId;

    const allUsers = await prisma.user.findMany({
      where: currentUserId ? { id: { not: currentUserId } } : {},
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
      orderBy: { name: 'asc' },
    });

    if (!query) {
      res.status(200).json({ users: allUsers });
      return;
    }

    // Case-insensitive flexible matching across name, phone, and email
    const filtered = allUsers.filter(
      (u) =>
        (u.name && u.name.toLowerCase().includes(query)) ||
        (u.phone && u.phone.toLowerCase().includes(query)) ||
        (u.email && u.email.toLowerCase().includes(query)) ||
        (u.bio && u.bio.toLowerCase().includes(query))
    );

    res.status(200).json({ users: filtered });
  } catch (error) {
    console.error('Error in searchUsers:', error);
    res.status(500).json({ error: 'Failed to search users.' });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const currentUserId = req.userId;
    if (!currentUserId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, bio, avatar } = req.body;

    const updated = await prisma.user.update({
      where: { id: currentUserId },
      data: {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(avatar && { avatar }),
      },
    });

    res.status(200).json({ success: true, user: updated });
  } catch (error) {
    console.error('Error in updateProfile:', error);
    res.status(500).json({ error: 'Failed to update user profile.' });
  }
};
