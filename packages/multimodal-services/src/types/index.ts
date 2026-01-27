/**
 * Multi-Modal Services Types
 */

export interface Env {
  OPENAI_API_KEY?: string;
  [key: string]: unknown;
}

export interface VisionAnalysisRequest {
  imageUrl?: string;
  imageBase64?: string;
  features?: ('description' | 'objects' | 'text' | 'faces' | 'labels')[];
  maxResults?: number;
}

export interface VisionAnalysisResult {
  success: boolean;
  description?: string;
  objects?: Array<{ name: string; confidence: number }>;
  text?: string;
  faces?: Array<{ age?: number; emotion?: string; confidence: number }>;
  labels?: Array<{ name: string; confidence: number }>;
  error?: string;
}

export interface DocumentParseRequest {
  documentUrl?: string;
  documentBase64?: string;
  /** 
   * Document type - can be either a simplified type ('pdf', 'docx', 'txt', 'image')
   * or a MIME type ('application/pdf', 'text/plain', etc.)
   */
  documentType?: string;
  extractImages?: boolean;
  ocrEnabled?: boolean;
}

export interface DocumentParseResult {
  success: boolean;
  text?: string;
  pages?: Array<{ pageNumber: number; text: string }>;
  images?: Array<{ pageNumber: number; imageData: string }>;
  metadata?: {
    pageCount?: number;
    author?: string;
    title?: string;
    createdAt?: string;
    extractionMethod?: 'native' | 'ocr';
  };
  error?: string;
}

export interface AudioAnalysisRequest {
  audioUrl?: string;
  audioBase64?: string;
  features?: ('emotion' | 'sentiment' | 'quality' | 'language')[];
}

export interface AudioAnalysisResult {
  success: boolean;
  transcription?: string; // Transcribed text from audio
  emotion?: {
    primary: string;
    confidence: number;
    all: Array<{ emotion: string; confidence: number }>;
  };
  sentiment?: 'positive' | 'neutral' | 'negative' | 'angry';
  quality?: {
    clarity: number; // 0-1
    volumeLevel: number; // 0-1
    backgroundNoise: number; // 0-1
  };
  language?: {
    detected: string;
    confidence: number;
  };
  error?: string;
}

export interface MultiModalInput {
  text?: string;
  imageUrl?: string;
  audioUrl?: string;
  documentUrl?: string;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  timestamp?: number;
  userId?: string;
}

export interface MultiModalContext {
  success: boolean;
  unifiedContext: {
    summary: string;
    inputs: {
      text?: any;
      vision?: any;
      audio?: any;
      document?: any;
      location?: any;
    };
    insights: string[];
    relevance: number;
  };
  error?: string;
}
