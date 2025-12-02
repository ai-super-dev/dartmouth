/**
 * PA_AI Chat Controller
 * Handles text and voice chat for PA_AI mobile app
 */

import type { Context } from 'hono';
import type { Env } from '../types/shared';
import { handleChat } from '../routes/chat';

/**
 * Text Chat
 * POST /api/pa-ai/chat
 */
export async function chat(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as { id: string; email: string; role: string };
    const body = await c.req.json();
    const { message, sessionId, history, context, systemPrompt } = body;
    
    // Log system prompt for debugging
    console.log('[PA_AI Chat] Received request:', {
      hasSystemPrompt: !!systemPrompt,
      systemPromptLength: systemPrompt?.length,
      systemPromptPreview: systemPrompt?.substring(0, 150),
    });

    if (!message || typeof message !== 'string') {
      return c.json({ error: 'Message is required' }, 400);
    }

    // Get user profile for context
    const userProfile = await c.env.DB.prepare(`
      SELECT timezone, home_address, currency, locale, voice_settings
      FROM pa_ai_users
      WHERE user_id = ?
    `).bind(user.id).first();

    // Build context
    const chatContext = {
      userId: user.id,
      timezone: userProfile?.timezone || 'Australia/Sydney',
      location: userProfile?.home_address || 'Unknown',
      currency: userProfile?.currency || 'AUD',
      locale: userProfile?.locale || 'en-AU',
      currentTime: new Date().toISOString(),
      ...context,
    };

    // Create request for chat handler
    const chatRequest = new Request(c.req.url, {
      method: 'POST',
      headers: c.req.header(),
      body: JSON.stringify({
        message,
        sessionId: sessionId || `pa-ai-${user.id}-${Date.now()}`,
        userId: user.id,
        systemPrompt: systemPrompt, // Pass systemPrompt from client to chat handler
        metadata: {
          ...chatContext,
          history: history || [],
        },
      }),
    });

    // Use existing chat handler with FAM agent
    const response = await handleChat('fam', chatRequest, c.env);
    
    // Check if response is an error
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[PA_AI Chat] Chat handler returned error:', response.status, errorData);
      return c.json({ 
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        details: errorData
      }, response.status);
    }
    
    const responseData = await response.json();
    
    // Log full response for debugging
    console.log('[PA_AI Chat] Raw response from handleChat:', {
      hasContent: !!responseData?.content,
      contentType: typeof responseData?.content,
      contentLength: responseData?.content?.length,
      contentPreview: responseData?.content?.substring?.(0, 100),
      keys: Object.keys(responseData || {}),
      fullResponse: JSON.stringify(responseData).substring(0, 500),
    });
    
    // CRITICAL: Always ensure we have valid content, even if validation passes
    // This is a defensive check to prevent any edge cases
    let finalContent: string;
    
    if (!responseData || !responseData.content) {
      console.error('[PA_AI Chat] Response missing content field:', {
        responseData,
        hasContent: !!responseData?.content,
        contentType: typeof responseData?.content,
        contentValue: responseData?.content,
        allKeys: Object.keys(responseData || {}),
      });
      finalContent = 'I apologize, but I encountered an issue processing your message. Please try again.';
    } else if (typeof responseData.content === 'string') {
      const trimmed = responseData.content.trim();
      if (trimmed.length === 0) {
        console.error('[PA_AI Chat] Response has empty content string');
        finalContent = 'I apologize, but I encountered an issue processing your message. Please try again.';
      } else {
        finalContent = trimmed;
      }
    } else {
      console.error('[PA_AI Chat] Response content is not a string:', {
        contentType: typeof responseData.content,
        contentValue: responseData.content,
      });
      finalContent = 'I apologize, but I encountered an issue processing your message. Please try again.';
    }

    console.log('[PA_AI Chat] Final response preparation:', {
      contentLength: finalContent.length,
      contentPreview: finalContent.substring(0, 100),
      sessionId: responseData?.sessionId,
      hasMetadata: !!responseData?.metadata,
    });
    
    // ALWAYS return content - never return without it
    const finalResponse = {
      content: finalContent, // This will ALWAYS be a non-empty string
      type: 'text',
      sessionId: responseData?.sessionId || null,
      messageId: responseData?.messageId || null,
      metadata: responseData?.metadata || {},
      timestamp: responseData?.timestamp || new Date().toISOString(),
    };
    
    console.log('[PA_AI Chat] Returning response with content length:', finalResponse.content.length);
    
    return c.json(finalResponse);
  } catch (error) {
    console.error('[PA_AI Chat] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('[PA_AI Chat] Error details:', { errorMessage, errorStack });
    return c.json({ 
      error: errorMessage,
      ...(c.env.ENVIRONMENT === 'development' ? { stack: errorStack } : {})
    }, 500);
  }
}

/**
 * Voice Chat (audio file upload)
 * POST /api/pa-ai/chat/voice
 * 
 * Accepts audio file, converts to text, then processes as chat
 */
export async function voiceChat(c: Context<{ Bindings: Env }>) {
  try {
    const user = c.get('user') as { id: string; email: string; role: string };
    
    // Get form data with audio file
    const formData = await c.req.formData();
    const audioFile = formData.get('audio') as File;
    const sessionId = formData.get('sessionId') as string;
    const history = formData.get('history') ? JSON.parse(formData.get('history') as string) : [];

    if (!audioFile) {
      return c.json({ error: 'Audio file is required' }, 400);
    }

    // For now, we expect the client to convert audio to text before sending
    // In the future, we can integrate with OpenAI Whisper or Cloudflare Workers AI
    // For MVP, return error asking client to send text instead
    return c.json({ 
      error: 'Voice chat requires audio-to-text conversion on client side. Please send text message instead.',
      note: 'Future: Will support direct audio upload with Whisper API integration'
    }, 501);

    // TODO: Future implementation
    // 1. Save audio file to R2
    // 2. Call OpenAI Whisper API or Cloudflare Workers AI for transcription
    // 3. Process transcribed text as regular chat message
    // 4. Return response
  } catch (error) {
    console.error('[PA_AI Voice Chat] Error:', error);
    return c.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, 500);
  }
}

