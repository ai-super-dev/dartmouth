/**
 * Dartmouth OS Worker - Main Entry Point
 * Cloudflare Worker powered by Dartmouth OS V2.0
 */

import { DartmouthOS } from '../../dartmouth-core/src/DartmouthOS';
import { createFAMAgent, createArtworkAnalyzerAgent, createTestAgent } from './createDartmouthAgents';
// import { McCarthyPAAgent } from '../../mccarthy-pa/src'; // TODO: Enable after package build
import { router } from './routes';
import { createAPIRouter } from './routes/api';
import { handleEmailPolling } from './workers/email-poller';
import { sendScheduledMessages } from './workers/scheduled-message-sender';
import { checkSnoozeExpiry } from './workers/snooze-expiry-checker';
import { runAutoAssignment } from './workers/auto-assignment-job';
import { handleInboundEmail, type EmailMessage } from './services/EmailHandler';
import { TaskManagerAgent } from './services/TaskManagerAgent';
import { TaskEscalationService } from './services/TaskEscalationService';
import type { Env } from './types/shared';
import type { Env as DartmouthEnv } from '../../dartmouth-core/src/types';

// Log module load to verify worker is being executed
console.log('[Worker Module] ========================================');
console.log('[Worker Module] Module loaded at:', new Date().toISOString());
console.log('[Worker Module] Worker file: src/index.ts');
console.log('[Worker Module] ========================================');

// Global Dartmouth OS instance (initialized on first request)
let dartmouth: DartmouthOS | null = null;

/**
 * Initialize Dartmouth OS and register agents
 */
async function initializeDartmouth(env: Env): Promise<DartmouthOS> {
  if (dartmouth) {
    return dartmouth;
  }

  console.log('[Dartmouth] Initializing Dartmouth OS V2.0...');

  // Create Dartmouth OS instance
  const dartmouthEnv: DartmouthEnv = {
    DB: env.DB,
    R2: env.FILES as any || undefined, // Optional - type assertion to handle version conflicts
    KV: env.CACHE as any, // Type assertion to handle version conflicts
    OPENAI_API_KEY: env.OPENAI_API_KEY || '',
    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY || '',
    ELEVENLABS_API_KEY: env.ELEVENLABS_API_KEY,
    TWILIO_ACCOUNT_SID: env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: env.TWILIO_AUTH_TOKEN,
    SENDGRID_API_KEY: env.SENDGRID_API_KEY,
    ENVIRONMENT: (env.ENVIRONMENT as 'development' | 'staging' | 'production') || 'development',
    JWT_SECRET: env.JWT_SECRET || 'dev-secret',
  };

  dartmouth = new DartmouthOS(dartmouthEnv, {
    environment: dartmouthEnv.ENVIRONMENT,
    enableHealthMonitoring: true,
    healthCheckInterval: 60000,
  });

  await dartmouth.initialize();

  console.log('[Dartmouth] Dartmouth OS initialized successfully');

  // Register agents
  console.log('[Dartmouth] Registering agents...');

  // Create base agent config
  const baseConfig = {
    agentId: 'fam',
    tenantId: 'default',
    agentConfig: {
      agentId: 'fam',
      name: 'FAM Agent',
      version: '1.0.0',
      description: 'Base agent configuration',
      llmProvider: (env.LLM_PROVIDER as 'openai' | 'anthropic' | 'google') || 'openai',
      llmModel: env.LLM_MODEL || 'gpt-4o-mini',
      systemPrompt: '', // Will be set by agent
      temperature: 0.7,
      maxTokens: 1000,
    },
    env: {
      DB: env.DB,
      APP_CONFIG: env.APP_CONFIG as any, // Type assertion to handle version conflicts
      CACHE: env.CACHE as any, // Type assertion to handle version conflicts
      FILES: env.FILES as any, // Type assertion to handle version conflicts
      WORKERS_AI: env.WORKERS_AI as any, // Type assertion to handle version conflicts
      VECTORIZE: env.VECTORIZE,
      OPENAI_API_KEY: env.OPENAI_API_KEY,
      ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
      GOOGLE_API_KEY: env.GOOGLE_API_KEY,
    },
  };

  // Register FAM
  const famAgent = createFAMAgent(baseConfig);
  dartmouth.registerAgent(famAgent);
  console.log('[Dartmouth] ✅ FAM registered');

  // Register Artwork Analyzer
  const artworkAgent = createArtworkAnalyzerAgent({
    ...baseConfig,
    agentId: 'mccarthy-artwork',
    agentConfig: {
      ...baseConfig.agentConfig,
      agentId: 'mccarthy-artwork',
      name: 'McCarthy Artwork Analyzer',
      version: '1.0.0',
    },
  });
  dartmouth.registerAgent(artworkAgent);
  console.log('[Dartmouth] ✅ McCarthy Artwork Analyzer registered');

  // Register Test Agent
  const testAgent = createTestAgent({
    ...baseConfig,
    agentId: 'test-agent',
    agentConfig: {
      ...baseConfig.agentConfig,
      agentId: 'test-agent',
      name: 'Test Agent',
      version: '1.0.0',
    },
  });
  dartmouth.registerAgent(testAgent);
  console.log('[Dartmouth] ✅ Test Agent registered');

  // Register PA Agent (TODO: Enable after package build)
  // const paAgent = new McCarthyPAAgent({
  //   ...baseConfig,
  //   agentId: 'mccarthy-pa',
  // });
  // dartmouth.registerAgent(paAgent);
  // console.log('[Dartmouth] ✅ McCarthy PA registered');

  console.log('[Dartmouth] All agents registered successfully');

  return dartmouth;
}

