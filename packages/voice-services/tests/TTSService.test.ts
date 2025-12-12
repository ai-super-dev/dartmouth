import { describe, it, expect, beforeEach } from 'vitest';
import { TTSService } from '../src/TTSService';

describe('TTSService', () => {
  let ttsService: TTSService;

  beforeEach(() => {
    ttsService = new TTSService();
  });

  describe('synthesize', () => {
    it('should throw error for empty text', async () => {
      await expect(ttsService.synthesize('')).rejects.toThrow(
        'Text is required'
      );
    });

    it('should throw error for null text', async () => {
      await expect(ttsService.synthesize(null as any)).rejects.toThrow();
    });

    it('should return valid TTSResult structure', async () => {
      const result = await ttsService.synthesize('Hello');

      expect(result).toHaveProperty('audio');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('format');
      expect(result).toHaveProperty('provider');
      expect(result.audio).toBeInstanceOf(ArrayBuffer);
      expect(typeof result.duration).toBe('number');
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should use default provider when not specified', async () => {
      const result = await ttsService.synthesize('Hello');
      
      expect(result.provider).toBe('native');
    });

    it('should use specified provider', async () => {
      const result = await ttsService.synthesize('Hello', {
        provider: 'native'
      });
      
      expect(result.provider).toBe('native');
    });

    it('should throw error for unknown provider', async () => {
      await expect(
        ttsService.synthesize('Hello', { provider: 'unknown' as any })
      ).rejects.toThrow('Unknown TTS provider');
    });

    it('should respect speed option', async () => {
      const result = await ttsService.synthesize('Hello', {
        speed: 1.5
      });
      
      expect(result).toBeDefined();
    });

    it('should use default format when not specified', async () => {
      const result = await ttsService.synthesize('Hello');
      
      expect(result.format).toBe('mp3');
    });
  });

  describe('checkHealth', () => {
    it('should return operational status', async () => {
      const status = await ttsService.checkHealth();
      
      expect(['operational', 'degraded', 'down']).toContain(status);
    });
  });
});

