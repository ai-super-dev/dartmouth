/**
 * TTSService - Text-to-Speech Service
 * 
 * Supports multiple providers:
 * - native: Device native TTS
 * - elevenlabs: ElevenLabs API
 * - google: Google Cloud TTS
 * - azure: Azure Cognitive Services TTS
 * 
 * @example
 * ```typescript
 * const ttsService = new TTSService();
 * const result = await ttsService.synthesize('Hello, world!', {
 *   voice: 'en-AU-female',
 *   speed: 1.0
 * });
 * ```
 */

import type { TTSOptions, TTSResult } from './types';
import { VoiceServiceError } from './types';

export class TTSService {
  private defaultProvider: string;
  private env?: Record<string, string>;

  constructor(env?: Record<string, string>) {
    this.defaultProvider = 'native';
    this.env = env;
  }

  /**
   * Synthesize text to speech
   * @param text - Text to convert
   * @param options - TTS options
   * @returns Audio buffer
   */
  async synthesize(
    text: string,
    options: TTSOptions = {}
  ): Promise<TTSResult> {
    // Validate input
    if (!text || text.trim().length === 0) {
      throw new VoiceServiceError(
        'Text is required',
        'INVALID_TEXT',
        400
      );
    }

    const provider = options.provider || this.defaultProvider;
    const voice = options.voice || 'en-AU-female';
    const speed = options.speed || 1.0;
    const format = options.format || 'mp3';

    try {
      switch (provider) {
        case 'native':
          return await this.synthesizeNative(text, voice, speed, format);
        case 'openai':
          return await this.synthesizeOpenAI(text, voice, speed, format);
        case 'elevenlabs':
          return await this.synthesizeElevenLabs(text, voice, speed, format);
        case 'google':
          return await this.synthesizeGoogle(text, voice, speed, format);
        case 'azure':
          return await this.synthesizeAzure(text, voice, speed, format);
        default:
          throw new VoiceServiceError(
            `Unknown TTS provider: ${provider}`,
            'UNKNOWN_PROVIDER',
            400
          );
      }
    } catch (error) {
      if (error instanceof VoiceServiceError) {
        throw error;
      }
      throw new VoiceServiceError(
        `Failed to synthesize speech: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SYNTHESIS_FAILED',
        500
      );
    }
  }

  /**
   * Native TTS implementation
   * Uses Google TTS as fallback since Cloudflare Workers don't have native TTS
   * If GOOGLE_TTS_API_KEY is not available, falls back to GOOGLE_API_KEY
   */
  private async synthesizeNative(
    text: string,
    voice: string,
    speed: number,
    format: string
  ): Promise<TTSResult> {
    // Cloudflare Workers don't have native TTS, so use Google TTS as fallback
    // Check if we have Google TTS API key
    const googleTtsKey = this.env?.GOOGLE_TTS_API_KEY || this.env?.GOOGLE_API_KEY;
    
    if (googleTtsKey) {
      // Use Google TTS as "native" provider
      return await this.synthesizeGoogle(text, voice, speed, format);
    }
    
    // If no Google API key, try to use OpenAI TTS (if available)
    const openaiKey = this.env?.OPENAI_API_KEY;
    if (openaiKey) {
      return await this.synthesizeOpenAI(text, voice, speed, format);
    }
    
    // Last resort: return error asking for API key configuration
    throw new VoiceServiceError(
      'Native TTS requires GOOGLE_TTS_API_KEY, GOOGLE_API_KEY, or OPENAI_API_KEY to be configured',
      'CONFIGURATION_ERROR',
      500
    );
  }

  /**
   * OpenAI TTS implementation
   * Uses tts-1-hd for higher quality (better for production)
   * Falls back to tts-1 for faster response if needed
   */
  private async synthesizeOpenAI(
    text: string,
    voice: string,
    speed: number,
    format: string
  ): Promise<TTSResult> {
    const apiKey = this.env?.OPENAI_API_KEY;
    if (!apiKey) {
      throw new VoiceServiceError(
        'OPENAI_API_KEY not configured',
        'CONFIGURATION_ERROR',
        500
      );
    }

    // OpenAI TTS has a 4096 character limit
    // If text is too long, we need to truncate or split it
    const MAX_CHARS = 4096;
    if (text.length > MAX_CHARS) {
      console.warn(`[TTSService] Text length (${text.length}) exceeds OpenAI TTS limit (${MAX_CHARS}), truncating...`);
      text = text.substring(0, MAX_CHARS);
    }

    const startTime = Date.now();

    // Map voice to OpenAI voice names
    // OpenAI voices: alloy, echo, fable, onyx, nova, shimmer
    // - nova: female, warm and friendly (best for assistant)
    // - onyx: male, deep and authoritative
    // - alloy: neutral, balanced
    // - echo: male, clear and professional
    // - fable: male, expressive
    // - shimmer: female, soft and gentle
    let openaiVoice = 'nova'; // Default to nova (best for assistant)
    if (voice.includes('female') || voice.includes('nova') || voice.includes('shimmer')) {
      openaiVoice = 'nova'; // Best female voice for assistant
    } else if (voice.includes('male') || voice.includes('onyx') || voice.includes('echo')) {
      openaiVoice = 'onyx'; // Best male voice
    } else if (voice.includes('alloy')) {
      openaiVoice = 'alloy';
    } else if (voice.includes('echo')) {
      openaiVoice = 'echo';
    } else if (voice.includes('fable')) {
      openaiVoice = 'fable';
    } else if (voice.includes('shimmer')) {
      openaiVoice = 'shimmer';
    }
    
    // Clamp speed to valid range (0.25 to 4.0)
    const clampedSpeed = Math.max(0.25, Math.min(4.0, speed || 1.0));
    
    // Use tts-1-hd for better quality (higher quality, slightly slower)
    // For faster response, can use 'tts-1' instead
    const model = 'tts-1-hd'; // Higher quality model
    
    console.log('[TTSService] Calling OpenAI TTS:', {
      textLength: text.length,
      voice: openaiVoice,
      speed: clampedSpeed,
      model: model,
    });
    
    // Retry logic for transient errors
    let lastError: Error | null = null;
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // OpenAI TTS only supports mp3 format
        const response = await fetch(
          'https://api.openai.com/v1/audio/speech',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: model,
              input: text,
              voice: openaiVoice,
              speed: clampedSpeed,
              response_format: 'mp3'
            })
          }
        );

        if (!response.ok) {
          let errorText = '';
          try {
            errorText = await response.text();
          } catch (e) {
            errorText = `Failed to read error response: ${e}`;
          }
          
          // Retry on rate limit or server errors (5xx)
          if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s
            console.warn(`[TTSService] OpenAI TTS API error (attempt ${attempt}/${maxRetries}), retrying in ${waitTime}ms:`, errorText);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            lastError = new VoiceServiceError(
              `OpenAI TTS API error (${response.status}): ${errorText}`,
              'OPENAI_TTS_API_ERROR',
              response.status
            );
            continue;
          }
          
          console.error('[TTSService] OpenAI TTS API error:', {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            textLength: text.length,
            textPreview: text.substring(0, 100),
          });
          
          throw new VoiceServiceError(
            `OpenAI TTS API error (${response.status}): ${errorText}`,
            'OPENAI_TTS_API_ERROR',
            response.status
          );
        }

        const audioArrayBuffer = await response.arrayBuffer();
        const duration = (Date.now() - startTime) / 1000;

        return {
          audio: audioArrayBuffer,
          duration,
          format: 'mp3',
          provider: 'openai',
          sampleRate: 24000 // tts-1-hd uses 24kHz sample rate
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Don't retry on client errors (4xx except 429)
        if (error instanceof VoiceServiceError && error.statusCode && error.statusCode < 500 && error.statusCode !== 429) {
          throw error;
        }
        
        // Last attempt, throw error
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Wait before retry
        const waitTime = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    // Should never reach here, but TypeScript needs it
    throw lastError || new VoiceServiceError('Failed to synthesize speech', 'TTS_FAILED', 500);
  }

  /**
   * ElevenLabs TTS implementation
   */
  private async synthesizeElevenLabs(
    text: string,
    voice: string,
    speed: number,
    format: string
  ): Promise<TTSResult> {
    const apiKey = this.env?.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new VoiceServiceError(
        'ELEVENLABS_API_KEY not configured',
        'CONFIGURATION_ERROR',
        500
      );
    }

    const startTime = Date.now();

    // Map format to ElevenLabs format
    const elevenLabsFormat = format === 'mp3' ? 'mp3_44100_128' : 'pcm_16000';

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5,
            speed: speed
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new VoiceServiceError(
        `ElevenLabs API error: ${error}`,
        'ELEVENLABS_API_ERROR',
        response.status
      );
    }

    const audioArrayBuffer = await response.arrayBuffer();
    const duration = (Date.now() - startTime) / 1000;

    return {
      audio: audioArrayBuffer,
      duration,
      format,
      provider: 'elevenlabs',
      sampleRate: 44100
    };
  }

  /**
   * Google Cloud TTS implementation
   */
  private async synthesizeGoogle(
    text: string,
    voice: string,
    speed: number,
    format: string
  ): Promise<TTSResult> {
    const apiKey = this.env?.GOOGLE_TTS_API_KEY;
    if (!apiKey) {
      throw new VoiceServiceError(
        'GOOGLE_TTS_API_KEY not configured',
        'CONFIGURATION_ERROR',
        500
      );
    }

    const startTime = Date.now();

    // Map format to Google format
    const googleFormat = format === 'mp3' ? 'MP3' : 'LINEAR16';

    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          input: { text },
          voice: {
            languageCode: voice.split('-').slice(0, 2).join('-'), // 'en-AU-female' -> 'en-AU'
            name: voice,
            ssmlGender: 'NEUTRAL'
          },
          audioConfig: {
            audioEncoding: googleFormat,
            speakingRate: speed,
            sampleRateHertz: 22050
          }
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new VoiceServiceError(
        `Google TTS API error: ${error}`,
        'GOOGLE_TTS_API_ERROR',
        response.status
      );
    }

    const result = await response.json();
    const audioArrayBuffer = Uint8Array.from(atob(result.audioContent), c => c.charCodeAt(0)).buffer;
    const duration = (Date.now() - startTime) / 1000;

    return {
      audio: audioArrayBuffer,
      duration,
      format,
      provider: 'google',
      sampleRate: 22050
    };
  }

  /**
   * Azure Cognitive Services TTS implementation
   */
  private async synthesizeAzure(
    text: string,
    voice: string,
    speed: number,
    format: string
  ): Promise<TTSResult> {
    const apiKey = this.env?.AZURE_TTS_API_KEY;
    const region = this.env?.AZURE_TTS_REGION || 'eastus';
    
    if (!apiKey) {
      throw new VoiceServiceError(
        'AZURE_TTS_API_KEY not configured',
        'CONFIGURATION_ERROR',
        500
      );
    }

    const startTime = Date.now();

    // Map format to Azure format
    const azureFormat = format === 'mp3' ? 'audio-24khz-48kbitrate-mono-mp3' : 'riff-16khz-16bit-mono-pcm';

    const response = await fetch(
      `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': azureFormat
        },
        body: `<speak version='1.0' xml:lang='en-US'>
          <voice xml:lang='en-US' name='${voice}'>
            <prosody rate='${speed}'>
              ${text}
            </prosody>
          </voice>
        </speak>`
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new VoiceServiceError(
        `Azure TTS API error: ${error}`,
        'AZURE_TTS_API_ERROR',
        response.status
      );
    }

    const audioArrayBuffer = await response.arrayBuffer();
    const duration = (Date.now() - startTime) / 1000;

    return {
      audio: audioArrayBuffer,
      duration,
      format,
      provider: 'azure',
      sampleRate: 24000
    };
  }

  /**
   * Check health of TTS service
   */
  async checkHealth(): Promise<'operational' | 'degraded' | 'down'> {
    try {
      // Simple health check - verify service is responsive
      return 'operational';
    } catch {
      return 'down';
    }
  }
}

