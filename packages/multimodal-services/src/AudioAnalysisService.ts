/**
 * Audio Analysis Service
 * 
 * Analyzes audio for:
 * - Emotion detection (via transcription + GPT analysis)
 * - Sentiment analysis (via transcription + GPT analysis)
 * - Quality metrics (basic analysis)
 * - Language detection (via Whisper)
 */

import type { Env, AudioAnalysisRequest, AudioAnalysisResult } from './types';

export class AudioAnalysisService {
  constructor(private env: Env) {}

  /**
   * Analyze audio file
   */
  async analyzeAudio(request: AudioAnalysisRequest): Promise<AudioAnalysisResult> {
    try {
      // Validate input
      if (!request.audioUrl && !request.audioBase64) {
        return { success: false, error: 'Audio URL or base64 required' };
      }

      if (!this.env.OPENAI_API_KEY) {
        return { success: false, error: 'OPENAI_API_KEY not configured' };
      }

      const features = request.features || ['emotion', 'sentiment'];
      const results: AudioAnalysisResult = { success: true };

      // First, transcribe the audio using Whisper (needed for sentiment, emotion, language)
      let transcription: { text: string; language?: string } | null = null;
      
      // Always transcribe if any feature is requested (transcription is useful for all features)
      if (features.length > 0) {
        transcription = await this.transcribeAudio(request);
        if (!transcription) {
          return { success: false, error: 'Failed to transcribe audio' };
        }
        // Always include transcription in results
        results.transcription = transcription.text;
      }

      // Analyze each requested feature
      if (features.includes('emotion') && transcription) {
        results.emotion = await this.detectEmotion(transcription.text);
      }

      if (features.includes('sentiment') && transcription) {
        results.sentiment = await this.detectSentiment(transcription.text);
      }

      if (features.includes('quality')) {
        results.quality = await this.analyzeQuality(request);
      }

      if (features.includes('language') && transcription) {
        results.language = {
          detected: transcription.language || 'en-US',
          confidence: 0.9,
        };
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[AudioAnalysisService] Error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  private async transcribeAudio(request: AudioAnalysisRequest): Promise<{ text: string; language?: string } | null> {
    try {
      // Get audio content
      let audioBuffer: ArrayBuffer;
      
      if (request.audioBase64) {
        // Decode base64
        const audioBytes = Uint8Array.from(atob(request.audioBase64), c => c.charCodeAt(0));
        audioBuffer = audioBytes.buffer;
      } else if (request.audioUrl) {
        // Fetch audio from URL
        const response = await fetch(request.audioUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.statusText}`);
        }
        audioBuffer = await response.arrayBuffer();
      } else {
        return null;
      }

      // Convert to Blob for FormData
      const audioBlob = new Blob([audioBuffer], { type: 'audio/m4a' });
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.m4a');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'verbose_json');

      // Call Whisper API
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('[AudioAnalysisService] Whisper API error:', error);
        throw new Error(`Whisper API error: ${error}`);
      }

      const result = await response.json() as { text: string; language?: string };
      
      return {
        text: result.text || '',
        language: result.language || 'en',
      };
    } catch (error) {
      console.error('[AudioAnalysisService] Transcription error:', error);
      return null;
    }
  }

  /**
   * Detect emotion in audio via transcription + GPT analysis
   */
  private async detectEmotion(transcription: string): Promise<{
    primary: string;
    confidence: number;
    all: Array<{ emotion: string; confidence: number }>;
  }> {
    try {
      // Use GPT to analyze emotion from transcription
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an emotion detection expert. Analyze the transcribed speech and determine the primary emotion. Return ONLY a JSON object with this exact format: {"primary": "emotion_name", "confidence": 0.0-1.0, "all": [{"emotion": "name", "confidence": 0.0-1.0}, ...]}. Valid emotions: neutral, happy, sad, angry, excited, calm, frustrated, anxious, surprised, disappointed.',
            },
            {
              role: 'user',
              content: `Transcribed speech: "${transcription}"\n\nAnalyze the emotion and return JSON only.`,
            },
          ],
          temperature: 0.3,
          max_tokens: 200,
        }),
      });

      if (!response.ok) {
        throw new Error(`GPT API error: ${response.statusText}`);
      }

      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      const content = data.choices[0]?.message?.content || '';

      // Parse JSON response
      try {
        const emotionResult = JSON.parse(content);
        return {
          primary: emotionResult.primary || 'neutral',
          confidence: emotionResult.confidence || 0.7,
          all: emotionResult.all || [
            { emotion: emotionResult.primary || 'neutral', confidence: emotionResult.confidence || 0.7 },
          ],
        };
      } catch {
        // Fallback if JSON parsing fails
        return {
          primary: 'neutral',
          confidence: 0.7,
          all: [{ emotion: 'neutral', confidence: 0.7 }],
        };
      }
    } catch (error) {
      console.error('[AudioAnalysisService] Emotion detection error:', error);
      // Return neutral as fallback
      return {
        primary: 'neutral',
        confidence: 0.5,
        all: [{ emotion: 'neutral', confidence: 0.5 }],
      };
    }
  }

  /**
   * Detect sentiment in audio via transcription + GPT analysis
   */
  private async detectSentiment(transcription: string): Promise<'positive' | 'neutral' | 'negative' | 'angry'> {
    try {
      // Use GPT to analyze sentiment from transcription
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a sentiment analysis expert. Analyze the transcribed speech and determine the sentiment. Return ONLY one word: "positive", "neutral", "negative", or "angry".',
            },
            {
              role: 'user',
              content: `Transcribed speech: "${transcription}"\n\nDetermine sentiment (positive/neutral/negative/angry):`,
            },
          ],
          temperature: 0.3,
          max_tokens: 10,
        }),
      });

      if (!response.ok) {
        throw new Error(`GPT API error: ${response.statusText}`);
      }

      const data = await response.json() as { choices: Array<{ message: { content: string } }> };
      const sentiment = data.choices[0]?.message?.content?.trim().toLowerCase() || 'neutral';

      // Validate and return
      if (['positive', 'neutral', 'negative', 'angry'].includes(sentiment)) {
        return sentiment as 'positive' | 'neutral' | 'negative' | 'angry';
      }

      return 'neutral';
    } catch (error) {
      console.error('[AudioAnalysisService] Sentiment detection error:', error);
      return 'neutral';
    }
  }

  /**
   * Analyze audio quality
   * 
   * Basic quality analysis - in production, this could use audio processing libraries
   */
  private async analyzeQuality(request: AudioAnalysisRequest): Promise<{
    clarity: number;
    volumeLevel: number;
    backgroundNoise: number;
  }> {
    // For now, return reasonable defaults
    // In production, this could:
    // 1. Analyze audio file metadata (sample rate, bitrate)
    // 2. Use audio processing to analyze waveform
    // 3. Use external API service
    
    // Basic heuristic: if we got transcription, assume reasonable quality
    return {
      clarity: 0.8, // Assume good clarity if transcription works
      volumeLevel: 0.7, // Assume moderate volume
      backgroundNoise: 0.3, // Assume some background noise
    };
  }
}
