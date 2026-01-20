# Multi-Modal Services

Multi-Modal Intelligence package for Dartmouth OS that enables all agents to:
- **See** - Analyze images and visual content
- **Read** - Parse and understand documents (PDFs, docs, images with text)
- **Hear** - Analyze audio for emotion, transcription, sentiment
- **Combine** - Fuse multiple input modalities into unified context

## Installation

```bash
cd packages/multimodal-services
npm install
```

## Services

### VisionService

Analyzes images using OpenAI GPT-4o (vision) to extract:
- Descriptions
- Objects
- Text (OCR)
- Faces
- Labels

**Example:**
```typescript
import { VisionService } from '@agent-army/multimodal-services';

const visionService = new VisionService(env);
const result = await visionService.analyzeImage({
  imageUrl: 'https://example.com/photo.jpg',
  features: ['description', 'objects', 'text'],
});

console.log(result.description); // "A red car parked on a street..."
console.log(result.objects); // [{ name: 'car', confidence: 0.95 }, ...]
```

### DocumentService

Parses and extracts text from:
- PDFs (TODO: requires external library)
- Word documents (DOCX) (TODO: requires external library)
- Text files (TXT) ✅
- Images with text (OCR) ✅

**Example:**
```typescript
import { DocumentService } from '@agent-army/multimodal-services';

const documentService = new DocumentService(env);
const result = await documentService.parseDocument({
  documentUrl: 'https://example.com/report.pdf',
  ocrEnabled: true,
});

console.log(result.text); // Full extracted text
console.log(result.metadata?.pageCount); // Number of pages
```

### AudioAnalysisService

Analyzes audio for:
- Emotion detection (TODO: requires ML model or API)
- Sentiment analysis (TODO: requires transcription + analysis)
- Quality metrics (TODO: requires audio processing)
- Language detection (TODO: requires transcription)

**Example:**
```typescript
import { AudioAnalysisService } from '@agent-army/multimodal-services';

const audioService = new AudioAnalysisService(env);
const result = await audioService.analyzeAudio({
  audioUrl: 'https://example.com/recording.mp3',
  features: ['emotion', 'sentiment', 'quality'],
});

console.log(result.emotion?.primary); // "happy"
console.log(result.sentiment); // "positive"
```

### MultiModalContextService

Combines multiple input modalities into unified context:
- Text
- Vision (images)
- Audio
- Documents
- Location

**Example:**
```typescript
import { MultiModalContextService } from '@agent-army/multimodal-services';

const contextService = new MultiModalContextService(env);
const result = await contextService.buildContext({
  text: 'What does this sign say?',
  imageUrl: 'https://example.com/street-sign.jpg',
  location: {
    latitude: -33.8688,
    longitude: 151.2093,
    address: 'Sydney, Australia',
  },
});

console.log(result.unifiedContext.summary);
// "Text: What does this sign say? | Image: A red stop sign | Location: Sydney, Australia"
```

## API Endpoints

All endpoints require authentication via Bearer token:

- `POST /api/v2/vision/analyze` - Analyze images
- `POST /api/v2/document/parse` - Parse documents
- `POST /api/v2/audio/analyze` - Analyze audio
- `POST /api/v2/multimodal/context` - Build unified context
- `GET /api/v2/multimodal/health` - Health check (no auth)

## Environment Variables

Required:
- `OPENAI_API_KEY` - For vision analysis (GPT-4o)

## Development

```bash
# Build
npm run build

# Test
npm test

# Test with coverage
npm run test:coverage

# Lint
npm run lint

# Format
npm run format
```

## Status

### ✅ Implemented
- VisionService with OpenAI GPT-4o
- DocumentService for TXT and image OCR
- MultiModalContextService for context fusion
- API endpoints and controllers
- TypeScript types

### 🚧 TODO
- PDF parsing (requires external library or service)
- DOCX parsing (requires external library or service)
- Audio emotion detection (requires ML model or API)
- Audio sentiment analysis (requires transcription + analysis)
- Audio quality analysis (requires audio processing)
- Audio language detection (requires transcription)

## License

Part of Dartmouth OS - Agent Army Platform
