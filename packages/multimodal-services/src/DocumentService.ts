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

      // Use OpenAI GPT-4o to extract text from PDF
      // GPT-4o-mini and GPT-4o support file inputs with the correct format
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please extract and transcribe ALL the text content from this PDF document. Return ONLY the extracted text, preserving the original structure and formatting as much as possible. Do not add any commentary or explanation - just the document text.',
                },
                {
                  type: 'file',
                  file: {
                    filename: 'document.pdf',
                    file_data: `data:application/pdf;base64,${pdfBase64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 4096,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('[DocumentService] OpenAI PDF parsing error:', errorText);
        
        // Try alternative approach with image-like handling
        return await this.parsePDFAlternative(request, pdfBase64);
      }

      const data = await openaiResponse.json() as { choices: Array<{ message: { content: string } }> };
      const extractedText = data.choices[0]?.message?.content || '';

      if (!extractedText || extractedText.trim().length === 0) {
        return {
          success: false,
          error: 'No text could be extracted from the PDF. The document may be empty or contain only images.',
        };
      }

      console.log('[DocumentService] PDF parsed successfully, extracted', extractedText.length, 'characters');

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
      console.error('[DocumentService] PDF parse error:', errorMessage);
      return { success: false, error: `PDF parse error: ${errorMessage}` };
    }
  }

  /**
   * Alternative PDF parsing approach - try different methods
   */
  private async parsePDFAlternative(request: DocumentParseRequest, pdfBase64: string): Promise<DocumentParseResult> {
    console.log('[DocumentService] Trying alternative PDF parsing approach');
    
    try {
      // Try with GPT-4o using a simpler prompt that might work with base64 data
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: 'You are a document text extraction assistant. Extract and return only the text content from documents.',
            },
            {
              role: 'user',
              content: `This is a base64 encoded PDF document. Please decode it and extract all text content:\n\n${pdfBase64.substring(0, 50000)}`,
            },
          ],
          max_tokens: 4096,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('[DocumentService] Alternative PDF parsing also failed:', errorText);
        
        // Return a helpful error message
        return {
          success: false,
          error: 'PDF text extraction failed. Please try one of these alternatives:\n' +
                 '• Take a screenshot of the PDF content and upload the image\n' +
                 '• Copy and paste the text content directly into the chat\n' +
                 '• Save the PDF as a text file (.txt) and upload that',
        };
      }

      const data = await openaiResponse.json() as { choices: Array<{ message: { content: string } }> };
      const extractedText = data.choices[0]?.message?.content || '';

      if (!extractedText || extractedText.trim().length === 0) {
        return {
          success: false,
          error: 'Could not extract text from PDF. Please try uploading as an image or text file.',
        };
      }

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
      return { 
        success: false, 
        error: `PDF parsing failed: ${errorMessage}. Please try uploading as an image instead.` 
      };
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

      // Try OpenAI with file input
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please extract and transcribe ALL the text content from this Word document. Return ONLY the extracted text, preserving the original structure and formatting as much as possible.',
                },
                {
                  type: 'file',
                  file: {
                    filename: 'document.docx',
                    file_data: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxBase64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: 4096,
        }),
      });

      if (!openaiResponse.ok) {
        const errorText = await openaiResponse.text();
        console.error('[DocumentService] OpenAI DOCX parsing error:', errorText);
        
        // Return helpful error
        return {
          success: false,
          error: 'Word document parsing failed. Please try one of these alternatives:\n' +
                 '• Save the document as a text file (.txt) and upload that\n' +
                 '• Take a screenshot of the document and upload the image\n' +
                 '• Copy and paste the text content directly into the chat',
        };
      }

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
