import { Router, Response as ExpressResponse } from 'express';
import { generateText, tool, ModelMessage } from 'ai';
import { xai } from '@ai-sdk/xai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { chatRateLimit } from '../middleware/rateLimit';
import { prisma } from '../lib/prisma';
import { AIService } from '../services/ai.service';
import { decryptToken } from '../utils/encryption';
import { RAGService } from '../services/rag.service';

const router = Router();

const TECH_MOTIVATIONS = [
  "Reticulating splines...",
  "Optimizing neural pathways...",
  "Searching for the perfect semicolon...",
  "Converting coffee to code...",
  "Defragmenting intent buffers...",
  "Bypassing the mainframe logic...",
  "Recalibrated agent priorities...",
  "Consulting the cloud architects...",
  "Generating 1.21 gigawatts of logic...",
  "Syncing with the digital ghost...",
];

function getRandomMotivation() {
  return TECH_MOTIVATIONS[Math.floor(Math.random() * TECH_MOTIVATIONS.length)];
}

// Resolve the correct AI model based on provider
function resolveModel(provider: string, model: string, geminiApiKey?: string) {
  if (provider === 'gemini') {
    if (!geminiApiKey) {
      throw new Error('Gemini API key is required when using Google Gemini');
    }
    // Use client-provided API key (stored locally on their device, not in our DB)
    const google = createGoogleGenerativeAI({ apiKey: geminiApiKey });
    return google(model);
  }
  // Default: Grok via xAI
  return xai(model);
}

