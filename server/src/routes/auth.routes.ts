import { Router } from 'express';
import { sendOtp, verifyOtp, getMe, googleAuth } from '../controllers/auth.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/google', googleAuth);
router.get('/me', authenticateJwt, getMe);

export default router;
