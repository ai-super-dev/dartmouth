/**
 * Vision Service
 * 
 * Analyzes images using OpenAI GPT-4o (vision) to extract:
 * - Descriptions
 * - Objects
 * - Text (OCR)
 * - Faces
 * - Labels
 */

import type { Env, VisionAnalysisRequest, VisionAnalysisResult } from './types';

export class VisionService {
  constructor(private env: Env) {}

  /**
   * Analyze an image using OpenAI GPT-4o (vision)
   */
  async analyzeImage(request: VisionAnalysisRequest): Promise<VisionAnalysisResult> {
    try {
      // Validate input
      if (!request.imageUrl && !request.imageBase64) {
        return { success: false, error: 'Image URL or base64 required' };
      }

      if (!this.env.OPENAI_API_KEY) {
        return { success: false, error: 'OPENAI_API_KEY not configured' };
      }

      // Prepare image for API
      const imageContent = request.imageUrl 
        ? { type: 'image_url' as const, image_url: { url: request.imageUrl } }
        : { type: 'image_url' as const, image_url: { url: `data:image/jpeg;base64,${request.imageBase64}` } };

      // Build prompt based on requested features
      const features = request.features || ['description'];
      const prompt = this.buildPrompt(features);

      // Call OpenAI GPT-4o with vision
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
                { type: 'text', text: prompt },
                imageContent,
              ],
            },
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `OpenAI API error: ${error}` };
      }

      const data = await response.json();
      const analysisText = data.choices[0]?.message?.content || '';

      // Parse response based on features
      const result = this.parseAnalysis(analysisText, features);

      return { success: true, ...result };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Vision analysis error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Build prompt based on requested features
   */
  private buildPrompt(features: string[]): string {
    const prompts: Record<string, string> = {
      description: 'Provide a detailed description of this image.',
      objects: 'List all objects you can identify in this image with confidence scores. Format as JSON array: [{"name": "object", "confidence": 0.95}].',
      text: 'Extract and transcribe any text visible in this image (OCR). Return only the text content.',
      faces: 'Identify any faces and estimate age, emotion, and confidence. Format as JSON array: [{"age": 25, "emotion": "happy", "confidence": 0.9}].',
      labels: 'Provide relevant labels/tags for this image. Format as JSON array: [{"name": "label", "confidence": 0.8}].',
    };

    const promptParts = features.map(f => prompts[f]).filter(Boolean);
    
    if (promptParts.length === 0) {
      return 'Analyze this image and provide a detailed description.';
    }

    return promptParts.join(' ');
  }

  /**
   * Parse analysis response
   */
  private parseAnalysis(text: string, features: string[]): Partial<VisionAnalysisResult> {
    const result: Partial<VisionAnalysisResult> = {};

    // Clean up markdown code blocks from the response
    let cleanedText = text
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // If only description is requested, return the full text
    if (features.length === 1 && features[0] === 'description') {
      result.description = cleanedText;
      return result;
    }

    // Try to parse JSON arrays for structured data
    try {
      // Look for JSON arrays in the response
      const jsonMatch = cleanedText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          if (features.includes('objects')) {
            result.objects = parsed;
          } else if (features.includes('faces')) {
            result.faces = parsed;
          } else if (features.includes('labels')) {
            result.labels = parsed;
          }
        }
      }

      // Extract text content (for OCR)
      if (features.includes('text')) {
        // Remove JSON arrays and extract plain text
        const textOnly = cleanedText.replace(/\[[\s\S]*?\]/g, '').trim();
        if (textOnly && textOnly.length > 0) {
          result.text = textOnly;
        }
      }

      // Extract description if present
      if (features.includes('description')) {
        // Try to find explicit description section
        const descMatch = cleanedText.match(/(?:description|image shows?|this (?:image|photo|picture) (?:shows?|contains?|depicts?))[:\s]+([^\[{]+)/i);
        if (descMatch) {
          result.description = descMatch[1].trim();
        } else {
          // Fallback: use first meaningful part before any JSON
          const parts = cleanedText.split(/\[|\{/);
          const descText = parts[0].trim();
          if (descText && descText.length > 10) {
            result.description = descText;
          } else {
            // Last fallback: use the entire cleaned text
            result.description = cleanedText.substring(0, 500);
          }
        }
      }
    } catch (parseError) {
      // If JSON parsing fails, return cleaned text as description
      if (features.includes('description')) {
        result.description = cleanedText;
      }
      if (features.includes('text')) {
        result.text = cleanedText;
      }
    }

    return result;
  }

  /**
   * Analyze image using Qwen2-VL (alternative model)
   * TODO: Implement Qwen2-VL integration if needed
   */
  async analyzeWithQwen(request: VisionAnalysisRequest): Promise<VisionAnalysisResult> {
    // For now, fall back to OpenAI
    return this.analyzeImage(request);
  }
}
