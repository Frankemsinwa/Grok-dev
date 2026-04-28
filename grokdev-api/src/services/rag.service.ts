import { embed, embedMany } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { prisma } from '../lib/prisma';
import { GitHubService } from './github.service';

export class RAGService {
  private gh: GitHubService;
  private google: any;

  constructor(githubToken: string, geminiApiKey?: string) {
    this.gh = new GitHubService(githubToken);
    if (geminiApiKey) {
      this.google = createGoogleGenerativeAI({ apiKey: geminiApiKey });
    }
  }

  // Helper to chunk text, especially code
  private chunkText(text: string, maxChunkSize: number = 1000): string[] {
    const lines = text.split('\n');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const line of lines) {
      if ((currentChunk.length + line.length + 1) > maxChunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk);
        currentChunk = '';
      }
      currentChunk += (currentChunk.length > 0 ? '\n' : '') + line;
    }
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    return chunks;
  }

  // Index a single file
  async indexFile(repoId: string, owner: string, repo: string, path: string, content: string, sha: string) {
    if (!this.google) throw new Error("Gemini API key is required for RAG indexing.");

    // Check if we already have it cached and the SHA matches
    let fileCache = await prisma.fileCache.findFirst({
      where: { repoId, path }
    });

    if (fileCache && fileCache.sha === sha) {
      return { status: 'skipped', reason: 'already_indexed' };
    }

    // Update or create file cache
    if (fileCache) {
      fileCache = await prisma.fileCache.update({
        where: { id: fileCache.id },
        data: { content, sha }
      });
      // Delete old chunks
      await prisma.$executeRaw`DELETE FROM "FileChunk" WHERE "fileId" = ${fileCache.id}`;
    } else {
      fileCache = await prisma.fileCache.create({
        data: { repoId, path, content, sha }
      });
    }

    const chunks = this.chunkText(content);
    if (chunks.length === 0) return { status: 'skipped', reason: 'empty_file' };

    try {
      // Generate embeddings
      const { embeddings } = await embedMany({
        model: this.google.textEmbeddingModel('text-embedding-004'),
        values: chunks,
      });

      // We cannot bulk insert Unsupported types using standard prisma createMany easily,
      // so we use raw queries for pgvector.
      for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        const embedding = embeddings[i];
        const vectorString = `[${embedding.join(',')}]`;
        
        await prisma.$executeRaw`
          INSERT INTO "FileChunk" ("id", "fileId", "content", "embedding", "createdAt")
          VALUES (gen_random_uuid(), ${fileCache.id}, ${chunkContent}, ${vectorString}::vector, NOW())
        `;
      }
      return { status: 'indexed', chunks: chunks.length };
    } catch (e: any) {
      console.error(`[RAG] Failed to index ${path}:`, e.message);
      return { status: 'error', reason: e.message };
    }
  }

  // Perform similarity search
  async searchSimilarCode(repoId: string, query: string, limit: number = 5) {
    if (!this.google) throw new Error("Gemini API key is required for RAG search.");

    try {
      const { embedding } = await embed({
         model: this.google.textEmbeddingModel('text-embedding-004'),
         value: query,
      });

      const vectorString = `[${embedding.join(',')}]`;

      // Use pgvector's cosine distance operator (<=>)
      const results: any[] = await prisma.$queryRaw`
        SELECT
          fc."content" as "chunkContent",
          f."path",
          1 - (fc."embedding" <=> ${vectorString}::vector) as similarity
        FROM "FileChunk" fc
        JOIN "FileCache" f ON f."id" = fc."fileId"
        WHERE f."repoId" = ${repoId}
        ORDER BY fc."embedding" <=> ${vectorString}::vector
        LIMIT ${limit};
      `;

      return results.map(r => ({
        path: r.path,
        content: r.chunkContent,
        similarity: r.similarity
      }));
    } catch (e: any) {
      console.error(`[RAG] Search failed:`, e.message);
      throw e;
    }
  }
}
