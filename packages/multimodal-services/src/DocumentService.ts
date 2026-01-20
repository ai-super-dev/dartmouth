/**
 * Document Service
 * 
 * Parses and extracts text from:
 * - PDFs
 * - Word documents (DOCX)
 * - Text files (TXT)
 * - Images with text (OCR)
 */

import type { Env, DocumentParseRequest, DocumentParseResult } from './types';
import { VisionService } from './VisionService';

export class DocumentService {
  constructor(private env: Env) {}

  /**
   * Parse a document and extract text
   */
  async parseDocument(request: DocumentParseRequest): Promise<DocumentParseResult> {
    try {
      // Validate input
      if (!request.documentUrl && !request.documentBase64) {
        return { success: false, error: 'Document URL or base64 required' };
      }

      // Detect document type
      const docType = request.documentType || this.detectType(request.documentUrl);

      // Route to appropriate parser
      switch (docType) {
        case 'pdf':
          return await this.parsePDF(request);
        case 'docx':
          return await this.parseDOCX(request);
        case 'txt':
          return await this.parseTXT(request);
        case 'image':
          return await this.parseImage(request);
        default:
          return { success: false, error: `Unsupported document type: ${docType}` };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Document parse error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Parse PDF document
   * Note: Full PDF parsing requires a library like pdf-parse or pdf.js
   * For Cloudflare Workers, we may need to use an external service or WASM
   */
  private async parsePDF(request: DocumentParseRequest): Promise<DocumentParseResult> {
    try {
      // TODO: Implement actual PDF parsing
      // Options:
      // 1. Use pdf-parse library (requires Node.js environment)
      // 2. Use Cloudflare Workers with pdf.js WASM
      // 3. Use external API service
      // 4. Use OpenAI vision API for PDF pages as images

      // For now, return a placeholder that indicates PDF parsing needs implementation
      return {
        success: false,
        error: 'PDF parsing not yet implemented. Please use an external PDF parsing service or convert PDF to images.',
        metadata: {
          pageCount: 0,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `PDF parse error: ${errorMessage}` };
    }
  }

  /**
   * Parse DOCX document
   * Note: Requires mammoth or similar library
   */
  private async parseDOCX(request: DocumentParseRequest): Promise<DocumentParseResult> {
    try {
      // TODO: Implement DOCX parsing using mammoth or similar
      // For Cloudflare Workers, may need WASM or external service
      
      return {
        success: false,
        error: 'DOCX parsing not yet implemented. Please use an external DOCX parsing service.',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `DOCX parse error: ${errorMessage}` };
    }
  }

  /**
   * Parse TXT document
   */
  private async parseTXT(request: DocumentParseRequest): Promise<DocumentParseResult> {
    try {
      let text: string;

      if (request.documentBase64) {
        // Decode base64
        const buffer = Uint8Array.from(atob(request.documentBase64), c => c.charCodeAt(0));
        text = new TextDecoder('utf-8').decode(buffer);
      } else if (request.documentUrl) {
        const response = await fetch(request.documentUrl);
        if (!response.ok) {
          return { success: false, error: `Failed to fetch document: ${response.statusText}` };
        }
        text = await response.text();
      } else {
        return { success: false, error: 'Document URL or base64 required' };
      }

      return {
        success: true,
        text,
        pages: [{ pageNumber: 1, text }],
        metadata: {
          pageCount: 1,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `TXT parse error: ${errorMessage}` };
    }
  }

  /**
   * Parse image (OCR) using VisionService
   */
  private async parseImage(request: DocumentParseRequest): Promise<DocumentParseResult> {
    try {
      const visionService = new VisionService(this.env);
      
      const result = await visionService.analyzeImage({
        imageUrl: request.documentUrl,
        imageBase64: request.documentBase64,
        features: ['text'],
      });

      if (result.success && result.text) {
        return {
          success: true,
          text: result.text,
          pages: [{ pageNumber: 1, text: result.text }],
          metadata: {
            pageCount: 1,
          },
        };
      }

      return { 
        success: false, 
        error: result.error || 'OCR failed - no text detected in image' 
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: `Image OCR error: ${errorMessage}` };
    }
  }

  /**
   * Detect document type from URL
   */
  private detectType(url?: string): 'pdf' | 'docx' | 'txt' | 'image' {
    if (!url) return 'txt'; // Default to text
    
    const ext = url.split('.').pop()?.toLowerCase() || '';
    const typeMap: Record<string, 'pdf' | 'docx' | 'txt' | 'image'> = {
      pdf: 'pdf',
      docx: 'docx',
      doc: 'docx',
      txt: 'txt',
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      webp: 'image',
    };
    
    return typeMap[ext] || 'txt';
  }
}
