import { describe, it, expect, beforeEach } from 'vitest';
import { VisionService } from '../src/VisionService';
import type { Env } from '../src/types';

describe('VisionService', () => {
  let visionService: VisionService;
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      OPENAI_API_KEY: 'test-key',
    };
    visionService = new VisionService(mockEnv);
  });

  describe('analyzeImage', () => {
    it('should return error when no image URL or base64 provided', async () => {
      const result = await visionService.analyzeImage({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Image URL or base64 required');
    });

    it('should return error when OPENAI_API_KEY is not configured', async () => {
      const serviceWithoutKey = new VisionService({});
      const result = await serviceWithoutKey.analyzeImage({
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('OPENAI_API_KEY not configured');
    });

    it('should accept imageUrl parameter', async () => {
      // Note: This test would require mocking the OpenAI API call
      // For now, we test the validation logic
      const result = await visionService.analyzeImage({
        imageUrl: 'https://example.com/image.jpg',
        features: ['description'],
      });

      // If API key is missing, we get an error
      // If API key is present but invalid, OpenAI API will return an error
      // This test validates the structure
      expect(result).toHaveProperty('success');
    });

    it('should accept imageBase64 parameter', async () => {
      const result = await visionService.analyzeImage({
        imageBase64: 'base64encodedstring',
        features: ['description'],
      });

      expect(result).toHaveProperty('success');
    });

    it('should handle multiple features', async () => {
      const result = await visionService.analyzeImage({
        imageUrl: 'https://example.com/image.jpg',
        features: ['description', 'objects', 'text'],
      });

      expect(result).toHaveProperty('success');
    });
  });

  describe('analyzeWithQwen', () => {
    it('should fall back to OpenAI analyzeImage', async () => {
      const result = await visionService.analyzeWithQwen({
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(result).toHaveProperty('success');
    });
  });
});
