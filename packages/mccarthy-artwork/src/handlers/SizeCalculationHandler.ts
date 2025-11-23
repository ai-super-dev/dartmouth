/**
 * SizeCalculationHandler
 * 
 * Handles reverse DPI calculations when user specifies a size and wants to know the DPI.
 * 
 * Examples:
 * - "if my artwork is 26.6 × 24.0 cm what dpi is that?"
 * - "what dpi would I get at 30 × 25 cm?"
 * - "at 10 inches wide what's my dpi?"
 */

import type { Intent, Response, HandlerContext } from '../../../worker/src/types/shared';

export class SizeCalculationHandler {
  name = 'size-calculation';

  canHandle(intent: Intent): boolean {
    // Detect when user asks about DPI for a specific size
    const message = intent.originalMessage?.toLowerCase() || '';
    
    // Patterns that indicate reverse DPI calculation
    const patterns = [
      /what.*dpi.*at.*\d+/i,           // "what dpi at 26 cm"
      /if.*size.*\d+.*what.*dpi/i,     // "if size is 26 cm what dpi"
      /at.*\d+.*cm.*what.*dpi/i,       // "at 26 cm what dpi"
      /\d+.*×.*\d+.*cm.*dpi/i,         // "26 × 24 cm dpi"
      /\d+.*x.*\d+.*cm.*dpi/i,         // "26 x 24 cm dpi"
    ];

    return patterns.some(pattern => pattern.test(message));
  }

  async handle(intent: Intent, context: HandlerContext): Promise<Response> {
    const message = intent.originalMessage || '';
    
    // Get artwork data from context
    const artworkData = context.state?.metadata?.artworkData;
    
    if (!artworkData || !artworkData.dimensions?.pixels) {
      return {
        success: false,
        message: "I need artwork data to calculate DPI. Please upload an artwork first!",
        intent,
        handlerUsed: this.name
      };
    }

    // Extract size from message
    const sizeInfo = this.extractSize(message);
    
    if (!sizeInfo) {
      return {
        success: false,
        message: "I couldn't understand the size you mentioned. Could you specify it like '26.6 × 24.0 cm' or '10 × 9 inches'?",
        intent,
        handlerUsed: this.name
      };
    }

    // Calculate DPI
    const result = this.calculateDPI(
      artworkData.dimensions.pixels.width,
      artworkData.dimensions.pixels.height,
      sizeInfo.widthCm,
      sizeInfo.heightCm
    );

    // Format response
    const response = this.formatResponse(result);

    return {
      success: true,
      message: response,
      intent,
      handlerUsed: this.name,
      data: result
    };
  }

  /**
   * Extract size from user message
   */
  private extractSize(message: string): { widthCm: number; heightCm: number } | null {
    // Try to extract CM dimensions first
    const cmPattern = /(\d+\.?\d*)\s*[×x]\s*(\d+\.?\d*)\s*cm/i;
    const cmMatch = message.match(cmPattern);
    
    if (cmMatch) {
      return {
        widthCm: parseFloat(cmMatch[1]),
        heightCm: parseFloat(cmMatch[2])
      };
    }

    // Try to extract inch dimensions and convert to CM
    const inchPattern = /(\d+\.?\d*)\s*[×x]\s*(\d+\.?\d*)\s*(?:inch|inches|")/i;
    const inchMatch = message.match(inchPattern);
    
    if (inchMatch) {
      return {
        widthCm: parseFloat(inchMatch[1]) * 2.54,
        heightCm: parseFloat(inchMatch[2]) * 2.54
      };
    }

    // Try single dimension (assume square or width only)
    const singleCmPattern = /(\d+\.?\d*)\s*cm/i;
    const singleCmMatch = message.match(singleCmPattern);
    
    if (singleCmMatch) {
      const size = parseFloat(singleCmMatch[1]);
      return {
        widthCm: size,
        heightCm: size // Assume square if only one dimension given
      };
    }

    return null;
  }

  /**
   * Calculate DPI from pixel dimensions and physical size
   */
  private calculateDPI(
    pixelWidth: number,
    pixelHeight: number,
    widthCm: number,
    heightCm: number
  ): {
    widthCm: number;
    heightCm: number;
    widthInches: number;
    heightInches: number;
    dpiWidth: number;
    dpiHeight: number;
    dpiAverage: number;
    quality: 'Optimal' | 'Good' | 'Poor';
  } {
    // Convert CM to inches
    const widthInches = widthCm / 2.54;
    const heightInches = heightCm / 2.54;

    // Calculate DPI
    const dpiWidth = Math.round(pixelWidth / widthInches);
    const dpiHeight = Math.round(pixelHeight / heightInches);
    const dpiAverage = Math.round((dpiWidth + dpiHeight) / 2);

    // Determine quality
    let quality: 'Optimal' | 'Good' | 'Poor';
    if (dpiAverage >= 250) {
      quality = 'Optimal';
    } else if (dpiAverage >= 200) {
      quality = 'Good';
    } else {
      quality = 'Poor';
    }

    return {
      widthCm: Math.round(widthCm * 10) / 10,
      heightCm: Math.round(heightCm * 10) / 10,
      widthInches: Math.round(widthInches * 100) / 100,
      heightInches: Math.round(heightInches * 100) / 100,
      dpiWidth,
      dpiHeight,
      dpiAverage,
      quality
    };
  }

  /**
   * Format response for user
   */
  private formatResponse(result: ReturnType<typeof this.calculateDPI>): string {
    const emoji = result.quality === 'Optimal' ? '✨' : result.quality === 'Good' ? '👌' : '⚠️';
    
    return `At **${result.widthCm} × ${result.heightCm} cm** (${result.widthInches}" × ${result.heightInches}"), your DPI would be **${result.dpiAverage}**. ${emoji} **Quality: ${result.quality}**`;
  }
}

