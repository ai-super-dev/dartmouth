/**
 * Voice Services Type Definitions
 * 
 * These types are used across all voice services and are designed
 * to be generic enough for any agent to use.
 */

// ============================================
// STT (Speech-to-Text) Types
// ============================================

export type STTProvider = 'native' | 'whisper' | 'deepgram';

export interface STTOptions {
  /** Language code (e.g., 'en-AU', 'en-US') */
  language?: string;
  /** STT provider to use */
  provider?: STTProvider;
  /** Audio sample rate in Hz */
  sampleRate?: number;
  /** Audio encoding format */
  encoding?: 'wav' | 'mp3' | 'ogg' | 'webm';
  /** Enable word-level timestamps */
  enableWordTimestamps?: boolean;
  /** Enable punctuation */
  enablePunctuation?: boolean;
}

export interface STTWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface STTResult {
  /** Transcribed text */
  transcript: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Processing duration in seconds */
  duration: number;
  /** Language detected/used */
  language: string;
  /** Provider used */
  provider: string;
  /** Word-level details (if enabled) */
  words?: STTWord[];
}

// ============================================
// TTS (Text-to-Speech) Types
// ============================================

export type TTSProvider = 'native' | 'elevenlabs' | 'google' | 'azure';

export interface TTSOptions {
  /** Voice ID or name */
  voice?: string;
  /** TTS provider to use */
  provider?: TTSProvider;
  /** Speech speed (0.5 - 2.0, default 1.0) */
  speed?: number;
  /** Speech pitch (-20 to 20, default 0) */
  pitch?: number;
  /** Output audio format */
  format?: 'mp3' | 'wav' | 'ogg';
  /** Sample rate for output */
  sampleRate?: number;
}

export interface TTSResult {
  /** Audio data as ArrayBuffer */
  audio: ArrayBuffer;
  /** Audio duration in seconds */
  duration: number;
  /** Audio format */
  format: string;
  /** Provider used */
  provider: string;
  /** Sample rate */
  sampleRate?: number;
}

// ============================================
// Streaming Types
// ============================================

export type StreamAction = 'start' | 'stop' | 'pause' | 'resume';
export type StreamStatus = 'active' | 'paused' | 'stopped' | 'error';

export interface StreamOptions {
  /** Unique session identifier */
  sessionId: string;
  /** Action to perform */
  action: StreamAction;
  /** Audio sample rate */
  sampleRate?: number;
  /** Number of audio channels */
  channels?: number;
  /** Enable echo cancellation */
  echoCancellation?: boolean;
  /** Enable noise suppression */
  noiseSuppression?: boolean;
}

export interface StreamResult {
  /** Unique stream identifier */
  streamId: string;
  /** Current stream status */
  status: StreamStatus;
  /** WebRTC connection URL (if applicable) */
  webrtcUrl?: string;
  /** Session identifier */
  sessionId: string;
  /** Timestamp */
  timestamp: string;
}

// ============================================
// VAD (Voice Activity Detection) Types
// ============================================

export interface VADOptions {
  /** Detection sensitivity (0.0 - 1.0) */
  sensitivity?: number;
  /** Minimum speech duration in ms */
  minSpeechDuration?: number;
  /** Maximum silence duration before end of speech in ms */
  maxSilenceDuration?: number;
  /** Frame size in samples */
  frameSize?: number;
}

export interface VADSegment {
  /** Start time in seconds */
  start: number;
  /** End time in seconds */
  end: number;
}

export interface VADResult {
  /** Whether voice was detected */
  voiceDetected: boolean;
  /** Detection confidence (0-1) */
  confidence: number;
  /** Voice segments found */
  segments: VADSegment[];
  /** Total speech duration in seconds */
  totalSpeechDuration?: number;
}

// ============================================
// Interrupt Types
// ============================================

export type InterruptAction = 'interrupt' | 'resume' | 'cancel';
export type InterruptStatus = 'interrupted' | 'resumed' | 'cancelled' | 'error';

export interface InterruptOptions {
  /** Session to interrupt */
  sessionId: string;
  /** Action to perform */
  action: InterruptAction;
  /** Optional reason for interrupt */
  reason?: string;
}

export interface InterruptResult {
  /** Result status */
  status: InterruptStatus;
  /** Session identifier */
  sessionId: string;
  /** Timestamp */
  timestamp: string;
  /** Previous state before interrupt */
  previousState?: string;
}

// ============================================
// Health Check Types
// ============================================

export type ServiceHealth = 'operational' | 'degraded' | 'down';

export interface HealthResult {
  /** Overall health status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Individual service health */
  services: {
    stt: ServiceHealth;
    tts: ServiceHealth;
    streaming: ServiceHealth;
    vad: ServiceHealth;
  };
  /** Health check timestamp */
  timestamp: string;
  /** Version information */
  version?: string;
}

// ============================================
// Error Types
// ============================================

export class VoiceServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'VoiceServiceError';
  }
}

