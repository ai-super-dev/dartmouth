import { describe, it, expect, beforeEach } from 'vitest';
import { STTService } from '../src/STTService';

describe('STTService', () => {
  let sttService: STTService;

  beforeEach(() => {
    sttService = new STTService();
  });

  describe('transcribe', () => {
    it('should throw error for empty audio', async () => {
      const emptyAudio = new ArrayBuffer(0);
      
      await expect(sttService.transcribe(emptyAudio)).rejects.toThrow(
        'Invalid audio data'
      );
    });

    it('should throw error for null audio', async () => {
      await expect(sttService.transcribe(null as any)).rejects.toThrow();
    });

    it('should use default provider when not specified', async () => {
      const audio = createTestAudio();
      const result = await sttService.transcribe(audio);
      
      expect(result.provider).toBe('native');
    });

    it('should use specified provider', async () => {
      const audio = createTestAudio();
      const result = await sttService.transcribe(audio, {
        provider: 'native'
      });
      
      expect(result.provider).toBe('native');
    });

    it('should throw error for unknown provider', async () => {
      const audio = createTestAudio();
      
      await expect(
        sttService.transcribe(audio, { provider: 'unknown' as any })
      ).rejects.toThrow('Unknown STT provider');
    });

    it('should return valid STTResult structure', async () => {
      const audio = createTestAudio();
      const result = await sttService.transcribe(audio);

      expect(result).toHaveProperty('transcript');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('language');
      expect(result).toHaveProperty('provider');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should use specified language', async () => {
      const audio = createTestAudio();
      const result = await sttService.transcribe(audio, {
        language: 'en-AU'
      });

      expect(result.language).toBe('en-AU');
    });

    it('should use default language when not specified', async () => {
      const audio = createTestAudio();
      const result = await sttService.transcribe(audio);

      expect(result.language).toBe('en-AU');
    });
  });

  describe('checkHealth', () => {
    it('should return operational status', async () => {
      const status = await sttService.checkHealth();
      
      expect(['operational', 'degraded', 'down']).toContain(status);
    });
  });
});

// Helper function
function createTestAudio(size: number = 1024): ArrayBuffer {
  const buffer = new ArrayBuffer(size);
  new Uint8Array(buffer).fill(128);
  return buffer;
}

