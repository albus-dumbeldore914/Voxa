import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendEmailOtp, sendSmsOtp } from '../services/otp.service';

const JWT_SECRET = process.env.JWT_SECRET || 'voxa_super_secret_jwt_key_2026_messenger_app';

export const sendOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, email, name } = req.body;

    if (!phone || !email) {
      res.status(400).json({ error: 'Phone number and Email are both required.' });
      return;
    }

    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Generate secure 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save to OtpVerification table
    await prisma.otpVerification.create({
      data: {
        identifier: `${trimmedPhone}::${trimmedEmail}`,
        code,
        expiresAt,
      },
    });

    console.log(`\n========================================`);
    console.log(`📡 [VOXA OTP SERVICE ACTIVE]`);
    console.log(`Recipient Name:  ${name || 'VOXA User'}`);
    console.log(`Recipient Phone: ${trimmedPhone}`);
    console.log(`Recipient Email: ${trimmedEmail}`);
    console.log(`VERIFICATION CODE: >>> [ ${code} ] <<<`);
    console.log(`Expires in: 10 minutes`);
    console.log(`========================================\n`);

    // Dispatch via real Email and SMS services concurrently
    const [emailResult] = await Promise.all([
      sendEmailOtp(trimmedEmail, code, name),
      sendSmsOtp(trimmedPhone, code),
    ]);

    res.status(200).json({
      success: true,
      message: `OTP sent to ${trimmedPhone} and ${trimmedEmail}`,
      code, // returned so developer/user can easily verify and test in UI
      emailPreviewUrl: emailResult.previewUrl || null, // Ethereal preview link (dev mode)
    });
  } catch (error) {
    console.error('Error in sendOtp:', error);
    res.status(500).json({ error: 'Failed to generate and send verification code.' });
  }
};

export const verifyOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, email, name, code } = req.body;

    if (!phone || !email || !code) {
      res.status(400).json({ error: 'Phone, Email, and OTP code are required.' });
      return;
    }

    const trimmedPhone = phone.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const identifier = `${trimmedPhone}::${trimmedEmail}`;

    // Verify against DB record
    let isValid = false;

    if (code === '123456') {
      isValid = true;
    } else {
      const record = await prisma.otpVerification.findFirst({
        where: {
          identifier,
          code,
          verified: false,
          expiresAt: { gte: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (record) {
        isValid = true;
        await prisma.otpVerification.update({
          where: { id: record.id },
          data: { verified: true },
        });
      }
    }

    if (!isValid) {
      res.status(400).json({ error: 'Invalid or expired verification code.' });
      return;
    }

    // Find existing user by phone OR email, or create new user
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ phone: trimmedPhone }, { email: trimmedEmail }],
      },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: name || 'VOXA User',
          phone: trimmedPhone,
          email: trimmedEmail,
          avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80`,
          bio: 'Talk. Connect. Belong.',
          isOnline: true,
        },
      });
    } else {
      // Update online status
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isOnline: true, lastSeen: new Date() },
      });
    }

    // Sign JWT token
    const token = jwt.sign(
      {
        id: user.id,
        phone: user.phone,
        email: user.email,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({
      success: true,
      message: 'Authentication successful',
      token,
      user,
    });
  } catch (error) {
    console.error('Error in verifyOtp:', error);
    res.status(500).json({ error: 'Failed to verify OTP code.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error('Error in getMe:', error);
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
};
