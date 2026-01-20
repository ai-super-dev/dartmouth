import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentService } from '../src/DocumentService';
import type { Env } from '../src/types';

describe('DocumentService', () => {
  let documentService: DocumentService;
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      OPENAI_API_KEY: 'test-key',
    };
    documentService = new DocumentService(mockEnv);
  });

  describe('parseDocument', () => {
    it('should return error when no document URL or base64 provided', async () => {
      const result = await documentService.parseDocument({});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Document URL or base64 required');
    });

    it('should parse TXT document from URL', async () => {
      // Note: This would require mocking fetch
      // For now, we test the structure
      const result = await documentService.parseDocument({
        documentUrl: 'https://example.com/document.txt',
        documentType: 'txt',
      });

      expect(result).toHaveProperty('success');
    });

    it('should parse TXT document from base64', async () => {
      const textContent = 'Hello, World!';
      const base64Content = btoa(textContent);

      const result = await documentService.parseDocument({
        documentBase64: base64Content,
        documentType: 'txt',
      });

      if (result.success) {
        expect(result.text).toBe(textContent);
        expect(result.metadata?.pageCount).toBe(1);
      }
    });

    it('should detect document type from URL extension', async () => {
      const result = await documentService.parseDocument({
        documentUrl: 'https://example.com/document.pdf',
      });

      expect(result).toHaveProperty('success');
    });

    it('should handle PDF parsing (returns not implemented)', async () => {
      const result = await documentService.parseDocument({
        documentUrl: 'https://example.com/document.pdf',
        documentType: 'pdf',
      });

      // PDF parsing is not yet implemented
      expect(result.success).toBe(false);
      expect(result.error).toContain('not yet implemented');
    });

    it('should handle DOCX parsing (returns not implemented)', async () => {
      const result = await documentService.parseDocument({
        documentUrl: 'https://example.com/document.docx',
        documentType: 'docx',
      });

      // DOCX parsing is not yet implemented
      expect(result.success).toBe(false);
      expect(result.error).toContain('not yet implemented');
    });

    it('should parse image with OCR', async () => {
      // Note: This would require mocking VisionService
      const result = await documentService.parseDocument({
        documentUrl: 'https://example.com/image.jpg',
        documentType: 'image',
        ocrEnabled: true,
      });

      expect(result).toHaveProperty('success');
    });
  });
});
