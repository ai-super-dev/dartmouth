/**
 * Voice Services Controller
 * 
 * Handles all V2 voice API endpoints
 */

import type { Context } from 'hono';
import type { Env } from '../types/shared';
// Using relative path for workspace compatibility
// In production, this would be: import { VoiceService } from '@agent-army/voice-services';
import { VoiceService } from '../../../voice-services/src/VoiceService';

/**
 * Convert environment to voice service env format
 */
function getVoiceServiceEnv(env: Env): Record<string, string> {
  const voiceEnv: Record<string, string> = {};
  
  if (env.OPENAI_API_KEY && typeof env.OPENAI_API_KEY === 'string') {
    voiceEnv.OPENAI_API_KEY = env.OPENAI_API_KEY;
  }
  if (env.DEEPGRAM_API_KEY && typeof env.DEEPGRAM_API_KEY === 'string') {
    voiceEnv.DEEPGRAM_API_KEY = env.DEEPGRAM_API_KEY;
  }
  if (env.ELEVENLABS_API_KEY && typeof env.ELEVENLABS_API_KEY === 'string') {
    voiceEnv.ELEVENLABS_API_KEY = env.ELEVENLABS_API_KEY;
  }
  if (env.GOOGLE_TTS_API_KEY && typeof env.GOOGLE_TTS_API_KEY === 'string') {
    voiceEnv.GOOGLE_TTS_API_KEY = env.GOOGLE_TTS_API_KEY;
  }
  // Also check for GOOGLE_API_KEY as fallback for Google TTS
  if (env.GOOGLE_API_KEY && typeof env.GOOGLE_API_KEY === 'string') {
    voiceEnv.GOOGLE_API_KEY = env.GOOGLE_API_KEY;
  }
  if (env.AZURE_TTS_API_KEY && typeof env.AZURE_TTS_API_KEY === 'string') {
    voiceEnv.AZURE_TTS_API_KEY = env.AZURE_TTS_API_KEY;
  }
  if (env.AZURE_TTS_REGION && typeof env.AZURE_TTS_REGION === 'string') {
    voiceEnv.AZURE_TTS_REGION = env.AZURE_TTS_REGION;
  }
  
  return voiceEnv;
}

/**
 * POST /api/v2/voice/stt
 * Speech-to-Text endpoint
 */
export async function speechToText(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const { audio, language, provider, sampleRate, encoding } = body;

    // Validate input
    if (!audio) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Audio data is required'
        }
      }, 400);
    }

    // Decode base64 audio
    let audioBuffer: ArrayBuffer;
    try {
      const audioBytes = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
      audioBuffer = audioBytes.buffer;
    } catch (error) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid base64 audio data'
        }
      }, 400);
    }

    // Initialize Voice Service
    const voiceService = new VoiceService(getVoiceServiceEnv(c.env));

    // Perform STT
    // Default to 'whisper' if provider not specified (since 'native' is just a placeholder)
    const sttProvider = provider || 'whisper';
    const result = await voiceService.speechToText(audioBuffer, {
      language: language || 'en-AU',
      provider: sttProvider,
      sampleRate,
      encoding
    });
    
    console.log('[Voice Controller] STT result:', {
      provider: sttProvider,
      hasTranscript: !!result.transcript,
      transcriptLength: result.transcript?.length || 0,
      transcriptPreview: result.transcript?.substring(0, 50) || '(empty)',
    });

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Voice Controller] STT error:', error);
    
    if (error instanceof Error && 'code' in error && 'statusCode' in error) {
      return c.json({
        success: false,
        error: {
          code: (error as { code: string }).code,
          message: error.message
        }
      }, (error as { statusCode: number }).statusCode || 500);
    }

    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Speech-to-text failed'
      }
    }, 500);
  }
}

/**
 * POST /api/v2/voice/tts
 * Text-to-Speech endpoint
 */
