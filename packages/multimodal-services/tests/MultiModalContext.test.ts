import { describe, it, expect, beforeEach } from 'vitest';
import { MultiModalContextService } from '../src/MultiModalContext';
import type { Env } from '../src/types';

describe('MultiModalContextService', () => {
  let contextService: MultiModalContextService;
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      OPENAI_API_KEY: 'test-key',
    };
    contextService = new MultiModalContextService(mockEnv);
  });

  describe('buildContext', () => {
    it('should build context from text only', async () => {
      const result = await contextService.buildContext({
        text: 'Hello, world!',
      });

      expect(result.success).toBe(true);
      expect(result.unifiedContext).toBeDefined();
      expect(result.unifiedContext.summary).toContain('Text:');
      expect(result.unifiedContext.inputs.text).toBeDefined();
    });

    it('should build context from image URL', async () => {
      // Note: This would require mocking VisionService
      const result = await contextService.buildContext({
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(result.success).toBe(true);
      expect(result.unifiedContext).toBeDefined();
    });

    it('should build context from audio URL', async () => {
      // Note: This would require mocking AudioAnalysisService
      const result = await contextService.buildContext({
        audioUrl: 'https://example.com/audio.mp3',
      });

      expect(result.success).toBe(true);
      expect(result.unifiedContext).toBeDefined();
    });

    it('should build context from document URL', async () => {
      // Note: This would require mocking DocumentService
      const result = await contextService.buildContext({
        documentUrl: 'https://example.com/document.txt',
      });

      expect(result.success).toBe(true);
      expect(result.unifiedContext).toBeDefined();
    });

    it('should build context from location', async () => {
      const result = await contextService.buildContext({
        location: {
          latitude: -33.8688,
          longitude: 151.2093,
          address: 'Sydney, Australia',
        },
      });

      expect(result.success).toBe(true);
      expect(result.unifiedContext).toBeDefined();
      expect(result.unifiedContext.inputs.location).toBeDefined();
      expect(result.unifiedContext.summary).toContain('Location:');
    });

    it('should build context from multiple inputs', async () => {
      const result = await contextService.buildContext({
        text: 'What does this sign say?',
        imageUrl: 'https://example.com/sign.jpg',
        location: {
          latitude: -33.8688,
          longitude: 151.2093,
          address: 'Sydney, Australia',
        },
      });

      expect(result.success).toBe(true);
      expect(result.unifiedContext).toBeDefined();
      expect(result.unifiedContext.inputs.text).toBeDefined();
      expect(result.unifiedContext.inputs.location).toBeDefined();
      expect(result.unifiedContext.insights).toBeInstanceOf(Array);
      expect(result.unifiedContext.relevance).toBeGreaterThan(0);
    });

    it('should generate insights from combined inputs', async () => {
      const result = await contextService.buildContext({
        text: 'Hello',
        imageUrl: 'https://example.com/image.jpg',
      });

      expect(result.success).toBe(true);
      expect(result.unifiedContext.insights.length).toBeGreaterThan(0);
    });

    it('should calculate relevance score', async () => {
      const result = await contextService.buildContext({
        text: 'Test',
        imageUrl: 'https://example.com/image.jpg',
        location: {
          latitude: -33.8688,
          longitude: 151.2093,
        },
      });

      expect(result.success).toBe(true);
      expect(result.unifiedContext.relevance).toBeGreaterThanOrEqual(0);
      expect(result.unifiedContext.relevance).toBeLessThanOrEqual(1);
    });

    it('should handle errors gracefully', async () => {
      // Test with invalid input that might cause errors
      const result = await contextService.buildContext({
        imageUrl: 'invalid-url-that-will-fail',
      });

      // Should return a result (may be success: false if error occurs)
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('unifiedContext');
    });
  });
});
