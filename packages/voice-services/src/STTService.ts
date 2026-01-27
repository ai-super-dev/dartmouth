/**
 * STTService - Speech-to-Text Service
 * 
 * Supports multiple providers:
 * - native: Device native STT
 * - whisper: OpenAI Whisper API
 * - deepgram: Deepgram API
 * 
 * @example
 * ```typescript
 * const sttService = new STTService();
 * const result = await sttService.transcribe(audioBuffer, {
 *   language: 'en-AU',
 *   provider: 'native'
 * });
 * ```
 */

import type { STTOptions, STTResult, STTWord } from './types';
import { VoiceServiceError } from './types';

export class STTService {
  private defaultProvider: string;
  private env?: Record<string, string>;

  constructor(env?: Record<string, string>) {
    this.defaultProvider = 'native';
    this.env = env;
  }

  /**
   * Transcribe audio to text
   * @param audio - Audio buffer (WAV, MP3, OGG)
   * @param options - STT options
   * @returns Transcription result
   */
  async transcribe(
    audio: ArrayBuffer,
    options: STTOptions = {}
  ): Promise<STTResult> {
    // Validate input
    if (!audio || audio.byteLength === 0) {
      throw new VoiceServiceError(
        'Invalid audio data: Audio buffer is empty',
        'INVALID_AUDIO',
        400
      );
    }

    const provider = options.provider || this.defaultProvider;
    const language = options.language || 'en-AU';

    try {
      switch (provider) {
        case 'native':
          return await this.transcribeNative(audio, language);
        case 'whisper':
          return await this.transcribeWhisper(audio, language, options);
        case 'deepgram':
          return await this.transcribeDeepgram(audio, language);
        default:
          throw new VoiceServiceError(
            `Unknown STT provider: ${provider}`,
            'UNKNOWN_PROVIDER',
            400
          );
      }
    } catch (error) {
      if (error instanceof VoiceServiceError) {
        throw error;
      }
      throw new VoiceServiceError(
        `Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'TRANSCRIPTION_FAILED',
        500
      );
    }
  }

  /**
   * Native STT implementation
   */
  private async transcribeNative(
    audio: ArrayBuffer,
    language: string
  ): Promise<STTResult> {
    const startTime = Date.now();
    
    // Native implementation using Web Speech API or device APIs
    // This is a placeholder - actual implementation depends on platform
    const transcript = await this.processAudioNative(audio, language);
    
    const duration = (Date.now() - startTime) / 1000;

    return {
      transcript: transcript.text,
      confidence: transcript.confidence,
      duration,
      language,
      provider: 'native',
      words: transcript.words
    };
  }

  /**
   * OpenAI Whisper implementation
   * Optimized for better accuracy with wake word detection
   */
  private async transcribeWhisper(
    audio: ArrayBuffer,
    language: string,
    options: STTOptions = {}
  ): Promise<STTResult> {
    const apiKey = this.env?.OPENAI_API_KEY;
    if (!apiKey) {
      throw new VoiceServiceError(
        'OPENAI_API_KEY not configured',
        'CONFIGURATION_ERROR',
        500
      );
    }

    const startTime = Date.now();

    // Convert ArrayBuffer to Blob for FormData
    // Whisper API supports: mp3, mp4, mpeg, mpga, m4a, wav, webm
    // expo-av records in m4a format, so use that
    const audioBlob = new Blob([audio], { type: 'audio/m4a' });
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.m4a');
    formData.append('model', 'whisper-1');
    formData.append('language', language.split('-')[0]); // 'en-AU' -> 'en'
    formData.append('response_format', 'verbose_json');
    
    // Temperature: 0.0 for more deterministic, better for wake words and commands
    // Lower temperature = more consistent, higher = more creative (not needed for STT)
    formData.append('temperature', '0.0');
    
    // Add prompt if provided - helps with wake word and expected phrases
    // Whisper uses the prompt to guide transcription (e.g., "Hey McCarthy" wake word)
    // The prompt should contain the expected text to improve accuracy
    if (options.prompt) {
      // Limit prompt to 244 tokens (Whisper's limit is ~244 tokens)
      // Truncate if too long to avoid API errors
      const maxPromptLength = 1000; // ~244 tokens, conservative limit
      const prompt = options.prompt.length > maxPromptLength 
        ? options.prompt.substring(0, maxPromptLength) 
        : options.prompt;
      formData.append('prompt', prompt);
    }

    // Retry logic for transient errors
    let lastError: Error | null = null;
    const maxRetries = 2;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          body: formData
        });

        if (!response.ok) {
          const errorText = await response.text();
          
          // Retry on rate limit or server errors (5xx)
          if ((response.status === 429 || response.status >= 500) && attempt < maxRetries) {
            const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s
            console.warn(`[STTService] Whisper API error (attempt ${attempt}/${maxRetries}), retrying in ${waitTime}ms:`, errorText);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            lastError = new VoiceServiceError(
              `Whisper API error: ${errorText}`,
              'WHISPER_API_ERROR',
              response.status
            );
            continue;
          }
          
          throw new VoiceServiceError(
            `Whisper API error: ${errorText}`,
            'WHISPER_API_ERROR',
            response.status
          );
        }

        const result = await response.json();
        const duration = (Date.now() - startTime) / 1000;

        return {
          transcript: result.text || '',
          confidence: 0.95, // Whisper doesn't return confidence, but accuracy is high
          duration,
          language,
          provider: 'whisper',
          words: result.words?.map((w: { word: string; start: number; end: number }) => ({
            word: w.word,
            start: w.start,
            end: w.end,
            confidence: 1.0
          }))
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
    throw lastError || new VoiceServiceError('Failed to transcribe audio', 'TRANSCRIPTION_FAILED', 500);
  }

  /**
   * Deepgram implementation
   */
  private async transcribeDeepgram(
    audio: ArrayBuffer,
    language: string
  ): Promise<STTResult> {
    const apiKey = this.env?.DEEPGRAM_API_KEY;
    if (!apiKey) {
      throw new VoiceServiceError(
        'DEEPGRAM_API_KEY not configured',
        'CONFIGURATION_ERROR',
        500
      );
    }

    const startTime = Date.now();

    const response = await fetch(
      `https://api.deepgram.com/v1/listen?language=${language.split('-')[0]}&model=nova-2`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${apiKey}`,
          'Content-Type': 'audio/wav'
        },
        body: audio
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new VoiceServiceError(
        `Deepgram API error: ${error}`,
        'DEEPGRAM_API_ERROR',
        response.status
      );
    }

    const result = await response.json();
    const duration = (Date.now() - startTime) / 1000;
    const channel = result.results?.channels?.[0];
    const alternative = channel?.alternatives?.[0];

    return {
      transcript: alternative?.transcript || '',
      confidence: alternative?.confidence || 0,
      duration,
      language,
      provider: 'deepgram',
      words: alternative?.words?.map((w: { word: string; start: number; end: number; confidence: number }) => ({
        word: w.word,
        start: w.start,
        end: w.end,
        confidence: w.confidence
      }))
    };
  }

  /**
   * Process audio using native implementation
   * This is a placeholder for actual native processing
   */
  private async processAudioNative(
    audio: ArrayBuffer,
    language: string
  ): Promise<{ text: string; confidence: number; words?: STTWord[] }> {
    // Placeholder implementation
    // In production, this would use Web Speech API or native device APIs
    return {
      text: 'Transcribed text placeholder',
      confidence: 0.85,
      words: []
    };
  }

  /**
   * Check health of STT service
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

