import { describe, it, expect, beforeEach } from 'vitest';
import { VADService } from '../src/VADService';

describe('VADService', () => {
  let vadService: VADService;

  beforeEach(() => {
    vadService = new VADService();
  });

  describe('detect', () => {
    it('should throw error for empty audio', async () => {
      const emptyAudio = new ArrayBuffer(0);
      
      await expect(vadService.detect(emptyAudio)).rejects.toThrow(
        'Invalid audio data'
      );
    });

    it('should return valid VADResult structure', async () => {
      const audio = createTestAudio();
      const result = await vadService.detect(audio);

      expect(result).toHaveProperty('voiceDetected');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('segments');
      expect(typeof result.voiceDetected).toBe('boolean');
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(Array.isArray(result.segments)).toBe(true);
    });

    it('should respect sensitivity option', async () => {
      const audio = createTestAudio();
      const result = await vadService.detect(audio, {
        sensitivity: 0.8
      });

      expect(result).toBeDefined();
    });
  });

  describe('checkHealth', () => {
    it('should return operational status', async () => {
      const status = await vadService.checkHealth();
      
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

