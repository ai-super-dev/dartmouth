/**
 * VoiceService - Main orchestrator for all voice operations
 * 
 * This is the primary entry point for voice functionality.
 * It coordinates all sub-services and provides a unified API.
 * 
 * @example
 * ```typescript
 * const voiceService = new VoiceService(env);
 * 
 * // Speech to text
 * const transcript = await voiceService.speechToText(audioBuffer, {
 *   language: 'en-AU',
 *   provider: 'whisper'
 * });
 * 
 * // Text to speech
 * const audio = await voiceService.textToSpeech('Hello!', {
 *   voice: 'en-AU-female',
 *   speed: 1.0
 * });
 * ```
 */

import { STTService } from './STTService';
import { TTSService } from './TTSService';
import { StreamingService } from './StreamingService';
import { VADService } from './VADService';
import { InterruptHandler } from './InterruptHandler';
import type {
  STTOptions, STTResult,
  TTSOptions, TTSResult,
  StreamOptions, StreamResult,
  VADOptions, VADResult,
  InterruptOptions, InterruptResult,
  HealthResult
} from './types';

export class VoiceService {
  private sttService: STTService;
  private ttsService: TTSService;
  private streamingService: StreamingService;
  private vadService: VADService;
  private interruptHandler: InterruptHandler;

  constructor(env?: Record<string, string>) {
    this.sttService = new STTService(env);
    this.ttsService = new TTSService(env);
    this.streamingService = new StreamingService();
    this.vadService = new VADService();
    this.interruptHandler = new InterruptHandler();
  }

  /**
   * Convert speech to text
   * @param audio - Audio buffer to transcribe
   * @param options - STT options (language, provider)
   * @returns Transcript with confidence score
   */
  async speechToText(
    audio: ArrayBuffer,
    options: STTOptions = {}
  ): Promise<STTResult> {
    return await this.sttService.transcribe(audio, options);
  }

  /**
   * Convert text to speech
   * @param text - Text to convert
   * @param options - TTS options (voice, speed, pitch)
   * @returns Audio buffer
   */
  async textToSpeech(
    text: string,
    options: TTSOptions = {}
  ): Promise<TTSResult> {
    return await this.ttsService.synthesize(text, options);
  }

  /**
   * Manage audio streaming session
   * @param options - Stream options (sessionId, action)
   * @returns Stream status
   */
  async manageStream(options: StreamOptions): Promise<StreamResult> {
    return await this.streamingService.manage(options);
  }

  /**
   * Detect voice activity in audio
   * @param audio - Audio buffer to analyze
   * @param options - VAD options (sensitivity)
   * @returns Voice detection result
   */
  async detectVoiceActivity(
    audio: ArrayBuffer,
    options: VADOptions = {}
  ): Promise<VADResult> {
    return await this.vadService.detect(audio, options);
  }

  /**
   * Handle interrupts
   * @param options - Interrupt options (sessionId, action)
   * @returns Interrupt result
   */
  async handleInterrupt(options: InterruptOptions): Promise<InterruptResult> {
    return await this.interruptHandler.handle(options);
  }

  /**
   * Check health of all services
   * @returns Health status of all services
   */
  async checkHealth(): Promise<HealthResult> {
    const [stt, tts, streaming, vad] = await Promise.all([
      this.sttService.checkHealth(),
      this.ttsService.checkHealth(),
      this.streamingService.checkHealth(),
      this.vadService.checkHealth()
    ]);

    const allHealthy = stt === 'operational' && 
                       tts === 'operational' && 
                       streaming === 'operational' && 
                       vad === 'operational';

    const anyDown = stt === 'down' || 
                    tts === 'down' || 
                    streaming === 'down' || 
                    vad === 'down';

    return {
      status: allHealthy ? 'healthy' : (anyDown ? 'unhealthy' : 'degraded'),
      services: { stt, tts, streaming, vad },
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }
}

