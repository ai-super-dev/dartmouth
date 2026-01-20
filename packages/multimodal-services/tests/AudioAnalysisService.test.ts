import { describe, it, expect, beforeEach } from 'vitest';
import { AudioAnalysisService } from '../src/AudioAnalysisService';
import type { Env } from '../src/types';

describe('AudioAnalysisService', () => {
  let audioService: AudioAnalysisService;
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {};
    audioService = new AudioAnalysisService(mockEnv);
  });

  describe('analyzeAudio', () => {
    it('should return error when no audio URL or base64 provided', async () => {
      const result = await audioService.analyzeAudio({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Audio URL or base64 required');
    });

    it('should analyze audio with default features', async () => {
      const result = await audioService.analyzeAudio({
        audioUrl: 'https://example.com/audio.mp3',
      });

      expect(result.success).toBe(true);
      expect(result.emotion).toBeDefined();
      expect(result.sentiment).toBeDefined();
    });

    it('should analyze audio with specific features', async () => {
      const result = await audioService.analyzeAudio({
        audioUrl: 'https://example.com/audio.mp3',
        features: ['emotion', 'sentiment', 'quality', 'language'],
      });

      expect(result.success).toBe(true);
      expect(result.emotion).toBeDefined();
      expect(result.sentiment).toBeDefined();
      expect(result.quality).toBeDefined();
      expect(result.language).toBeDefined();
    });

    it('should detect emotion', async () => {
      const result = await audioService.analyzeAudio({
        audioUrl: 'https://example.com/audio.mp3',
        features: ['emotion'],
      });

      expect(result.success).toBe(true);
      expect(result.emotion).toBeDefined();
      expect(result.emotion?.primary).toBeDefined();
      expect(result.emotion?.confidence).toBeDefined();
      expect(result.emotion?.all).toBeInstanceOf(Array);
    });

    it('should detect sentiment', async () => {
      const result = await audioService.analyzeAudio({
        audioUrl: 'https://example.com/audio.mp3',
        features: ['sentiment'],
      });

      expect(result.success).toBe(true);
      expect(result.sentiment).toBeDefined();
      expect(['positive', 'neutral', 'negative', 'angry']).toContain(result.sentiment);
    });

    it('should analyze quality', async () => {
      const result = await audioService.analyzeAudio({
        audioUrl: 'https://example.com/audio.mp3',
        features: ['quality'],
      });

      expect(result.success).toBe(true);
      expect(result.quality).toBeDefined();
      expect(result.quality?.clarity).toBeGreaterThanOrEqual(0);
      expect(result.quality?.clarity).toBeLessThanOrEqual(1);
      expect(result.quality?.volumeLevel).toBeGreaterThanOrEqual(0);
      expect(result.quality?.volumeLevel).toBeLessThanOrEqual(1);
      expect(result.quality?.backgroundNoise).toBeGreaterThanOrEqual(0);
      expect(result.quality?.backgroundNoise).toBeLessThanOrEqual(1);
    });

    it('should detect language', async () => {
      const result = await audioService.analyzeAudio({
        audioUrl: 'https://example.com/audio.mp3',
        features: ['language'],
      });

      expect(result.success).toBe(true);
      expect(result.language).toBeDefined();
      expect(result.language?.detected).toBeDefined();
      expect(result.language?.confidence).toBeGreaterThanOrEqual(0);
      expect(result.language?.confidence).toBeLessThanOrEqual(1);
    });
  });
});
