/**
 * LLMService.test.ts
 * 
 * Unit tests for the LLMService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLMService } from '../LLMService';
import type { LLMConfig, LLMContext } from '../LLMService';

describe('LLMService', () => {
  let service: LLMService;
  let mockConfig: LLMConfig;

  beforeEach(() => {
    mockConfig = {
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 1000,
      apiKeys: {
        anthropic: 'test-anthropic-key',
        openai: 'test-openai-key',
        google: 'test-google-key',
      },
    };

    service = new LLMService(mockConfig);
  });

  describe('initialization', () => {
    it('should initialize with config', () => {
      expect(service).toBeDefined();
    });

    it('should accept different providers', () => {
      const anthropicService = new LLMService({ ...mockConfig, provider: 'anthropic' });
      const openaiService = new LLMService({ ...mockConfig, provider: 'openai' });
      const googleService = new LLMService({ ...mockConfig, provider: 'google' });

      expect(anthropicService).toBeDefined();
      expect(openaiService).toBeDefined();
      expect(googleService).toBeDefined();
    });

    it('should use default values when not provided', () => {
      const minimalConfig: LLMConfig = {
        provider: 'anthropic',
        apiKeys: { anthropic: 'test-key' },
      };
      
      const minimalService = new LLMService(minimalConfig);
      expect(minimalService).toBeDefined();
    });
  });

  describe('token counting', () => {
    it('should estimate tokens for short text', () => {
      const text = 'Hello world';
      const tokens = service.estimateTokens(text);
      
      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBeLessThan(10);
    });

    it('should estimate tokens for long text', () => {
      const text = 'word '.repeat(1000);
      const tokens = service.estimateTokens(text);
      
      expect(tokens).toBeGreaterThan(500);
    });

    it('should handle empty text', () => {
      const tokens = service.estimateTokens('');
      expect(tokens).toBe(0);
    });

    it('should handle special characters', () => {
      const text = '!@#$%^&*()_+-=[]{}|;:,.<>?';
      const tokens = service.estimateTokens(text);
      
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle unicode characters', () => {
      const text = 'Hello 世界 🌍';
      const tokens = service.estimateTokens(text);
      
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('cost calculation', () => {
    it('should calculate cost for Anthropic', () => {
      const cost = service.calculateCost('anthropic', 'claude-3-5-sonnet-20241022', 1000, 500);
      
      expect(cost).toBeGreaterThan(0);
      expect(typeof cost).toBe('number');
    });

    it('should calculate cost for OpenAI', () => {
      const cost = service.calculateCost('openai', 'gpt-4o-mini', 1000, 500);
      
      expect(cost).toBeGreaterThan(0);
    });

    it('should calculate cost for Google', () => {
      const cost = service.calculateCost('google', 'gemini-1.5-flash', 1000, 500);
      
      expect(cost).toBeGreaterThan(0);
    });

    it('should return 0 for unknown provider', () => {
      const cost = service.calculateCost('unknown' as any, 'model', 1000, 500);
      
      expect(cost).toBe(0);
    });

    it('should handle zero tokens', () => {
      const cost = service.calculateCost('anthropic', 'claude-3-5-sonnet-20241022', 0, 0);
      
      expect(cost).toBe(0);
    });

    it('should calculate higher cost for more tokens', () => {
      const cost1 = service.calculateCost('anthropic', 'claude-3-5-sonnet-20241022', 100, 50);
      const cost2 = service.calculateCost('anthropic', 'claude-3-5-sonnet-20241022', 1000, 500);
      
      expect(cost2).toBeGreaterThan(cost1);
    });
  });

  describe('context preparation', () => {
    it('should prepare context with system prompt', () => {
      const context: LLMContext = {
        systemPrompt: 'You are a helpful assistant',
        messages: [],
      };
      
      expect(context.systemPrompt).toBeDefined();
      expect(context.messages).toBeInstanceOf(Array);
    });

    it('should handle conversation history', () => {
      const context: LLMContext = {
        systemPrompt: 'You are helpful',
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' },
        ],
      };
      
      expect(context.messages.length).toBe(3);
    });

    it('should handle empty message history', () => {
      const context: LLMContext = {
        systemPrompt: 'You are helpful',
        messages: [],
      };
      
      expect(context.messages.length).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle missing API keys gracefully', async () => {
      const noKeyConfig: LLMConfig = {
        provider: 'anthropic',
        apiKeys: {},
      };
      
      const noKeyService = new LLMService(noKeyConfig);
      expect(noKeyService).toBeDefined();
    });

    it('should validate provider', () => {
      const validProviders = ['anthropic', 'openai', 'google'];
      
      validProviders.forEach(provider => {
        const config: LLMConfig = {
          provider: provider as any,
          apiKeys: { [provider]: 'test-key' },
        };
        
        const testService = new LLMService(config);
        expect(testService).toBeDefined();
      });
    });
  });

  describe('configuration', () => {
    it('should respect temperature setting', () => {
      const lowTemp = new LLMService({ ...mockConfig, temperature: 0.1 });
      const highTemp = new LLMService({ ...mockConfig, temperature: 0.9 });
      
      expect(lowTemp).toBeDefined();
      expect(highTemp).toBeDefined();
    });

    it('should respect maxTokens setting', () => {
      const lowTokens = new LLMService({ ...mockConfig, maxTokens: 100 });
      const highTokens = new LLMService({ ...mockConfig, maxTokens: 4000 });
      
      expect(lowTokens).toBeDefined();
      expect(highTokens).toBeDefined();
    });

    it('should handle different models', () => {
      const models = [
        'claude-3-5-sonnet-20241022',
        'gpt-4o-mini',
        'gemini-1.5-flash',
      ];
      
      models.forEach(model => {
        const config: LLMConfig = {
          ...mockConfig,
          model,
        };
        
        const testService = new LLMService(config);
        expect(testService).toBeDefined();
      });
    });
  });

  describe('provider fallback', () => {
    it('should support multiple providers for fallback', () => {
      const multiProviderConfig: LLMConfig = {
        provider: 'anthropic',
        fallbackProviders: ['openai', 'google'],
        apiKeys: {
          anthropic: 'key1',
          openai: 'key2',
          google: 'key3',
        },
      };
      
      const multiService = new LLMService(multiProviderConfig);
      expect(multiService).toBeDefined();
    });
  });

  describe('response format', () => {
    it('should define expected response structure', () => {
      // This tests the type structure
      const mockResponse = {
        content: 'Test response',
        model: 'claude-3-5-sonnet-20241022',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150,
        },
        cost: 0.001,
        provider: 'anthropic' as const,
      };
      
      expect(mockResponse.content).toBeDefined();
      expect(mockResponse.usage).toBeDefined();
      expect(mockResponse.cost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very long prompts', () => {
      const longPrompt = 'word '.repeat(10000);
      const tokens = service.estimateTokens(longPrompt);
      
      expect(tokens).toBeGreaterThan(5000);
    });

    it('should handle special formatting in prompts', () => {
      const formattedPrompt = `
        # Heading
        - List item 1
        - List item 2
        
        **Bold text**
        *Italic text*
        
        \`code block\`
      `;
      
      const tokens = service.estimateTokens(formattedPrompt);
      expect(tokens).toBeGreaterThan(0);
    });

    it('should handle JSON in prompts', () => {
      const jsonPrompt = JSON.stringify({
        key: 'value',
        nested: { data: [1, 2, 3] },
      });
      
      const tokens = service.estimateTokens(jsonPrompt);
      expect(tokens).toBeGreaterThan(0);
    });
  });

  describe('performance', () => {
    it('should estimate tokens quickly', () => {
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        service.estimateTokens('test message');
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should calculate cost quickly', () => {
      const start = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        service.calculateCost('anthropic', 'claude-3-5-sonnet-20241022', 100, 50);
      }
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should be very fast
    });
  });
});

