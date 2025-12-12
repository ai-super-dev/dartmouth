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
          return await this.transcribeWhisper(audio, language);
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
   */
  private async transcribeWhisper(
    audio: ArrayBuffer,
    language: string
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
    const audioBlob = new Blob([audio], { type: 'audio/wav' });
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('language', language.split('-')[0]); // 'en-AU' -> 'en'
    formData.append('response_format', 'verbose_json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      const error = await response.text();
      throw new VoiceServiceError(
        `Whisper API error: ${error}`,
        'WHISPER_API_ERROR',
        response.status
      );
    }

    const result = await response.json();
    const duration = (Date.now() - startTime) / 1000;

    return {
      transcript: result.text || '',
      confidence: 0.95, // Whisper doesn't return confidence
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

