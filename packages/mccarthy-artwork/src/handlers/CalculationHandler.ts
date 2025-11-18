/**
 * Calculation Handler
 * 
 * Handles calculation requests using the CalculationEngine for accurate results.
 */

import type { Intent, Response } from '@agent-army/shared';
import type { Handler, HandlerContext } from '@agent-army/shared';
import type { CalculationEngine } from '../components/CalculationEngine';

export class CalculationHandler implements Handler {
  name = 'CalculationHandler';
  version = '1.0.0';
  private calculationEngine: CalculationEngine;

  constructor(calculationEngine: CalculationEngine) {
    this.calculationEngine = calculationEngine;
  }

  canHandle(intent: Intent): boolean {
    return intent.type === 'calculation';
  }

  async handle(
    message: string,
    _intent: Intent,
    context: HandlerContext
  ): Promise<Response> {
    const startTime = Date.now();

    // Extract calculation parameters from message (pixels and DPI)
    const calcParams = this.extractArtworkParams(message);

    // Use CalculationEngine for accurate calculations
    let result: any;
    let responseText: string;

    if (calcParams && this.calculationEngine) {
      // Use CalculationEngine.preCompute for artwork calculations
      result = this.calculationEngine.preCompute(
        'artwork-' + Date.now(),
        calcParams.widthPixels,
        calcParams.heightPixels,
        calcParams.dpi
      );
      responseText = this.formatCalculationResponse(result, calcParams);
    } else {
      responseText = "Hey! I can help with print size calculations. Please provide artwork dimensions in pixels and desired DPI (e.g., '4000x6000 pixels at 300 DPI').";
    }

    return {
      content: responseText,
      metadata: {
        handlerName: this.name,
        handlerVersion: this.version,
        processingTime: Date.now() - startTime,
        cached: false,
        confidence: result ? 1.0 : 0.5,
        calculationResult: result
      }
    };
  }

  private extractArtworkParams(message: string): { widthPixels: number; heightPixels: number; dpi: number } | null {
    // Extract dimensions like "4000x6000 pixels" or "2000 x 3000 px"
    const dimensionPattern = /(\d+)\s*x\s*(\d+)\s*(pixels?|px)?/i;
    const dimensionMatch = message.match(dimensionPattern);
    
    // Extract DPI like "at 300 DPI" or "300dpi"
    const dpiPattern = /(\d+)\s*dpi/i;
    const dpiMatch = message.match(dpiPattern);
    
    if (dimensionMatch) {
      const width = parseInt(dimensionMatch[1]);
      const height = parseInt(dimensionMatch[2]);
      const dpi = dpiMatch ? parseInt(dpiMatch[1]) : 300; // Default to 300 DPI
      
      return {
        widthPixels: width,
        heightPixels: height,
        dpi
      };
    }
    
    return null;
  }

  private formatCalculationResponse(result: any, params: any): string {
    if (!result || !result.maxSizes) {
      return "I couldn't perform that calculation. Could you provide artwork dimensions and DPI?";
    }

    // Get the actual size at the user's DPI
    const actualDPI = params.dpi;
    const widthInches = params.widthPixels / actualDPI;
    const heightInches = params.heightPixels / actualDPI;
    const widthCm = widthInches * 2.54;
    const heightCm = heightInches * 2.54;

    // Determine quality based on DPI
    let quality = 'optimal';
    let qualityAdvice = '';
    
    if (actualDPI >= 250) {
      quality = 'optimal';
      qualityAdvice = "That's excellent quality for professional printing! 🎨";
    } else if (actualDPI >= 200) {
      quality = 'good';
      qualityAdvice = "That's good quality - suitable for most printing needs.";
    } else if (actualDPI >= 150) {
      quality = 'acceptable';
      qualityAdvice = "This will work for larger prints viewed from a distance, but you might notice some pixelation up close.";
    } else {
      quality = 'poor';
      qualityAdvice = "⚠️ Heads up - 72 DPI is really low for printing. You'll likely see pixelation and the print won't look sharp. For best results, I'd recommend at least 200 DPI, ideally 300 DPI.";
    }

    // Format the response with personality
    let response = `Great question! Let me break this down for you:\n\n`;
    response += `📐 **Your Artwork:** ${params.widthPixels} x ${params.heightPixels} pixels at ${actualDPI} DPI\n\n`;
    response += `📏 **Print Size:** ${widthCm.toFixed(2)}cm x ${heightCm.toFixed(2)}cm (${widthInches.toFixed(2)}" x ${heightInches.toFixed(2)}")\n\n`;
    response += `✨ **Quality:** ${quality.toUpperCase()}\n${qualityAdvice}`;

    // Add recommendations for low DPI
    if (actualDPI < 200) {
      const recommendedWidth = (params.widthPixels / 300).toFixed(2);
      const recommendedHeight = (params.heightPixels / 300).toFixed(2);
      response += `\n\n💡 **My Recommendation:** For sharp, professional prints, try printing at ${recommendedWidth}" x ${recommendedHeight}" (at 300 DPI) instead. The smaller size will look much better!`;
    }

    return response;
  }
}

