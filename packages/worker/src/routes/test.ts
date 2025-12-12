/**
 * test.ts
 * 
 * Test endpoints for validating individual components
 * These endpoints allow testing each component in isolation
 */

import { BaseAgent } from '../BaseAgent';
import { McCarthyArtworkAgent } from '../../../mccarthy-artwork/src/McCarthyArtworkAgent';
import { IntentDetector } from '../components/IntentDetector';
import { ResponseValidator } from '../components/ResponseValidator';
import { CalculationEngine } from '../../../mccarthy-artwork/src/components/CalculationEngine';
import type { Env } from '../types/shared';

/**
 * Create a test base agent configuration
 */
function createTestBaseAgentConfig(env: Env, agentId: string = 'test-agent') {
  return {
    agentId,
    tenantId: 'test-tenant',
    userId: 'test-user',
    agentConfig: {
      agentId,
      name: 'Test Agent',
      description: 'Agent for testing purposes',
      version: '1.0.0',
      systemPrompt: 'You are a helpful test assistant.',
      llmProvider: 'openai' as const,
      llmModel: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1000,
    },
    env: {
      DB: env.DB,
      APP_CONFIG: env.APP_CONFIG as any,
      CACHE: env.CACHE as any,
      FILES: env.FILES as any,
      WORKERS_AI: env.WORKERS_AI as any,
      VECTORIZE: env.VECTORIZE as any, // Optional - can be undefined
      OPENAI_API_KEY: env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
      GOOGLE_API_KEY: env.GOOGLE_API_KEY,
    },
  };
}

/**
 * POST /test/chat
 * Test the full conversation flow
 */
