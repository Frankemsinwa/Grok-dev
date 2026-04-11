import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { GitHubService } from '../services/github.service';
import { encryptToken } from '../utils/encryption';

const router = Router();

router.post('/callback', authMiddleware, async (req: AuthRequest, res) => {
  const { code, redirectUri } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const accessToken = await GitHubService.exchangeCodeForToken(code, redirectUri);
    // Update user with GitHub token, encrypted securely using our symmetric cipher utility
    const encryptedToken = encryptToken(accessToken);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { githubToken: encryptedToken },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('GitHub callback error:', error);
    res.status(500).json({ error: error.message || 'Failed to exchange GitHub code' });
  }
});

export default router;