router.post('/stream', authMiddleware, chatRateLimit, async (req: AuthRequest, res: ExpressResponse) => {
  const {
    messages,
    conversationId,
    repoId,
    repoOwner,
    repoName,
    branch,
    model = 'grok-beta',
    provider = 'grok',
    geminiApiKey,
  } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.githubToken) {
      return res.status(400).json({ error: 'GitHub account not connected' });
    }

    const aiService = new AIService(decryptToken(user.githubToken));
    const ragService = new RAGService(decryptToken(user.githubToken), geminiApiKey);
    let currentConversationId = conversationId;

    // Determine owner/repo context and resolve valid repoId for database relation
    let owner = repoOwner || 'owner';
    let repo = repoName || 'repo';
    let validatedRepoId: string | null = null;

    if (repoId) {
      const repoStr = String(repoId);
      // Try to find the repo by UUID or name
      const repoData = await prisma.repository.findFirst({
        where: {
          OR: [
            { id: repoStr.includes('-') ? repoStr : undefined }, // UUID check
            { name: repoStr } // Fallback to name check
          ]
        }
      });

      if (repoData) {
        owner = repoData.owner;
        repo = repoData.name;
        validatedRepoId = repoData.id;
      }
    }

    let activeBranch: string | null = null;

    if (!currentConversationId) {
      // Find the first user message to use as the title
      const firstUserMsg = messages.find(m => m.role === 'user')?.content || 'New Session';
      const cleanTitle = firstUserMsg.substring(0, 60).split('\n')[0].trim();

      const newConversation = await prisma.conversation.create({
        data: {
          userId: req.user.id,
          title: cleanTitle || 'Neural Session',
          model: `${provider}/${model}`,
          repoId: validatedRepoId,
        },
      });
      currentConversationId = newConversation.id;
    } else {
      const existingConv = await prisma.conversation.findUnique({
        where: { id: currentConversationId }
      });
      if (existingConv) {
        activeBranch = existingConv.activeBranch;
      }
    }

    // Save user message in the matrix
    const userMessage = messages[messages.length - 1];
    await prisma.message.create({
      data: {
        conversationId: currentConversationId,
        role: userMessage.role,
        content: userMessage.content,
      },
    });

    // Determine owner/repo context if repoId lookup failed and payload didn't provide one
    if (!owner || owner === 'owner') {
      const repoStore = await prisma.repository.findFirst({
        where: { userId: req.user.id }
      });
      if (repoStore) {
        owner = repoStore.owner;
        repo = repoStore.name;
      }
    }

    // Resolve the model based on provider
    const aiModel = resolveModel(provider, model, geminiApiKey);

    const providerLabel = provider === 'gemini' ? 'Gemini' : 'GrokDev';

    console.log(`[CHAT-STREAM] ===== STARTING AI STREAM =====`);
    console.log(`[CHAT-STREAM] owner="${owner}" repo="${repo}" branch="${branch}" provider="${provider}" model="${model}"`);
    console.log(`[CHAT-STREAM] repoOwner="${repoOwner}" repoName="${repoName}" repoId="${repoId}"`);
    console.log(`[CHAT-STREAM] ================================`);

    // Filter and transform to strict CoreMessage[] schema
    const validMessages = messages.filter((m: any) => {
      if (m.role === 'user') return !!m.content;
      if (m.role === 'assistant') return !!m.content || (m.toolCalls && m.toolCalls.length > 0);
      if (m.role === 'tool') return !!m.content || !!m.toolResults;
      return false;
    }).map((m: any) => {
      // 1. USER: content must be a string for simpler models
      if (m.role === 'user' || m.role === 'system') {
        let textContent = "";
        if (typeof m.content === 'string') textContent = m.content;
        else if (Array.isArray(m.content)) textContent = m.content.map((p: any) => p.text || JSON.stringify(p)).join("");
        else textContent = String(m.content || "");

        return { role: m.role, content: textContent };
      }

      // 2. ASSISTANT: format correctly for SDK 3
      if (m.role === 'assistant') {
        const parts: any[] = [];

        let assistantContent = "";
        if (typeof m.content === 'string') {
          assistantContent = m.content;
        } else if (Array.isArray(m.content)) {
          assistantContent = m.content.map((c: any) => c.text || "").join("");
        } else if (m.content) {
          assistantContent = String(m.content);
        }

        if (assistantContent) {
          parts.push({ type: 'text', text: assistantContent });
        }

        if (m.toolCalls && Array.isArray(m.toolCalls)) {
          m.toolCalls.forEach((tc: any) => {
            parts.push({
              type: 'tool-call',
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              input: typeof tc.args === 'string' ? JSON.parse(tc.args) : (tc.args || tc.input || {}),
              providerOptions: tc.providerOptions || tc.providerMetadata, // AI SDK V3 modern structure
              providerMetadata: tc.providerMetadata || tc.providerOptions // Legacy AI SDK structure
            });
          });
        }

        return {
          role: 'assistant',
          content: parts.length > 0 ? parts : "", // Empty string fallback
          providerOptions: m.providerOptions || m.providerMetadata,
          providerMetadata: m.providerMetadata || m.providerOptions
        };
      }

      // 3. TOOL: format correctly for SDK 3
      if (m.role === 'tool') {
        try {
          const toolData = typeof m.content === 'string' ? JSON.parse(m.content) : m.content;
          
          let toolCallId = m.toolCallId || 'unknown';
          let toolName = m.toolName || 'unknown_tool';
          
          if (Array.isArray(toolData)) {
            const parts = toolData.map(td => {
               const trId = td.toolCallId || toolCallId;
               const trName = td.toolName || toolName;
               const resultData = td.result !== undefined ? td.result : (td.output || td);
               return {
                 type: 'tool-result',
                 toolCallId: trId,
                 toolName: trName,
                 output: {
                   type: typeof resultData === 'string' ? 'text' : 'json',
                   value: resultData
                 }
               };
            });
            return { role: 'tool', content: parts };
          } else {
             const resultData = toolData?.result !== undefined ? toolData.result : (toolData?.output || toolData);
             toolCallId = toolData?.toolCallId || toolCallId;
             toolName = toolData?.toolName || toolName;
             return {
               role: 'tool',
               content: [{
                 type: 'tool-result',
                 toolCallId,
                 toolName,
                 output: {
                   type: typeof resultData === 'string' ? 'text' : 'json',
                   value: resultData
                 }
               }]
             };
          }
        } catch (e) {
          return {
              role: 'tool',
              content: [{
                 type: 'tool-result',
                 toolCallId: 'unknown',
                 toolName: 'unknown',
                 output: { type: 'text', value: String(m.content) }
              }]
          };
        }
      }

    });

    // final safety: Ensure strict turn order (user -> assistant -> tool -> assistant)
    // and remove any tool result that doesn't have a preceding assistant tool-call
    const turnFixedMessages: any[] = [];
    validMessages.forEach((m: any, i: number) => {
      if (!m) return;
      if (m.role === 'tool') {
        const lastMsg = turnFixedMessages[turnFixedMessages.length - 1];
        
        // If the last message was also a tool message, just append the content
        if (lastMsg && lastMsg.role === 'tool') {
          lastMsg.content = [...(Array.isArray(lastMsg.content) ? lastMsg.content : [lastMsg.content]), ...(Array.isArray(m.content) ? m.content : [m.content])];
          return;
        }

        // Check if the preceding message is an assistant with tool-calls
        let valid = false;
        if (lastMsg && lastMsg.role === 'assistant') {
          if (lastMsg.content && Array.isArray(lastMsg.content) && lastMsg.content.some((p: any) => p.type === 'tool-call')) {
            valid = true;
          } else if (lastMsg.toolCalls && lastMsg.toolCalls.length > 0) {
            valid = true;
          }
        }

        if (!valid) {
          console.warn(`[ENGINE] Dropping rogue tool result at turn ${i} (no preceding tool-call)`);
          return;
        }
      }
      // Avoid consecutive user messages (merge them)
      if (m.role === 'user' && turnFixedMessages.length > 0 && turnFixedMessages[turnFixedMessages.length - 1]?.role === 'user') {
        turnFixedMessages[turnFixedMessages.length - 1].content += "\n" + m.content;
        return;
      }
      turnFixedMessages.push(m);
    });

    console.log(`[ENGINE] Handshaking with ${turnFixedMessages.length} messages (Turn-Fixed)...`);
    // Print the exact object structure of the failing message if it's turn 3 or 4
    if (turnFixedMessages.length >= 4) {
      const t3 = turnFixedMessages[3];
      console.log(`[ENGINE] Turn 3 structure: Role=${t3.role} | ContentType=${typeof t3.content} | ToolCalls=${t3.toolCalls?.length || 0}`);
      console.dir(t3, { depth: 3 });
    }
    turnFixedMessages.forEach((m: any, i: number) => {
      console.log(`  [Turn ${i}] Role: ${m.role} | Content: ${typeof m.content === 'string' ? m.content.substring(0, 30) : 'ARRAY'} | Tools: ${(m as any).toolCalls?.length || 0}`);
    });

    const agentTools = {
      read_file: tool({
        description: 'Read the content of a file in the repository',
        inputSchema: z.object({
          path: z.string().describe('The path of the file to read'),
        }),
        execute: async ({ path }: { path: string }) => aiService.read_file(owner, repo, path, activeBranch || branch),
      }),
      list_directory: tool({
        description: 'List files and directories in the repository',
        inputSchema: z.object({
          path: z.string().optional().describe('The directory path to list'),
        }),
        execute: async ({ path }: { path?: string }) => aiService.list_directory(owner, repo, path || '', activeBranch || branch),
      }),
      search_files: tool({
        description: 'Search for files by name in the repository',
        inputSchema: z.object({
          query: z.string().describe('The filename or path fragment to search for'),
        }),
        execute: async ({ query }: { query: string }) => aiService.search_files(owner, repo, query, activeBranch || branch),
      }),
      search_code: tool({
        description: 'Search for a string in the repository code (search by path)',
        inputSchema: z.object({
          query: z.string().describe('The search query'),
        }),
        execute: async ({ query }: { query: string }) => aiService.search_code(owner, repo, query, activeBranch || branch),
      }),
      semantic_search_code: tool({
        description: 'Search the repository using semantic vector similarity (RAG). Use this to find concepts, patterns, or architecture logic across files.',
        inputSchema: z.object({
          query: z.string().describe('The natural language query to search for'),
          limit: z.number().optional().describe('Maximum number of chunks to return (default 5)')
        }),
        execute: async ({ query, limit }: { query: string, limit?: number }) => {
          if (!validatedRepoId) return { error: 'Repository ID not resolved, cannot perform RAG search.' };
          try {
            const results = await ragService.searchSimilarCode(validatedRepoId, query, limit);
            return { matches: results };
          } catch (e: any) {
            return { error: `Semantic search failed: ${e.message}` };
          }
        }
      }),
      index_file_for_rag: tool({
        description: 'Index a file into the RAG vector database so it can be semantically searched later.',
        inputSchema: z.object({
          path: z.string().describe('The path of the file to index')
        }),
        execute: async ({ path }: { path: string }) => {
           if (!validatedRepoId) return { error: 'Repository ID not resolved, cannot index.' };
           try {
             const fileResult = await aiService.read_file(owner, repo, path, activeBranch || branch);
             if (fileResult.error) return fileResult;
             const sha = (fileResult as any).sha || new Date().toISOString();
             const res = await ragService.indexFile(validatedRepoId, owner, repo, path, fileResult.content as string, sha);
             return { result: `File indexed successfully. Status: ${res.status}` };
           } catch (e: any) {
             return { error: `Failed to index file: ${e.message}` };
           }
        }
      }),
      write_file: tool({
        description: 'Write or update a file in the repository',
        inputSchema: z.object({
          path: z.string().describe('The path of the file to update'),
          content: z.string().describe('The new content of the file'),
          message: z.string().optional().describe('The commit message'),
        }),
        execute: async ({ path, content, message }: { path: string, content: string, message?: string }) =>
          aiService.write_file(owner, repo, path, content, message, activeBranch || branch),
      }),
      create_file: tool({
        description: 'Create a new file in the repository',
        inputSchema: z.object({
          path: z.string().describe('The path of the new file'),
          content: z.string().describe('The content of the new file'),
          message: z.string().optional().describe('The commit message'),
        }),
        execute: async ({ path, content, message }: { path: string, content: string, message?: string }) =>
          aiService.create_file(owner, repo, path, content, message, activeBranch || branch),
      }),
      delete_file: tool({
        description: 'Delete a file from the repository',
        inputSchema: z.object({
          path: z.string().describe('The path of the file to delete'),
          message: z.string().optional().describe('The commit message'),
        }),
        execute: async ({ path, message }: { path: string, message?: string }) =>
          aiService.delete_file(owner, repo, path, message, activeBranch || branch),
      }),
      get_file_diff: tool({
        description: 'Get a diff between the current file and proposed changes',
        inputSchema: z.object({
          path: z.string().describe('The path of the file'),
          newContent: z.string().describe('The proposed new content'),
        }),
        execute: async ({ path, newContent }: { path: string, newContent: string }) =>
          aiService.get_file_diff(owner, repo, path, newContent, activeBranch || branch),
      }),
      create_todos: tool({
        description: 'Create a list of todo items for the current task. Use this at the start of a complex task to outline the steps.',
        inputSchema: z.object({
          steps: z.array(z.string()).describe('The list of steps to complete the task'),
        }),
        execute: async ({ steps }: { steps: string[] }) => {
          if (!currentConversationId) return { error: 'Conversation ID not available.' };
          return aiService.create_todos(currentConversationId, steps);
        },
      }),
      update_todo: tool({
        description: 'Update the status of a todo item as you progress through the task.',
        inputSchema: z.object({
          todoId: z.string().describe('The ID of the todo item to update'),
          status: z.enum(['pending', 'in-progress', 'completed']).describe('The new status of the todo item'),
        }),
        execute: async ({ todoId, status }: { todoId: string, status: 'pending' | 'in-progress' | 'completed' }) =>
          aiService.update_todo_status(todoId, status),
      }),
      create_branch: tool({
        description: 'Create a new feature branch for the current task.',
        inputSchema: z.object({
          newBranch: z.string().describe('The name of the new branch to create'),
        }),
        execute: async ({ newBranch }: { newBranch: string }) => {
          const result = await aiService.create_branch(owner, repo, activeBranch || branch, newBranch);
          if (result.success) {
            activeBranch = newBranch;
            // Save the active branch to the conversation in the database
            await prisma.conversation.update({
              where: { id: currentConversationId },
              data: { activeBranch: newBranch }
            });
          }
          return result;
        },
      }),
    };

    let currentMessages: any[] = [...turnFixedMessages];
    let allToolCalls: any[] = [];
    let allToolResults: any[] = [];
    let finalProcessedText = '';
    let stepCount = 0;
    const maxSteps = 20;

    // MANUAL AGENT LOOP: Since the local AI SDK version lacks native 'maxSteps'
    while (stepCount < maxSteps) {
      console.log(`[AGENT-LOOP] Turn ${stepCount + 1}/${maxSteps}...`);

      const result = await generateText({
        model: aiModel as any,
        system: `You are ${providerLabel}, an elite autonomous IDE agent based on the Gemini architecture.
Your objective: Resolve the user's request completely by navigating and modifying the repository ${owner}/${repo} (${branch}).

STRICT OPERATIONAL RULES:
1. FEATURE BRANCHING: Before making any changes to the repository, you MUST create a new feature branch using 'create_branch' if you are not already in one (check the current context). Name the branch descriptively (e.g., 'feature/task-name' or 'fix/bug-name').
2. TASK BREAKDOWN: After creating the branch, use 'create_todos' to outline the plan. This helps the user track your progress. Only call 'create_todos' ONCE at the start of a task.
3. PROGRESS TRACKING: Update todo statuses using 'update_todo' as you complete each step. NEVER create new todos for steps you've already defined; just update their status.
4. MULTI-STEP TURNS: If you need to read a directory, find a file, read it, and then modify it—do it ALL in sequence within this turn.
5. THINKING & PLANNING: Before taking complex actions, briefly outline your plan.
6. TOOL-FIRST: Never assume code exists. Use 'list_directory' and 'read_file' to verify the state of the repo before proposing or making changes.
7. ERROR RECOVERY: If a tool fails (e.g., file not found), use 'search_code' or 'list_directory' to find the correct path. Do not give up.
8. FINISH THE JOB: Your turn is not over until the objective is fully met.
9. PRECISION: When writing files, preserve existing formatting and logic unless specifically asked to change it.`,
        messages: currentMessages as ModelMessage[],
        tools: agentTools,
      });

      finalProcessedText = result.text;
      const stepToolCalls = (result as any).toolCalls || [];

      if (stepToolCalls.length > 0) {
        allToolCalls.push(...stepToolCalls);
        const stepResults: any[] = [];
        const stepToolParts: any[] = [];

        // Execute tools manually for each call in this step
        for (const call of stepToolCalls) {
          const t = (agentTools as any)[call.toolName];
          if (t && t.execute) {
            console.log(`[AGENT-TOOL] Executing ${call.toolName}...`);
            try {
              const output = await t.execute(call.input);
              stepResults.push({
                toolCallId: call.toolCallId,
                toolName: call.toolName,
                output // Map to 'output' as per local types
              });
              stepToolParts.push({
                 type: 'tool-result',
                 toolCallId: call.toolCallId,
                 toolName: call.toolName,
                 output: {
                   type: typeof output === 'string' ? 'text' : 'json',
                   value: output
                 }
              });
            } catch (err: any) {
              stepResults.push({
                toolCallId: call.toolCallId,
                toolName: call.toolName,
                error: err.message || 'Tool execution failed'
              });
              stepToolParts.push({
                 type: 'tool-result',
                 toolCallId: call.toolCallId,
                 toolName: call.toolName,
                 output: {
                   type: 'error-text',
                   value: err.message || 'Tool execution failed'
                 }
              });
            }
          }
        }

        allToolResults.push(...stepResults);

        // Map the assistant step correctly
        const asstParts: any[] = [];
        if (result.text) asstParts.push({ type: 'text', text: result.text });
        stepToolCalls.forEach((tc: any) => {
           asstParts.push({
             type: 'tool-call',
             toolCallId: tc.toolCallId,
             toolName: tc.toolName,
             input: typeof tc.args === 'string' ? JSON.parse(tc.args) : (tc.args || tc.input || {}),
             providerOptions: tc.providerOptions || tc.providerMetadata,
             providerMetadata: tc.providerMetadata || tc.providerOptions // Very crucial for Gemini 3.1 thought_signature
           });
        });

        // Update conversation state for next step matching the exact schema
        currentMessages.push({ 
           role: 'assistant', 
           content: asstParts, 
           providerOptions: (result as any).providerOptions || (result as any).providerMetadata,
           providerMetadata: (result as any).providerMetadata || (result as any).providerOptions 
        });
        currentMessages.push({ role: 'tool', content: stepToolParts });

        stepCount++;
      } else {
        // No more tool calls, agent has finished its task
        break;
      }
    }

    console.log(`[CHAT-FINAL] AI finished in ${stepCount + 1} steps. Response length: ${finalProcessedText.length}`);

    // Save assistant message to database
    await prisma.message.create({
      data: {
        conversationId: currentConversationId,
        role: 'assistant',
        content: finalProcessedText || 'Analysis complete.',
        toolCalls: (allToolCalls.length > 0) ? (allToolCalls as any) : undefined,
      },
    });

    // Save tool results
    if (allToolResults.length > 0) {
      for (const tr of allToolResults) {
        await prisma.message.create({
          data: {
            conversationId: currentConversationId,
            role: 'tool',
            content: JSON.stringify({
              toolCallId: tr.toolCallId,
              toolName: tr.toolName,
              result: tr.output || tr.error // Consistent mapping for database
            }),
          }
        });
      }
    }

    res.json({
      text: finalProcessedText || 'Analysis complete.',
      conversationId: currentConversationId,
      toolCalls: allToolCalls,
      toolResults: allToolResults,
    });
  } catch (error: any) {
    console.error('Chat stream error:', error);
    // Give a useful error message when Gemini key is invalid
    const msg = error.message?.includes('API key')
      ? 'Invalid Gemini API key. Please check your key in settings.'
      : error.message || 'Error streaming from AI';
    res.status(500).json({ error: msg });
  }
});

router.get('/conversations', authMiddleware, async (req: AuthRequest, res: ExpressResponse) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const conversations = await prisma.conversation.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        repo: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching conversations' });
  }
});

router.get('/conversations/:id', authMiddleware, async (req: AuthRequest, res: ExpressResponse) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const conversation = await prisma.conversation.findFirst({
      where: { id: req.params.id as string, userId: req.user.id },
      include: {
        repo: true,
        messages: { orderBy: { createdAt: 'asc' } }
      },
    });

    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching conversation details' });
  }
});

router.get('/conversations/:id/todos', authMiddleware, async (req: AuthRequest, res: ExpressResponse) => {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const todos = await prisma.todo.findMany({
      where: { 
        conversationId: req.params.id as string,
        conversation: { userId: req.user.id }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(todos);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching todos' });
  }
});

export default router;
