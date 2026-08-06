import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { Octokit } from '@octokit/rest';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { GitHubService } from '../services/github.service';
import { encryptToken } from '../utils/encryption';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'grokdev_secret_key';

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email and password are required' });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { username }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
      return res.status(400).json({ error: 'Username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
    });

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username,
        isGithubConnected: false
      } 
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username,
        isGithubConnected: !!user.githubToken
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, username: true, createdAt: true, githubToken: true },
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id,
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
      isGithubConnected: !!user.githubToken
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/github', async (req, res) => {
  const { code, redirectUri } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Code is required' });
  }

  try {
    // 1. Exchange the GitHub authorization code for an access token
    const accessToken = await GitHubService.exchangeCodeForToken(code, redirectUri);

    // 2. Fetch the authenticated GitHub user's profile
    const octokit = new Octokit({ auth: accessToken });
    const { data: profile } = await octokit.users.getAuthenticated();
    const email = profile.email || `${profile.login}@users.noreply.github.com`;

    // 3. Encrypt the GitHub token before storing
    const encryptedToken = encryptToken(accessToken);

    // 4. Find an existing user by email, or create one
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // GitHub-only accounts have no usable password; generate a random hash
      const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
      const baseUsername = profile.login;
      let username = baseUsername;
      let attempt = 0;

      while (true) {
        try {
          user = await prisma.user.create({
            data: { username, email, passwordHash, githubToken: encryptedToken },
          });
          break;
        } catch (err: any) {
          // P2002 = unique constraint violation (username taken)
          if (err?.code === 'P2002' && attempt < 10) {
            attempt += 1;
            username = `${baseUsername}_${attempt}`;
          } else {
            throw err;
          }
        }
      }
    } else {
      // Existing account: refresh its GitHub token
      user = await prisma.user.update({
        where: { id: user.id },
        data: { githubToken: encryptedToken },
      });
    }

    // 5. Issue a JWT session token
    const token = jwt.sign(
      { id: user.id, email: user.email, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isGithubConnected: true,
      },
    });
  } catch (error: any) {
    console.error('GitHub sign-in error:', error);
    res.status(500).json({ error: error.message || 'Failed to sign in with GitHub' });
  }
});

export default router;