/**
 * Cloudflare Worker fetch handler
 */
// Create API router instance - lazy load to avoid import errors at module load time
let apiRouter: ReturnType<typeof createAPIRouter> | null = null;

function getAPIRouter(): ReturnType<typeof createAPIRouter> {
  if (!apiRouter) {
    console.log('[Worker Init] Creating API router (lazy init)...');
    try {
      apiRouter = createAPIRouter();
      console.log('[Worker Init] API router created successfully');
    } catch (error) {
      console.error('[Worker Init] ERROR creating API router:', error);
      throw error;
    }
  }
  return apiRouter;
}

// Log that we're creating the export
console.log('[Worker Export] Creating default export object at:', new Date().toISOString());

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startTime = Date.now();
    console.log(`[Worker] ===== FETCH HANDLER CALLED =====`);
    console.log(`[Worker] Method: ${request.method}`);
    console.log(`[Worker] URL: ${request.url}`);
    console.log(`[Worker] Timestamp: ${new Date().toISOString()}`);
    console.log(`[Worker] Env keys:`, Object.keys(env || {}).slice(0, 5));
    
    try {
      const url = new URL(request.url);
      console.log(`[Worker] Parsed URL - pathname: ${url.pathname}`);
      
      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        console.log('[Worker] Handling OPTIONS preflight request');
        return new Response(null, {
          status: 204,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Agent-Id',
            'Access-Control-Max-Age': '86400',
          },
        });
      }
      
      // Root route - welcome page
      if (url.pathname === '/') {
        console.log('[Worker] Handling root route');
        const response = new Response(
          JSON.stringify({
            message: 'Dartmouth OS Worker API',
            version: '2.0',
            status: 'running',
            endpoints: {
              health: '/health',
              api: '/api/v2',
              docs: 'See README.md for API documentation'
            }
          }),
          {
            status: 200,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
        console.log('[Worker] Root route response created');
        return response;
      }
      
      // Route Week 4 Integration APIs and test routes FIRST (before Dartmouth OS)
      if (url.pathname.startsWith('/api/v2/test/') || 
          url.pathname.startsWith('/api/v2/conversations') ||
          url.pathname.startsWith('/api/v2/auth/') ||
          url.pathname.startsWith('/api/v2/calendar/') ||
          url.pathname.startsWith('/api/v2/email/') ||
          url.pathname.startsWith('/api/v2/voice/')) {
        return await getAPIRouter().fetch(request, env);
      }
      
      // Route Dartmouth OS V2 requests
      if (url.pathname.startsWith('/api/v2/')) {
        const dartmouthOS = await initializeDartmouth(env);
        return await dartmouthOS.handleRequest(request);
      }
      
      // Manual email polling trigger (for testing)
      if (url.pathname === '/trigger-email-poll') {
        try {
          const logs: string[] = [];
          const originalConsoleLog = console.log;
          const originalConsoleError = console.error;
          
          // Capture console logs
          console.log = (...args: any[]) => {
            logs.push(args.join(' '));
            originalConsoleLog(...args);
          };
          console.error = (...args: any[]) => {
            logs.push('ERROR: ' + args.join(' '));
            originalConsoleError(...args);
          };
          
          await handleEmailPolling(env);
          
          // Restore console
          console.log = originalConsoleLog;
          console.error = originalConsoleError;
          
          return new Response(JSON.stringify({ success: true, message: 'Email polling triggered', logs }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ success: false, error: error.message, stack: error.stack }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Manual scheduled message sender trigger (for testing)
      if (url.pathname === '/trigger-send-scheduled') {
        try {
          const logs: string[] = [];
          const originalConsoleLog = console.log;
          const originalConsoleError = console.error;
          
          // Capture console logs
          console.log = (...args: any[]) => {
            logs.push(args.join(' '));
            originalConsoleLog(...args);
          };
          console.error = (...args: any[]) => {
            logs.push('ERROR: ' + args.join(' '));
            originalConsoleError(...args);
          };
          
          await sendScheduledMessages(env);
          
          // Restore console
          console.log = originalConsoleLog;
          console.error = originalConsoleError;
          
          return new Response(JSON.stringify({ success: true, message: 'Scheduled message sender triggered', logs }), {
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error: any) {
          return new Response(JSON.stringify({ success: false, error: error.message, stack: error.stack }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Route Customer Service API requests
      if (url.pathname.startsWith('/api/')) {
        return await getAPIRouter().fetch(request, env);
      }

      // Otherwise, use legacy routing (for backward compatibility)
      console.log('[Worker] Routing to legacy router');
      try {
        const response = await router(request, env);
        const duration = Date.now() - startTime;
        console.log(`[Worker] Request handled in ${duration}ms, status: ${response.status}`);
        return response;
      } catch (routerError) {
        console.error('[Worker] Router error:', routerError);
        throw routerError; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      console.error('[Worker] ERROR:', error);
      console.error('[Worker] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      // Always return a response, even on error
      try {
        return new Response(
          JSON.stringify({
            error: 'Internal Server Error',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date().toISOString(),
          }),
          {
            status: 500,
            headers: { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      } catch (responseError) {
        // If even creating the error response fails, return minimal response
        console.error('[Worker] CRITICAL: Failed to create error response:', responseError);
        return new Response('Internal Server Error', { status: 500 });
      }
    }
  },

  /**
   * Cloudflare Worker scheduled handler
   * Runs on cron schedule defined in wrangler.toml
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log('[Scheduled] Jobs triggered at:', new Date(event.scheduledTime).toISOString());
    
    try {
      // Run email polling in background
      ctx.waitUntil(handleEmailPolling(env));
      
      // Run scheduled message sender in background
      ctx.waitUntil(sendScheduledMessages(env));
      
      // Check for expired snoozes in background
      ctx.waitUntil(checkSnoozeExpiry(env));
      
      // Run auto-assignment job in background
      ctx.waitUntil(runAutoAssignment(env));
      
      // Run Task Manager Agent checks in background
      ctx.waitUntil((async () => {
        const taskManager = new TaskManagerAgent(env);
        await taskManager.runAllChecks();
      })());
      
      // Run Task Escalation checks in background
      ctx.waitUntil((async () => {
        const escalationService = new TaskEscalationService(env);
        await escalationService.checkAndEscalateOverdueTasks();
      })());
    } catch (error) {
      console.error('[Scheduled] Error in scheduled jobs:', error);
    }
  },

  /**
   * Cloudflare Email Worker handler
   * Receives inbound emails via Cloudflare Email Routing
   */
  async email(message: EmailMessage, env: Env, _ctx: ExecutionContext): Promise<void> {
    console.log('[Email] Received inbound email');
    
    try {
      await handleInboundEmail(message, env);
      console.log('[Email] ✅ Email processed successfully');
    } catch (error) {
      console.error('[Email] Error processing inbound email:', error);
      // Don't throw - Cloudflare will retry and we don't want infinite retries
    }
  }
}

