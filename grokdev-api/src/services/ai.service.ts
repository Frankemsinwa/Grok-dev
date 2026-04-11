import { GitHubService } from './github.service';
import { prisma } from '../lib/prisma';

export class AIService {
  private gh: GitHubService;

  constructor(githubToken: string) {
    this.gh = new GitHubService(githubToken);
  }

  async read_file(owner: string, repo: string, path: string, branch?: string) {
    console.log(`[AI-TOOL] read_file | owner="${owner}" repo="${repo}" path="${path}" branch="${branch}"`);
    try {
      const result = await this.gh.getFileContent(owner, repo, path, branch);
      console.log(`[AI-TOOL] read_file SUCCESS | ${path} (${result.content.length} chars)`);
      return { content: result.content, path };
    } catch (error: any) {
      console.error(`[AI-TOOL] read_file FAILED | ${error.status || 'unknown'}: ${error.message}`);
      return { 
        error: `File not found at "${path}".`,
        suggestion: `Use 'list_directory' to see available files or 'search_files' to locate the file if you are unsure of the path.`
      };
    }
  }

  async list_directory(owner: string, repo: string, path: string = '', branch?: string) {
    console.log(`[AI-TOOL] list_directory | owner="${owner}" repo="${repo}" path="${path}" branch="${branch}" (type: ${typeof branch})`);
    try {
      const tree = await this.gh.getRepoTree(owner, repo, branch);
      console.log(`[AI-TOOL] list_directory SUCCESS | ${tree.length} items found`);
      
      // If path is provided, filter for that directory
      if (path && path !== '.') {
        const filtered = tree.filter((item: any) => item.path.startsWith(path));
        console.log(`[AI-TOOL] list_directory filtered to ${filtered.length} items for path "${path}"`);
        return { tree: filtered };
      }
      
      // Return top-level items only for root listing
      const topLevel = tree.filter((item: any) => !item.path.includes('/'));
      console.log(`[AI-TOOL] list_directory returning ${topLevel.length} top-level items`);
      return { tree: topLevel };
    } catch (error: any) {
      console.error(`[AI-TOOL] list_directory FAILED | status=${error.status} message="${error.message}"`);
      console.error(`[AI-TOOL] list_directory FULL ERROR:`, JSON.stringify({
        status: error.status,
        message: error.message,
        url: error.request?.url,
        owner, repo, branch, path
      }, null, 2));
      return { error: `Failed to list directory: ${error.message}`, details: { owner, repo, branch, path } };
    }
  }

  async search_files(owner: string, repo: string, query: string, branch?: string) {
    console.log(`[AI-TOOL] search_files | owner="${owner}" repo="${repo}" query="${query}" branch="${branch}"`);
    try {
      const tree = await this.gh.getRepoTree(owner, repo, branch);
      const matches = tree.filter((item: any) => 
        item.path.toLowerCase().includes(query.toLowerCase())
      ).map((item: any) => ({
        path: item.path,
        type: item.type === 'blob' ? 'file' : 'directory'
      }));
      
      console.log(`[AI-TOOL] search_files SUCCESS | ${matches.length} matches`);
      return { 
        matches: matches.slice(0, 20),
        totalCount: matches.length,
        note: matches.length > 20 ? 'Only showing first 20 matches.' : undefined
      };
    } catch (error: any) {
      console.error(`[AI-TOOL] search_files FAILED | ${error.message}`);
      return { error: `Failed to search files: ${error.message}` };
    }
  }

  async search_code(owner: string, repo: string, query: string, branch?: string) {
    console.log(`[AI-TOOL] search_code | owner="${owner}" repo="${repo}" query="${query}" branch="${branch}"`);
    try {
      // Direct call into the GitHub Code Search REST API
      const result = await this.gh.searchCode(owner, repo, query);
      const matches = result.items.map((item: any) => ({
        path: item.path,
        url: item.html_url,
        score: item.score,
        repository: item.repository?.full_name
      }));

      console.log(`[AI-TOOL] search_code SUCCESS | ${matches.length} matches found`);
      return { 
        info: `Searched deep code content for "${query}"`,
        totalCount: result.total_count,
        matches: matches,
        note: result.incomplete_results ? "These results may be incomplete due to GitHub constraints." : undefined
      };
    } catch (error: any) {
      console.error(`[AI-TOOL] search_code FAILED | ${error.message}`);
      return { error: `Failed to search code contents: ${error.message}` };
    }
  }

  async write_file(owner: string, repo: string, path: string, content: string, message: string = 'Update file via GrokDev', branch?: string) {
    console.log(`[AI-TOOL] write_file | owner="${owner}" repo="${repo}" path="${path}" branch="${branch}"`);
    try {
      const tree = await this.gh.getRepoTree(owner, repo, branch);
      const file = tree.find((item: any) => item.path === path);
      
      if (!file) {
        return { error: 'File not found. Use create_file instead.' };
      }

      const result = await this.gh.commitFile(owner, repo, path, content, message, file.sha, branch);
      return { success: true, sha: result.content?.sha };
    } catch (error: any) {
      console.error(`[AI-TOOL] write_file FAILED | ${error.message}`);
      return { error: `Failed to write file: ${error.message}` };
    }
  }

  async create_file(owner: string, repo: string, path: string, content: string, message: string = 'Create file via GrokDev', branch?: string) {
    console.log(`[AI-TOOL] create_file | owner="${owner}" repo="${repo}" path="${path}" branch="${branch}"`);
    try {
      const result = await this.gh.commitFile(owner, repo, path, content, message, undefined, branch);
      return { success: true, sha: result.content?.sha };
    } catch (error: any) {
      console.error(`[AI-TOOL] create_file FAILED | ${error.message}`);
      return { error: `Failed to create file: ${error.message}` };
    }
  }

  async delete_file(owner: string, repo: string, path: string, message: string = 'Delete file via GrokDev', branch?: string) {
    console.log(`[AI-TOOL] delete_file | owner="${owner}" repo="${repo}" path="${path}" branch="${branch}"`);
    try {
      const tree = await this.gh.getRepoTree(owner, repo, branch);
      const file = tree.find((item: any) => item.path === path);
      
      if (!file) {
        return { error: 'File not found.' };
      }

      if (!file.sha) {
        return { error: 'File SHA not available.' };
      }

      const result = await this.gh.deleteFile(owner, repo, path, message, file.sha);
      return { success: true };
    } catch (error: any) {
      console.error(`[AI-TOOL] delete_file FAILED | ${error.message}`);
      return { error: `Failed to delete file: ${error.message}` };
    }
  }

  async get_file_diff(owner: string, repo: string, path: string, newContent: string, branch?: string) {
    console.log(`[AI-TOOL] get_file_diff | owner="${owner}" repo="${repo}" path="${path}" branch="${branch}"`);
    try {
      const result = await this.gh.getFileContent(owner, repo, path, branch);
      return { path, oldContent: result.content, newContent, sha: result.sha };
    } catch (error) {
      return { path, oldContent: '', newContent, sha: undefined };
    }
  }
}
