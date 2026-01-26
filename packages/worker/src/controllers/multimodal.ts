/**
 * Multi-Modal Services Controller
 * 
 * Handles all V2 multimodal API endpoints
 */

import type { Context } from 'hono';
import type { Env } from '../types/shared';
// Using relative path for workspace compatibility
// In production, this would be: import { VisionService, DocumentService, AudioAnalysisService, MultiModalContextService } from '@agent-army/multimodal-services';
import { VisionService } from '../../../multimodal-services/src/VisionService';
import { DocumentService } from '../../../multimodal-services/src/DocumentService';
import { AudioAnalysisService } from '../../../multimodal-services/src/AudioAnalysisService';
import { MultiModalContextService } from '../../../multimodal-services/src/MultiModalContext';

/**
 * Convert environment to multimodal service env format
 */
function getMultimodalServiceEnv(env: Env): Record<string, string> {
  const multimodalEnv: Record<string, string> = {};
  
  if (env.OPENAI_API_KEY && typeof env.OPENAI_API_KEY === 'string') {
    multimodalEnv.OPENAI_API_KEY = env.OPENAI_API_KEY;
  }
  
  return multimodalEnv;
}

/**
 * POST /api/v2/vision/analyze
 * Vision analysis endpoint
 */
export async function analyzeVision(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const { imageUrl, imageBase64, features, maxResults } = body;

    // Validate input
    if (!imageUrl && !imageBase64) {
      return c.json({ 
        success: false, 
        error: 'Image URL or base64 required' 
      }, 400);
    }

    const visionService = new VisionService(getMultimodalServiceEnv(c.env));
    const result = await visionService.analyzeImage({
      imageUrl,
      imageBase64,
      features,
      maxResults,
    });

    return c.json(result, result.success ? 200 : 500);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Multimodal Controller] Vision analysis error:', errorMessage);
    return c.json({ 
      success: false, 
      error: errorMessage 
    }, 500);
  }
}

/**
 * POST /api/v2/document/parse
 * Document parsing endpoint
 */
export async function parseDocument(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const { documentUrl, documentBase64, documentType, extractImages, ocrEnabled } = body;

    console.log('[Multimodal Controller] Document parse request:', {
      hasUrl: !!documentUrl,
      hasBase64: !!documentBase64,
      base64Length: documentBase64?.length || 0,
      documentType,
      extractImages,
      ocrEnabled,
    });

    // Validate input
    if (!documentUrl && !documentBase64) {
      return c.json({ 
        success: false, 
        error: 'Document URL or base64 required' 
      }, 400);
    }

    const documentService = new DocumentService(getMultimodalServiceEnv(c.env));
    const result = await documentService.parseDocument({
      documentUrl,
      documentBase64,
      documentType,
      extractImages,
      ocrEnabled,
    });

    console.log('[Multimodal Controller] Document parse result:', {
      success: result.success,
      hasText: !!result.text,
      textLength: result.text?.length || 0,
      error: result.error,
    });

    return c.json(result, result.success ? 200 : 500);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Multimodal Controller] Document parse error:', errorMessage);
    return c.json({ 
      success: false, 
      error: errorMessage 
    }, 500);
  }
}

/**
 * POST /api/v2/audio/analyze
 * Audio analysis endpoint
 */
export async function analyzeAudio(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const { audioUrl, audioBase64, features } = body;

    // Validate input
    if (!audioUrl && !audioBase64) {
      return c.json({ 
        success: false, 
        error: 'Audio URL or base64 required' 
      }, 400);
    }

    const audioService = new AudioAnalysisService(getMultimodalServiceEnv(c.env));
    const result = await audioService.analyzeAudio({
      audioUrl,
      audioBase64,
      features,
    });

    return c.json(result, result.success ? 200 : 500);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Multimodal Controller] Audio analysis error:', errorMessage);
    return c.json({ 
      success: false, 
      error: errorMessage 
    }, 500);
  }
}

/**
 * POST /api/v2/multimodal/context
 * Multi-modal context fusion endpoint
 */
export async function buildMultiModalContext(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const { text, imageUrl, audioUrl, documentUrl, location, timestamp, userId } = body;

    // Validate that at least one input is provided
    if (!text && !imageUrl && !audioUrl && !documentUrl && !location) {
      return c.json({ 
        success: false, 
        error: 'At least one input (text, imageUrl, audioUrl, documentUrl, or location) is required' 
      }, 400);
    }

    const contextService = new MultiModalContextService(getMultimodalServiceEnv(c.env));
    const result = await contextService.buildContext({
      text,
      imageUrl,
      audioUrl,
      documentUrl,
      location,
      timestamp,
      userId,
    });

    return c.json(result, result.success ? 200 : 500);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Multimodal Controller] Multi-modal context error:', errorMessage);
    return c.json({ 
      success: false, 
      error: errorMessage 
    }, 500);
  }
}

/**
 * GET /api/v2/multimodal/health
 * Health check endpoint
 */
export async function health(c: Context<{ Bindings: Env }>) {
  return c.json({
    status: 'ok',
    service: 'multimodal-services',
    timestamp: new Date().toISOString(),
  });
}
