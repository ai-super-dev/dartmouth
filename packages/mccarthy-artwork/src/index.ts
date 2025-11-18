/**
 * McCarthy Artwork Analyzer
 * 
 * Specialized AI agent for artwork analysis and print preparation.
 * Built on Dartmouth Foundation.
 * 
 * @packageDocumentation
 */

// Export main agent class (will be created in Phase 6)
// export { McCarthyArtworkAgent } from './McCarthyArtworkAgent';

// Export components
export { CalculationEngine } from './components/CalculationEngine';
export type {
  CalculationSet,
  SizeCalculations,
  SizeResult,
  QualityRatings,
  MaxSizes,
  CustomSize
} from './components/CalculationEngine';

// Export handlers
export { CalculationHandler } from './handlers/CalculationHandler';
export { HowToHandler } from './handlers/HowToHandler';
export { InformationHandler } from './handlers/InformationHandler';

// Export constraints (will be created in Phase 5)
// export { ARTWORK_AGENT_CONSTRAINTS } from './constraints';

