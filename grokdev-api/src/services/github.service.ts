import { Octokit } from '@octokit/rest';

export class GitHubService {
  private octokit: Octokit;

  constructor(token?: string) {
    this.octokit = new Octokit({ auth: token });
  }

  static async exchangeCodeForToken(code: string, redirectUri?: string): Promise<string> {
    const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
    const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

    if (!CLIENT_ID || !CLIENT_SECRET) {
      throw new Error('GitHub Client ID or Secret is not configured');
    }

    const body: any = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
    };
    if (redirectUri) {
        body.redirect_uri = redirectUri;
    }

    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data: any = await response.json();

    if (data.error) {
      throw new Error(data.error_description || data.error);
    }

    return data.access_token;
  }

  async listRepos() {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      per_page: 100,
      visibility: 'all',
      affiliation: 'owner,collaborator,organization_member',
    });

    if (data.length === 0) {
      console.log('GitHubService: listRepos returned 0 repositories');
    } else {
      console.log(`GitHubService: listRepos returned ${data.length} repositories`);
    }

    return data;
  }

  async listBranches(owner: string, repo: string) {
    const { data } = await this.octokit.repos.listBranches({
      owner,
      repo,
      per_page: 100,
    });
    return data;
  }


  // Get the actual default branch for a repository
  async getDefaultBranch(owner: string, repo: string): Promise<string> {
    const { data } = await this.octokit.repos.get({ owner, repo });
    return data.default_branch;
  }

  async getRepoTree(owner: string, repo: string, branch?: string) {
    // If no branch provided, discover the repo's actual default branch
    const targetBranch = branch || await this.getDefaultBranch(owner, repo);
    
    try {
      const { data } = await this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: targetBranch,
        recursive: 'true',
      });
      return data.tree;
    } catch (error: any) {
      // If we get a 404, the branch name might be wrong — auto-discover the real default
      if (error.status === 404 && branch) {
        console.log(`Branch "${targetBranch}" not found, discovering real default branch...`);
        const realDefault = await this.getDefaultBranch(owner, repo);
        console.log(`Real default branch: "${realDefault}", retrying...`);
        const { data } = await this.octokit.git.getTree({
          owner,
          repo,
          tree_sha: realDefault,
          recursive: 'true',
        });
        return data.tree;
      }
      throw error;
    }
  }

  async getFileContent(owner: string, repo: string, path: string, branch?: string) {
    const params: any = { owner, repo, path };
    if (branch) params.ref = branch;

    try {
      const { data }: any = await this.octokit.repos.getContent(params);

      if (Array.isArray(data)) {
        throw new Error('Path is a directory, not a file');
      }

      if (data.encoding === 'base64' && data.content) {
        return {
          content: Buffer.from(data.content, 'base64').toString('utf-8'),
          sha: data.sha,
        };
      }

      throw new Error('Unsupported encoding or no content');
    } catch (error: any) {
      // If branch caused a 404, retry with the repo's real default branch
      if (error.status === 404 && branch) {
        console.log(`File read failed on branch "${branch}", retrying with default branch...`);
        const realDefault = await this.getDefaultBranch(owner, repo);
        const retryParams: any = { owner, repo, path, ref: realDefault };
        const { data }: any = await this.octokit.repos.getContent(retryParams);

        if (Array.isArray(data)) {
          throw new Error('Path is a directory, not a file');
        }
        if (data.encoding === 'base64' && data.content) {
          return {
            content: Buffer.from(data.content, 'base64').toString('utf-8'),
            sha: data.sha,
          };
        }
        throw new Error('Unsupported encoding or no content');
      }
      throw error;
    }
  }

  async commitFile(owner: string, repo: string, path: string, content: string, message: string, sha?: string, branch?: string) {
    const params: any = {
      owner,
      repo,
      path,
      message,
      content: Buffer.from(content).toString('base64'),
    };
    if (sha) params.sha = sha;
    if (branch) params.branch = branch;

    const { data } = await this.octokit.repos.createOrUpdateFileContents(params);
    return data;
  }

  async deleteFile(owner: string, repo: string, path: string, message: string, sha: string) {
    const { data } = await this.octokit.repos.deleteFile({
      owner,
      repo,
      path,
      message,
      sha,
    });
    return data;
  }

  async searchCode(owner: string, repo: string, query: string) {
    // GitHub Code Search API requires the query and the repo context scope joined together
    const { data } = await this.octokit.search.code({
      q: `${query} repo:${owner}/${repo}`,
      per_page: 20, // Keep boundaries respectful
    });
    return data;
  }
}
