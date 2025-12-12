import { describe, it, expect, beforeEach } from 'vitest';
import { VoiceService } from '../src/VoiceService';

describe('VoiceService', () => {
  let voiceService: VoiceService;

  beforeEach(() => {
    voiceService = new VoiceService();
  });

  describe('speechToText', () => {
    it('should transcribe audio', async () => {
      const audio = createTestAudio();
      const result = await voiceService.speechToText(audio);

      expect(result).toHaveProperty('transcript');
      expect(result).toHaveProperty('provider');
    });
  });

  describe('textToSpeech', () => {
    it('should synthesize text', async () => {
      const result = await voiceService.textToSpeech('Hello');

      expect(result).toHaveProperty('audio');
      expect(result).toHaveProperty('provider');
    });
  });

  describe('manageStream', () => {
    it('should manage stream', async () => {
      const result = await voiceService.manageStream({
        sessionId: 'test-session',
        action: 'start'
      });

      expect(result.status).toBe('active');
    });
  });

  describe('detectVoiceActivity', () => {
    it('should detect voice activity', async () => {
      const audio = createTestAudio();
      const result = await voiceService.detectVoiceActivity(audio);

      expect(result).toHaveProperty('voiceDetected');
      expect(result).toHaveProperty('confidence');
    });
  });

  describe('handleInterrupt', () => {
    it('should handle interrupt', async () => {
      const result = await voiceService.handleInterrupt({
        sessionId: 'test-session',
        action: 'interrupt'
      });

      expect(result.status).toBe('interrupted');
    });
  });

  describe('checkHealth', () => {
    it('should check health of all services', async () => {
      const result = await voiceService.checkHealth();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('services');
      expect(result.services).toHaveProperty('stt');
      expect(result.services).toHaveProperty('tts');
      expect(result.services).toHaveProperty('streaming');
      expect(result.services).toHaveProperty('vad');
    });
  });
});

// Helper function
function createTestAudio(size: number = 1024): ArrayBuffer {
  const buffer = new ArrayBuffer(size);
  new Uint8Array(buffer).fill(128);
  return buffer;
}

