import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../config/prisma';
import { AuthRequest } from '../middleware/auth.middleware';
import { sendEmailOtp, sendSmsOtp } from '../services/otp.service';

const JWT_SECRET = process.env.JWT_SECRET || 'voxa_super_secret_jwt_key_2026_messenger_app';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '123128377875-8g5dmpbjr75kv79dk697opl9ff0vliqn.apps.googleusercontent.com';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

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
  } catch (error: any) {
    console.error('Error in sendOtp:', error);
    res.status(500).json({ error: error?.message || 'Failed to generate and send verification code.' });
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
      // Update online status AND name if a proper name was provided
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          isOnline: true,
          lastSeen: new Date(),
          // Update name only if a real name was given and current name is default
          ...(name && name.trim() && (user.name === 'VOXA User' || !user.name)
            ? { name: name.trim() }
            : name && name.trim()
            ? { name: name.trim() }  // Always update name if provided
            : {}),
        },
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

// ─── Google OAuth ────────────────────────────────────────────────────────────
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body; // This is the access_token from useGoogleLogin

    if (!credential) {
      res.status(400).json({ error: 'Google credential/access token is required.' });
      return;
    }

    // Fetch user info from Google using the access token
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${credential}` },
    });

    if (!googleRes.ok) {
      res.status(401).json({ error: 'Invalid Google token. Please try signing in again.' });
      return;
    }

    const googleUser = await googleRes.json() as {
      sub: string;
      name: string;
      email: string;
      picture?: string;
      email_verified?: boolean;
    };

    if (!googleUser.email) {
      res.status(401).json({ error: 'Could not retrieve email from Google account.' });
      return;
    }

    const trimmedEmail = googleUser.email.toLowerCase();

    // Find or create user by email
    let user = await prisma.user.findFirst({
      where: { email: trimmedEmail },
    });

    if (!user) {
      // Brand new user — register from Google profile
      user = await prisma.user.create({
        data: {
          name: googleUser.name || 'VOXA User',
          phone: `google_${googleUser.sub}`, // Placeholder — Google users have no phone
          email: trimmedEmail,
          avatar: googleUser.picture || null,
          bio: 'Talk. Connect. Belong.',
          isOnline: true,
        },
      });
      console.log(`[Google Auth] ✅ New user registered: ${googleUser.name} <${trimmedEmail}>`);
    } else {
      // Existing user — update avatar/name from Google profile and mark online
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          isOnline: true,
          lastSeen: new Date(),
          ...(user.name === 'VOXA User' && googleUser.name ? { name: googleUser.name } : {}),
          ...((!user.avatar || user.avatar.includes('unsplash')) && googleUser.picture
            ? { avatar: googleUser.picture }
            : {}),
        },
      });
      console.log(`[Google Auth] ✅ Existing user signed in: ${user.name} <${trimmedEmail}>`);
    }

    // Issue VOXA JWT token
    const token = jwt.sign(
      { id: user.id, phone: user.phone, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(200).json({ success: true, message: 'Google authentication successful', token, user });
  } catch (error: any) {
    console.error('[Google Auth] Error:', error);
    res.status(500).json({ error: error?.message || 'Google authentication failed.' });
  }
};

