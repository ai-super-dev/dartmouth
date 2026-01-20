/**
 * Multi-Modal Context Service
 * 
 * Combines multiple input modalities into unified context:
 * - Text
 * - Vision (images)
 * - Audio
 * - Documents
 * - Location
 */

import type { Env, MultiModalInput, MultiModalContext } from './types';
import { VisionService } from './VisionService';
import { DocumentService } from './DocumentService';
import { AudioAnalysisService } from './AudioAnalysisService';

export class MultiModalContextService {
  private visionService: VisionService;
  private documentService: DocumentService;
  private audioService: AudioAnalysisService;

  constructor(private env: Env) {
    this.visionService = new VisionService(env);
    this.documentService = new DocumentService(env);
    this.audioService = new AudioAnalysisService(env);
  }

  /**
   * Build unified context from multiple inputs
   */
  async buildContext(input: MultiModalInput): Promise<MultiModalContext> {
    try {
      const context: {
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
      } = {
        summary: '',
        inputs: {},
        insights: [],
        relevance: 0,
      };

      // Process each input type
      if (input.text) {
        context.inputs.text = { content: input.text };
      }

      if (input.imageUrl) {
        const visionResult = await this.visionService.analyzeImage({
          imageUrl: input.imageUrl,
          features: ['description', 'objects', 'text'],
        });
        context.inputs.vision = visionResult;
      }

      if (input.audioUrl) {
        const audioResult = await this.audioService.analyzeAudio({
          audioUrl: input.audioUrl,
          features: ['emotion', 'sentiment'],
        });
        context.inputs.audio = audioResult;
      }

      if (input.documentUrl) {
        const docResult = await this.documentService.parseDocument({
          documentUrl: input.documentUrl,
        });
        context.inputs.document = docResult;
      }

      if (input.location) {
        context.inputs.location = input.location;
      }

      // Generate unified summary
      context.summary = this.generateSummary(context.inputs);

      // Extract insights
      context.insights = this.extractInsights(context.inputs);

      // Calculate relevance score
      context.relevance = this.calculateRelevance(context.inputs);

      return {
        success: true,
        unifiedContext: context,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Multi-modal context error:', errorMessage);
      return { 
        success: false, 
        error: errorMessage, 
        unifiedContext: {
          summary: '',
          inputs: {},
          insights: [],
          relevance: 0,
        }
      };
    }
  }

  /**
   * Generate unified summary from all inputs
   */
  private generateSummary(inputs: {
    text?: any;
    vision?: any;
    audio?: any;
    document?: any;
    location?: any;
  }): string {
    const parts: string[] = [];

    if (inputs.text?.content) {
      parts.push(`Text: ${inputs.text.content}`);
    }

    if (inputs.vision?.description) {
      parts.push(`Image: ${inputs.vision.description}`);
    }

    if (inputs.audio?.emotion) {
      parts.push(`Audio emotion: ${inputs.audio.emotion.primary}`);
    }

    if (inputs.document?.text) {
      const docText = inputs.document.text.length > 100 
        ? `${inputs.document.text.substring(0, 100)}...` 
        : inputs.document.text;
      parts.push(`Document: ${docText}`);
    }

    if (inputs.location) {
      const loc = inputs.location;
      if (loc.address) {
        parts.push(`Location: ${loc.address}`);
      } else {
        parts.push(`Location: ${loc.latitude}, ${loc.longitude}`);
      }
    }

    return parts.join(' | ') || 'No context available';
  }

  /**
   * Extract insights from combined inputs
   */
  private extractInsights(inputs: {
    text?: any;
    vision?: any;
    audio?: any;
    document?: any;
    location?: any;
  }): string[] {
    const insights: string[] = [];

    // Add logic to generate insights based on input combinations
    if (inputs.vision && inputs.text) {
      insights.push('User provided both visual and textual context');
    }

    if (inputs.audio?.sentiment && inputs.text) {
      const sentiment = inputs.audio.sentiment;
      insights.push(`User's audio sentiment (${sentiment}) matches text context`);
    }

    if (inputs.location && (inputs.vision || inputs.text)) {
      insights.push('Context includes location information');
    }

    if (inputs.document && inputs.text) {
      insights.push('User referenced both document and text input');
    }

    if (inputs.vision?.objects && inputs.vision.objects.length > 0) {
      insights.push(`Detected ${inputs.vision.objects.length} objects in image`);
    }

    if (inputs.audio?.emotion && inputs.audio.emotion.primary !== 'neutral') {
      insights.push(`Detected ${inputs.audio.emotion.primary} emotion in audio`);
    }

    return insights;
  }

  /**
   * Calculate relevance score based on input completeness
   */
  private calculateRelevance(inputs: {
    text?: any;
    vision?: any;
    audio?: any;
    document?: any;
    location?: any;
  }): number {
    let score = 0;
    const inputCount = Object.keys(inputs).filter(key => inputs[key as keyof typeof inputs] !== undefined).length;

    // More inputs = higher relevance (up to 5 inputs)
    score = Math.min(inputCount / 5, 1);

    // Boost score if inputs have actual content
    if (inputs.text?.content) score += 0.1;
    if (inputs.vision?.description) score += 0.1;
    if (inputs.audio?.emotion) score += 0.1;
    if (inputs.document?.text) score += 0.1;
    if (inputs.location) score += 0.1;

    return Math.min(score, 1);
  }
}
