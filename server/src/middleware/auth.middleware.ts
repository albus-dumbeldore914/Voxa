import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'voxa_super_secret_jwt_key_2026_messenger_app';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    phone: string;
    email: string;
    name: string;
  };
}

export const authenticateJwt = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized. Token missing or invalid.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string;
      phone: string;
      email: string;
      name: string;
    };

    req.userId = decoded.id;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Unauthorized. Token expired or invalid.' });
    return;
  }
};