export async function handleTestChat(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { message: string; sessionId?: string; agentId?: string };
    
    if (!body.message) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: message' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const agentId = body.agentId || 'test-agent';
    const config = createTestBaseAgentConfig(env, agentId);
    
    // Create agent based on agentId
    let agent: BaseAgent;
    if (agentId === 'mccarthy-artwork' || agentId === 'artwork-analyzer') {
      agent = new McCarthyArtworkAgent(config);
    } else {
      agent = new BaseAgent(config);
    }
    
    const sessionId = body.sessionId || `test-session-${Date.now()}`;
    const response = await agent.processMessage(body.message, sessionId);

    return new Response(JSON.stringify(response, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }, null, 2),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * POST /test/intent
 * Test the IntentDetector component
 */
export async function handleTestIntent(request: Request, _env: Env): Promise<Response> {
  try {
    const body = await request.json() as { message: string };
    
    if (!body.message) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: message' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const detector = new IntentDetector();
    const intent = await detector.detect(body.message);

    return new Response(JSON.stringify({ intent }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }, null, 2),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * POST /test/validation
 * Test the ResponseValidator component
 */
export async function handleTestValidation(request: Request, _env: Env): Promise<Response> {
  try {
    const body = await request.json() as { 
      question: string; 
      answer: string;
    };
    
    if (!body.question || !body.answer) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: question, answer' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const validator = new ResponseValidator();
    const validation = await validator.validate(
      { 
        content: body.answer, 
        metadata: {
          handlerName: 'test',
          handlerVersion: '1.0.0',
          processingTime: 0,
          cached: false,
          confidence: 1.0,
        }
      },
      body.question
    );

    return new Response(JSON.stringify({ validation }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }, null, 2),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * POST /test/calculation
 * Test the CalculationEngine component
 */
export async function handleTestCalculation(request: Request, _env: Env): Promise<Response> {
  try {
    const body = await request.json() as { 
      artworkId: string;
      widthPixels: number;
      heightPixels: number;
      currentDPI: number;
    };
    
    if (!body.artworkId || !body.widthPixels || !body.heightPixels || !body.currentDPI) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: artworkId, widthPixels, heightPixels, currentDPI' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const engine = new CalculationEngine();
    const result = engine.preCompute(
      body.artworkId,
      body.widthPixels,
      body.heightPixels,
      body.currentDPI
    );

    return new Response(JSON.stringify({ result }, null, 2), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }, null, 2),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * POST /test/memory
 * Test the MemorySystem component
 */
export async function handleTestMemory(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { 
      action: 'store' | 'retrieve' | 'getFacts' | 'getEpisodes';
      agentId: string;
      sessionId?: string;
      userId?: string;
      content?: string;
      query?: string;
      summary?: string;
      metadata?: Record<string, any>;
    };
    
    if (!body.action || !body.agentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, agentId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { MemorySystem } = await import('../components/MemorySystem');
    const memorySystem = new MemorySystem(env.APP_CONFIG as any, env.DB);

    if (body.action === 'store') {
      if (!body.content) {
        return new Response(
          JSON.stringify({ error: 'Missing required field for store: content' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      try {
        await memorySystem.storeFact(body.agentId, body.content, body.metadata || {});
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Fact stored successfully',
            agentId: body.agentId,
            content: body.content
          }, null, 2),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (storeError) {
        console.error('Store error:', storeError);
        const errorMessage = storeError instanceof Error ? storeError.message : String(storeError);
        const isTableMissing = errorMessage.includes('no such table') || errorMessage.includes('semantic_memory');
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to store fact',
            details: errorMessage,
            ...(isTableMissing && {
              hint: 'Database tables are missing. Please run the migration: npm run db:migrate:remote',
              solution: 'Run: wrangler d1 execute agent-army-db --remote --file=./migrations/0001_initial_schema.sql'
            })
          }, null, 2),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else if (body.action === 'retrieve') {
      const sessionId = body.sessionId || `test-session-${Date.now()}`;
      const userId = body.userId || 'test-user';
      const context = body.query || '';

      try {
        const memories = await memorySystem.recall(sessionId, userId, body.agentId, context);
        return new Response(
          JSON.stringify({ 
            success: true,
            agentId: body.agentId,
            sessionId,
            userId,
            memories
          }, null, 2),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (retrieveError) {
        console.error('Retrieve error:', retrieveError);
        const errorMessage = retrieveError instanceof Error ? retrieveError.message : String(retrieveError);
        const isTableMissing = errorMessage.includes('no such table') || errorMessage.includes('semantic_memory') || errorMessage.includes('episodic_memory');
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to retrieve memories',
            details: errorMessage,
            ...(isTableMissing && {
              hint: 'Database tables are missing. Please run the migration: npm run db:migrate:remote',
              solution: 'Run: wrangler d1 execute agent-army-db --remote --file=./migrations/0001_initial_schema.sql'
            })
          }, null, 2),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else if (body.action === 'getFacts') {
      try {
        const facts = await memorySystem.getFacts(body.agentId, body.query);
        return new Response(
          JSON.stringify({ 
            success: true,
            agentId: body.agentId,
            query: body.query || null,
            facts
          }, null, 2),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Get facts error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isTableMissing = errorMessage.includes('no such table') || errorMessage.includes('semantic_memory');
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to get facts',
            details: errorMessage,
            ...(isTableMissing && {
              hint: 'Database tables are missing. Please run the migration: npm run db:migrate:remote',
              solution: 'Run: wrangler d1 execute agent-army-db --remote --file=./migrations/0001_initial_schema.sql'
            })
          }, null, 2),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else if (body.action === 'getEpisodes') {
      const userId = body.userId || 'test-user';
      try {
        const episodes = await memorySystem.getEpisodes(userId, body.agentId, 5);
        return new Response(
          JSON.stringify({ 
            success: true,
            agentId: body.agentId,
            userId,
            episodes
          }, null, 2),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        console.error('Get episodes error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isTableMissing = errorMessage.includes('no such table') || errorMessage.includes('episodic_memory');
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to get episodes',
            details: errorMessage,
            ...(isTableMissing && {
              hint: 'Database tables are missing. Please run the migration: npm run db:migrate:remote',
              solution: 'Run: wrangler d1 execute agent-army-db --remote --file=./migrations/0001_initial_schema.sql'
            })
          }, null, 2),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "store", "retrieve", "getFacts", or "getEpisodes"' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }, null, 2),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * POST /test/rag
 * Test the RAG Engine component
 */
export async function handleTestRAG(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { 
      action: 'ingest' | 'search';
      agentId: string;
      title?: string;
      content?: string;
      query?: string;
    };
    
    if (!body.action || !body.agentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: action, agentId' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { RAGEngine } = await import('../components/RAGEngine');
    const ragEngine = new RAGEngine(env.DB, env.WORKERS_AI as any, env.CACHE as any);

    if (body.action === 'ingest') {
      if (!body.title || !body.content) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields for ingest: title, content' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      try {
        const result = await ragEngine.ingestDocument(body.agentId, {
          id: crypto.randomUUID(),
          title: body.title,
          content: body.content,
          type: 'markdown'
        });

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Document ingested successfully',
            agentId: body.agentId,
            title: body.title,
            chunks: result.chunks,
            embeddings: result.embeddings
          }, null, 2),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (ingestError) {
        console.error('[TestRAG] Ingest error:', ingestError);
        const errorMessage = ingestError instanceof Error ? ingestError.message : String(ingestError);
        const isTableMissing = errorMessage.includes('no such table') || errorMessage.includes('documents') || errorMessage.includes('rag_chunks');
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to ingest document',
            details: errorMessage,
            stack: ingestError instanceof Error ? ingestError.stack : undefined,
            ...(isTableMissing && {
              hint: 'Database tables are missing. Please run the migration: npm run db:migrate:remote',
              solution: 'Run: wrangler d1 execute agent-army-db --remote --file=./migrations/0001_initial_schema.sql'
            })
          }, null, 2),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    } else if (body.action === 'search') {
      if (!body.query) {
        return new Response(
          JSON.stringify({ error: 'Missing required field for search: query' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      try {
        const result = await ragEngine.retrieve(body.agentId, body.query, 5, 0.7);

        return new Response(
          JSON.stringify({ 
            success: true,
            agentId: body.agentId,
            query: body.query,
            results: result,
            message: result.chunks.length === 0 
              ? 'No matching documents found. Try ingesting a document first.' 
              : `Found ${result.chunks.length} relevant chunks`
          }, null, 2),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (searchError) {
        console.error('[TestRAG] Search error:', searchError);
        const errorMessage = searchError instanceof Error ? searchError.message : String(searchError);
        const isTableMissing = errorMessage.includes('no such table') || errorMessage.includes('rag_chunks') || errorMessage.includes('documents');
        
        return new Response(
          JSON.stringify({ 
            error: 'Failed to search documents',
            details: errorMessage,
            stack: searchError instanceof Error ? searchError.stack : undefined,
            ...(isTableMissing ? {
              hint: 'Database tables are missing. Please run the migration: npm run db:migrate:remote',
              solution: 'Run: wrangler d1 execute agent-army-db --remote --file=./migrations/0001_initial_schema.sql'
            } : {
              hint: 'Make sure you have ingested at least one document before searching'
            })
          }, null, 2),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "ingest" or "search"' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[TestRAG] Unexpected error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }, null, 2),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * GET /test/session/:sessionId
 * Get session state for testing
 */
export async function handleTestGetSession(sessionId: string, env: Env): Promise<Response> {
  try {
    const config = createTestBaseAgentConfig(env);
    const agent = new BaseAgent(config);
    
    // Initialize with the session ID to load state
    await agent.processMessage('', sessionId);
    const summary = agent.getSummary();

    return new Response(
      JSON.stringify({ sessionId, summary }, null, 2),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }, null, 2),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * POST /test/batch
 * Test multiple messages in sequence
 */
export async function handleTestBatch(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { 
      messages: string[];
      sessionId?: string;
    };
    
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: messages (array)' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const config = createTestBaseAgentConfig(env);
    const agent = new BaseAgent(config);
    const sessionId = body.sessionId || `test-batch-${Date.now()}`;
    
    const responses = [];
    for (const message of body.messages) {
      const response = await agent.processMessage(message, sessionId);
      responses.push({
        message,
        response: response.content,
        metadata: response.metadata,
      });
    }

    const summary = agent.getSummary();

    return new Response(
      JSON.stringify({ sessionId, responses, summary }, null, 2),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      }, null, 2),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

