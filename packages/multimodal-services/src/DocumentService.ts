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

      // Log incoming request for debugging
      console.log('[DocumentService] Parsing document:', {
        hasUrl: !!request.documentUrl,
        hasBase64: !!request.documentBase64,
        base64Length: request.documentBase64?.length || 0,
        documentType: request.documentType,
        ocrEnabled: request.ocrEnabled,
      });

      // Detect document type - always normalize through detectType to handle MIME types
      const docType = this.detectType(request.documentType || request.documentUrl);
      console.log('[DocumentService] Detected document type:', docType, 'from:', request.documentType || request.documentUrl);

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
      console.error('[DocumentService] Parse error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Parse PDF document using OpenAI GPT-4o
   * Uses the chat completions API with file input capability
   */
  private async parsePDF(request: DocumentParseRequest): Promise<DocumentParseResult> {
    try {
      console.log('[DocumentService] Parsing PDF with OpenAI GPT-4o');

      if (!this.env.OPENAI_API_KEY) {
        return { success: false, error: 'OPENAI_API_KEY not configured for PDF parsing' };
      }

      // Get the PDF content
      let pdfBase64 = request.documentBase64;
      
      if (!pdfBase64 && request.documentUrl) {
        // Fetch the PDF from URL
        const response = await fetch(request.documentUrl);
        if (!response.ok) {
          return { success: false, error: `Failed to fetch PDF: ${response.statusText}` };
        }
        const arrayBuffer = await response.arrayBuffer();
        pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      }

      if (!pdfBase64) {
        return { success: false, error: 'No PDF content provided' };
      }

      // For PDF parsing, we'll use a workaround:
      // Since OpenAI's chat API doesn't directly support PDF files,
      // we'll provide helpful guidance and suggest alternatives
      // In production, you'd use a PDF parsing library or service
      
      // Try to use VisionService if the PDF can be treated as an image
      // (This works for image-based PDFs or single-page PDFs converted to images)
      console.log('[DocumentService] PDF parsing - attempting OCR approach');
      
      // For now, return a helpful error with alternatives
      // In a production environment, you would:
      // 1. Use a PDF parsing library (pdf-parse, pdf.js)
      // 2. Convert PDF pages to images and use VisionService
      // 3. Use an external PDF parsing service
      
      return {
        success: false,
        error: 'PDF parsing requires additional setup. For now, please try:\n' +
               '• Convert PDF pages to images and upload as images (we can extract text via OCR)\n' +
               '• Save the PDF as a text file (.txt) and upload that\n' +
               '• Copy and paste the text content directly into the chat\n\n' +
               'Note: Full PDF parsing will be available in a future update with PDF parsing library integration.',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DocumentService] PDF parse error:', errorMessage);
      return { success: false, error: `PDF parse error: ${errorMessage}` };
    }
  }


  /**
   * Parse DOCX document using OpenAI GPT-4o
   */
  private async parseDOCX(request: DocumentParseRequest): Promise<DocumentParseResult> {
    try {
      console.log('[DocumentService] Parsing DOCX with OpenAI GPT-4o');

      if (!this.env.OPENAI_API_KEY) {
        return { success: false, error: 'OPENAI_API_KEY not configured for DOCX parsing' };
      }

      // Get the DOCX content
      let docxBase64 = request.documentBase64;
      
      if (!docxBase64 && request.documentUrl) {
        const response = await fetch(request.documentUrl);
        if (!response.ok) {
          return { success: false, error: `Failed to fetch DOCX: ${response.statusText}` };
        }
        const arrayBuffer = await response.arrayBuffer();
        docxBase64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      }

      if (!docxBase64) {
        return { success: false, error: 'No DOCX content provided' };
      }

      // For DOCX parsing, we'll provide helpful guidance
      // In production, you'd use a DOCX parsing library (mammoth, docx-parser)
      console.log('[DocumentService] DOCX parsing - attempting extraction');
      
      // Return helpful error with alternatives
      // In a production environment, you would:
      // 1. Use a DOCX parsing library (mammoth, docx-parser)
      // 2. Convert DOCX to images and use VisionService
      // 3. Use an external DOCX parsing service
      
      return {
        success: false,
        error: 'Word document parsing requires additional setup. For now, please try:\n' +
               '• Save the document as a text file (.txt) and upload that\n' +
               '• Take a screenshot of the document and upload the image (we can extract text via OCR)\n' +
               '• Copy and paste the text content directly into the chat\n\n' +
               'Note: Full DOCX parsing will be available in a future update with DOCX parsing library integration.',
      };

      const data = await openaiResponse.json() as { choices: Array<{ message: { content: string } }> };
      const extractedText = data.choices[0]?.message?.content || '';

      if (!extractedText || extractedText.trim().length === 0) {
        return {
          success: false,
          error: 'No text could be extracted from the Word document.',
        };
      }

      console.log('[DocumentService] DOCX parsed successfully, extracted', extractedText.length, 'characters');

      return {
        success: true,
        text: extractedText,
        pages: [{ pageNumber: 1, text: extractedText }],
        metadata: {
          pageCount: 1,
          extractionMethod: 'ocr',
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[DocumentService] DOCX parse error:', errorMessage);
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
   * Detect document type from URL or MIME type
   */
  private detectType(urlOrMimeType?: string): 'pdf' | 'docx' | 'txt' | 'image' {
    if (!urlOrMimeType) return 'txt'; // Default to text
    
    // MIME type mapping (for when documentType is passed from frontend)
    const mimeTypeMap: Record<string, 'pdf' | 'docx' | 'txt' | 'image'> = {
      'application/pdf': 'pdf',
      'application/msword': 'docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'text/plain': 'txt',
      'text/html': 'txt',
      'text/csv': 'txt',
      'image/jpeg': 'image',
      'image/jpg': 'image',
      'image/png': 'image',
      'image/gif': 'image',
      'image/webp': 'image',
    };

    // Check if it's a MIME type first
    if (mimeTypeMap[urlOrMimeType]) {
      return mimeTypeMap[urlOrMimeType];
    }

    // Fall back to extension-based detection for URLs
    const ext = urlOrMimeType.split('.').pop()?.toLowerCase() || '';
    const extTypeMap: Record<string, 'pdf' | 'docx' | 'txt' | 'image'> = {
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
    
    return extTypeMap[ext] || 'txt';
  }
}
