import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { GitHubService } from '../services/github.service';
import { decryptToken } from '../utils/encryption';

const router = Router();

const getGitHubService = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.githubToken) {
    throw new Error('GitHub account not connected');
  }
  return new GitHubService(decryptToken(user.githubToken));
};

router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const gh = await getGitHubService(req.user.id);
    const repos = await gh.listRepos();
    res.json(repos);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:owner/:repo/branches', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const owner = req.params.owner as string;
  const repo = req.params.repo as string;

  try {
    const gh = await getGitHubService(req.user.id);
    const branches = await gh.listBranches(owner, repo);
    res.json(branches);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:owner/:repo/tree', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const owner = req.params.owner as string;
  const repo = req.params.repo as string;
  const branch = (req.query.branch as string) || 'main';

  try {
    const gh = await getGitHubService(req.user.id);
    const tree = await gh.getRepoTree(owner, repo, branch);
    res.json(tree);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:owner/:repo/file', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const owner = req.params.owner as string;
  const repo = req.params.repo as string;
  const path = req.query.path as string;
  const branch = req.query.branch as string | undefined;

  if (!path) return res.status(400).json({ error: 'Path is required' });

  try {
    const gh = await getGitHubService(req.user.id);
    const result = await gh.getFileContent(owner, repo, path, branch);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/:owner/:repo/commit', authMiddleware, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  const owner = req.params.owner as string;
  const repo = req.params.repo as string;
  const { path, content, message, sha, branch } = req.body;

  if (!path || !content || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const gh = await getGitHubService(req.user.id);
    const result = await gh.commitFile(owner, repo, path, content, message, sha, branch);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
