# Voice Services Package

Voice Services for Dartmouth OS - STT, TTS, Streaming, VAD, and Interrupt Handling.

## Overview

This package provides comprehensive voice services for all Dartmouth OS agents:

- **STT (Speech-to-Text)**: Convert audio to text using multiple providers
- **TTS (Text-to-Speech)**: Convert text to speech using multiple providers
- **Streaming**: Real-time audio streaming management
- **VAD (Voice Activity Detection)**: Detect voice activity in audio
- **Interrupt Handling**: Manage interrupts for voice operations

## Installation

```bash
npm install @agent-army/voice-services
```

## Usage

### Basic Usage

```typescript
import { VoiceService } from '@agent-army/voice-services';

const voiceService = new VoiceService(env);

// Speech to text
const transcript = await voiceService.speechToText(audioBuffer, {
  language: 'en-AU',
  provider: 'whisper'
});

// Text to speech
const audio = await voiceService.textToSpeech('Hello, world!', {
  voice: 'en-AU-female',
  speed: 1.0
});
```

### STT Providers

- `native`: Device native STT
- `whisper`: OpenAI Whisper API
- `deepgram`: Deepgram API

### TTS Providers

- `native`: Device native TTS
- `elevenlabs`: ElevenLabs API
- `google`: Google Cloud TTS
- `azure`: Azure Cognitive Services TTS

## API Endpoints

All endpoints are available at `/api/v2/voice/*`:

- `POST /api/v2/voice/stt` - Speech-to-text
- `POST /api/v2/voice/tts` - Text-to-speech
- `POST /api/v2/voice/stream` - Audio streaming
- `POST /api/v2/voice/vad` - Voice activity detection
- `POST /api/v2/voice/interrupt` - Interrupt handling
- `GET /api/v2/voice/health` - Health check

## Environment Variables

```bash
# STT Providers
OPENAI_API_KEY=sk-xxx          # For Whisper
DEEPGRAM_API_KEY=xxx           # For Deepgram

# TTS Providers
ELEVENLABS_API_KEY=xxx         # For ElevenLabs
GOOGLE_TTS_API_KEY=xxx         # For Google TTS
AZURE_TTS_API_KEY=xxx         # For Azure TTS
AZURE_TTS_REGION=eastus        # For Azure TTS
```

## Testing

### Unit Tests

```bash
npm test
npm run test:coverage
```

### API Testing

For detailed API testing instructions, see [TESTING_GUIDE.md](./TESTING_GUIDE.md).

Quick test example:
```bash
# Health check (no auth required)
curl http://localhost:8787/api/v2/voice/health

# Speech-to-text (requires JWT token)
curl -X POST http://localhost:8787/api/v2/voice/stt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"audio": "BASE64_AUDIO", "language": "en-AU"}'
```

## License

MIT