export async function textToSpeech(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const { text, voice, provider, speed, pitch, format } = body;

    // Validate input
    if (!text) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Text is required'
        }
      }, 400);
    }

    // Initialize Voice Service
    const voiceService = new VoiceService(getVoiceServiceEnv(c.env));

    // Perform TTS
    const result = await voiceService.textToSpeech(text, {
      voice: voice || 'en-AU-female',
      provider: provider || 'native',
      speed: speed || 1.0,
      pitch,
      format: format || 'mp3'
    });

    // Convert ArrayBuffer to base64
    // Use chunked approach to avoid stack overflow for large audio files
    const audioBytes = new Uint8Array(result.audio);
    const chunkSize = 8192; // Process in 8KB chunks
    let binaryString = '';
    
    // Build binary string in chunks to avoid stack overflow
    for (let i = 0; i < audioBytes.length; i += chunkSize) {
      const chunk = audioBytes.slice(i, Math.min(i + chunkSize, audioBytes.length));
      // Build string character by character to avoid stack overflow
      for (let j = 0; j < chunk.length; j++) {
        binaryString += String.fromCharCode(chunk[j]);
      }
    }
    
    const audioBase64 = btoa(binaryString);

    return c.json({
      success: true,
      data: {
        audio: audioBase64,
        duration: result.duration,
        format: result.format,
        provider: result.provider,
        sampleRate: result.sampleRate
      }
    });
  } catch (error) {
    console.error('[Voice Controller] TTS error:', error);
    console.error('[Voice Controller] TTS error type:', typeof error);
    console.error('[Voice Controller] TTS error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      code: (error as any)?.code,
      statusCode: (error as any)?.statusCode,
    });
    
    let errorMessage = 'Text-to-speech failed';
    let errorCode = 'INTERNAL_ERROR';
    let statusCode = 500;
    
    if (error instanceof Error && 'code' in error && 'statusCode' in error) {
      errorCode = (error as { code: string }).code;
      errorMessage = error.message || errorMessage;
      statusCode = (error as { statusCode: number }).statusCode || 500;
    } else if (error instanceof Error) {
      errorMessage = error.message || errorMessage;
    } else {
      errorMessage = String(error);
    }
    
    console.error('[Voice Controller] TTS error message:', errorMessage);
    console.error('[Voice Controller] TTS error code:', errorCode);
    console.error('[Voice Controller] TTS status code:', statusCode);
    
    return c.json({
      success: false,
      error: {
        code: errorCode,
        message: errorMessage
      }
    }, statusCode);
  }
}

/**
 * POST /api/v2/voice/stream
 * Audio streaming endpoint
 */
export async function stream(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const { sessionId, action, sampleRate, channels, echoCancellation, noiseSuppression } = body;

    // Validate input
    if (!sessionId || !action) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Session ID and action are required'
        }
      }, 400);
    }

    // Initialize Voice Service
    const voiceService = new VoiceService(getVoiceServiceEnv(c.env));

    // Manage stream
    const result = await voiceService.manageStream({
      sessionId,
      action,
      sampleRate,
      channels,
      echoCancellation,
      noiseSuppression
    });

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Voice Controller] Stream error:', error);
    
    if (error instanceof Error && 'code' in error && 'statusCode' in error) {
      return c.json({
        success: false,
        error: {
          code: (error as { code: string }).code,
          message: error.message
        }
      }, (error as { statusCode: number }).statusCode || 500);
    }

    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Stream management failed'
      }
    }, 500);
  }
}

/**
 * POST /api/v2/voice/vad
 * Voice activity detection endpoint
 */
export async function detectVoiceActivity(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const { audio, sensitivity, minSpeechDuration, maxSilenceDuration, frameSize } = body;

    // Validate input
    if (!audio) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Audio data is required'
        }
      }, 400);
    }

    // Decode base64 audio
    let audioBuffer: ArrayBuffer;
    try {
      const audioBytes = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
      audioBuffer = audioBytes.buffer;
    } catch (error) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid base64 audio data'
        }
      }, 400);
    }

    // Initialize Voice Service
    const voiceService = new VoiceService(getVoiceServiceEnv(c.env));

    // Detect voice activity
    const result = await voiceService.detectVoiceActivity(audioBuffer, {
      sensitivity,
      minSpeechDuration,
      maxSilenceDuration,
      frameSize
    });

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Voice Controller] VAD error:', error);
    
    if (error instanceof Error && 'code' in error && 'statusCode' in error) {
      return c.json({
        success: false,
        error: {
          code: (error as { code: string }).code,
          message: error.message
        }
      }, (error as { statusCode: number }).statusCode || 500);
    }

    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Voice activity detection failed'
      }
    }, 500);
  }
}

/**
 * POST /api/v2/voice/interrupt
 * Interrupt handling endpoint
 */
export async function handleInterrupt(c: Context<{ Bindings: Env }>) {
  try {
    const body = await c.req.json();
    const { sessionId, action, reason } = body;

    // Validate input
    if (!sessionId || !action) {
      return c.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Session ID and action are required'
        }
      }, 400);
    }

    // Initialize Voice Service
    const voiceService = new VoiceService(getVoiceServiceEnv(c.env));

    // Handle interrupt
    const result = await voiceService.handleInterrupt({
      sessionId,
      action,
      reason
    });

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Voice Controller] Interrupt error:', error);
    
    if (error instanceof Error && 'code' in error && 'statusCode' in error) {
      return c.json({
        success: false,
        error: {
          code: (error as { code: string }).code,
          message: error.message
        }
      }, (error as { statusCode: number }).statusCode || 500);
    }

    return c.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Interrupt handling failed'
      }
    }, 500);
  }
}

/**
 * GET /api/v2/voice/health
 * Health check endpoint (no auth required)
 */
export async function health(c: Context<{ Bindings: Env }>) {
  try {
    // Initialize Voice Service
    const voiceService = new VoiceService(getVoiceServiceEnv(c.env));

    // Check health
    const result = await voiceService.checkHealth();

    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('[Voice Controller] Health check error:', error);
    return c.json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: error instanceof Error ? error.message : 'Health check failed'
      }
    }, 500);
  }
}

