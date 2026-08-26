import { Router } from 'express';
import { getUsers, searchUsers, updateProfile } from '../controllers/user.controller';
import { authenticateJwt } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt);

router.get('/', getUsers);
router.get('/search', searchUsers);
router.patch('/profile', updateProfile);

export default router;
