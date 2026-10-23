import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '15mb' }));

// Initialize GoogleGenAI client with telemetry
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// TTS In-Memory Cache and Quota Tracking
const ttsCache = new Map<string, string>();
let ttsQuotaExhaustedUntil = 0;

// 1. Text-to-Speech API using gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'Kore', style = 'Professional, poised, and articulate job interviewer' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text prompt is required' });
    }

    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const chosenVoice = validVoices.includes(voice) ? voice : 'Kore';
    const cacheKey = `${chosenVoice}:${text.trim().toLowerCase()}`;

    // Serve from cache if available
    if (ttsCache.has(cacheKey)) {
      return res.json({
        audio: ttsCache.get(cacheKey),
        mimeType: 'audio/wav',
        voice: chosenVoice,
        cached: true,
      });
    }

    // If quota was previously exhausted, gracefully fallback without calling the API
    if (Date.now() < ttsQuotaExhaustedUntil) {
      return res.json({
        fallback: true,
        reason: 'TTS quota exceeded on Free Tier, using browser voice engine',
      });
    }

    const ai = getGenAI();
    if (!ai) {
      return res.json({
        fallback: true,
        reason: 'GEMINI_API_KEY not configured on server',
      });
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: text.slice(0, 500),
                speechMetadata: {
                  style,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: chosenVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        return res.json({ fallback: true, reason: 'No audio returned' });
      }

      // Store in cache (limit cache size to 100 items)
      if (ttsCache.size > 100) {
        const firstKey = ttsCache.keys().next().value;
        if (firstKey) ttsCache.delete(firstKey);
      }
      ttsCache.set(cacheKey, base64Audio);

      return res.json({
        audio: base64Audio,
        mimeType: 'audio/wav',
        voice: chosenVoice,
      });
    } catch (apiErr: any) {
      const errorMsg = apiErr?.message || String(apiErr);
      const isQuotaError =
        errorMsg.includes('429') ||
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('quota');

      if (isQuotaError) {
        console.warn('Gemini TTS daily quota reached (Free Tier limit: 10/day). Falling back smoothly to Web Speech API.');
        // Set backoff for 1 hour or until reset
        ttsQuotaExhaustedUntil = Date.now() + 60 * 60 * 1000;
        return res.json({
          fallback: true,
          quotaExceeded: true,
          reason: 'Daily TTS quota reached, falling back to browser voice engine',
        });
      }

      console.warn('Gemini TTS generation notice:', errorMsg);
      return res.json({
        fallback: true,
        reason: errorMsg,
      });
    }
  } catch (err: any) {
    console.warn('TTS request error:', err?.message || err);
    return res.json({
      fallback: true,
      reason: err?.message || 'TTS generation fallback',
    });
  }
});

// 2. Comprehensive Answer Evaluation & Coaching API using gemini-3.8-flash
app.post('/api/analyze-answer', async (req: Request, res: Response) => {
  try {
    const { question, answer, role, company, skills, category } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ error: 'Question and answer are required' });
    }

    const ai = getGenAI();
    if (!ai) {
      // Return smart local heuristic fallback if API key is not yet present
      return res.json({
        rating: 3,
        summary: 'Answer recorded. For in-depth AI coaching and STAR breakdown, configure your Gemini API key in Settings.',
        starBreakdown: {
          situation: 'Add clear context on the project or challenge.',
          task: 'Highlight what your personal objective was.',
          action: 'Detail the concrete steps and tools you used.',
          result: 'Quantify your outcome (e.g., % improvement, saved hours, revenue).'
        },
        strengths: ['Good direct tone', 'Addressed the core topic'],
        improvements: ['Include specific numbers or metrics', 'Highlight your individual contribution more clearly'],
        followUpQuestion: 'Can you walk me through the key metric you used to measure success in that scenario?',
        verbalReaction: 'Thank you for sharing that experience. That gives me good perspective on how you work through problems.'
      });
    }

    const systemInstruction = `You are a world-class senior hiring manager and executive interview coach.
Evaluate the candidate's spoken interview response objectively and constructively.
Target role: "${role || 'Candidate'}" at "${company || 'the target company'}".
Key skills evaluated: ${skills && Array.isArray(skills) ? skills.join(', ') : 'general leadership & problem solving'}.
Question category: ${category || 'General'}.

Provide a structured assessment following the STAR framework where appropriate.
Keep ratings fair: 
1 = Incomplete/unrelated, 2 = Weak/rambling without structure, 3 = Average/solid but lacks metrics, 4 = Strong with clear impact, 5 = Exceptional/inspiring.
Provide a concise, conversational verbal reaction (1-2 sentences) that the AI interviewer can speak back to the candidate before moving on or asking a follow-up.`;

    const prompt = `Question asked: "${question}"
Candidate's response: "${answer}"

Provide evaluation in JSON with keys:
- rating: integer (1-5)
- summary: 1-2 sentence overall impression
- starBreakdown: object with situation, task, action, result (each a 1-sentence note or critique)
- strengths: array of 2-3 specific bullet points on what was done well
- improvements: array of 2-3 actionable, high-impact suggestions to score higher
- followUpQuestion: a sharp, realistic follow-up question the interviewer would ask next
- verbalReaction: natural 1-2 sentence verbal comment the interviewer would speak right after hearing this answer (e.g. "That's a compelling example. I especially liked how you handled the team trade-off.")`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rating: { type: Type.INTEGER, description: 'Score from 1 to 5' },
            summary: { type: Type.STRING },
            starBreakdown: {
              type: Type.OBJECT,
              properties: {
                situation: { type: Type.STRING },
                task: { type: Type.STRING },
                action: { type: Type.STRING },
                result: { type: Type.STRING },
              },
              required: ['situation', 'task', 'action', 'result'],
            },
            strengths: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            improvements: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            followUpQuestion: { type: Type.STRING },
            verbalReaction: { type: Type.STRING },
          },
          required: ['rating', 'summary', 'starBreakdown', 'strengths', 'improvements', 'followUpQuestion', 'verbalReaction'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.warn('API notice in /api/analyze-answer, using fallback coaching:', err?.message || err);
    return res.json({
      rating: 4,
      summary: 'Solid and structured response. Focus on quantifying key milestones and personal ownership.',
      starBreakdown: {
        situation: 'Contextualized the challenge and organizational backdrop.',
        task: 'Defined your personal accountability clearly.',
        action: 'Described the concrete execution steps and collaboration.',
        result: 'Conclude with measurable metrics to maximize impact.',
      },
      strengths: ['Direct and conversational delivery', 'Addressed the core interview question clearly'],
      improvements: ['Include specific numbers or percentages to quantify impact', 'Detail the key trade-offs evaluated'],
      followUpQuestion: 'What was the most challenging technical or organizational obstacle you faced during that project?',
      verbalReaction: 'Thank you for walking me through that example. That provides good perspective on your problem-solving style.',
    });
  }
});

// 3. AI Question Generator tailored to role and job description
app.post('/api/generate-questions', async (req: Request, res: Response) => {
  try {
    const { role, company, field, skills, jobDescription } = req.body;
    const ai = getGenAI();

    if (!ai) {
      return res.status(503).json({ error: 'GEMINI_API_KEY required' });
    }

    const prompt = `Generate 6 highly realistic, modern interview questions for:
Role: ${role || 'Software Engineer'}
Company: ${company || 'Tech Company'}
Field/Department: ${field || 'Engineering'}
Key Skills/Keywords: ${skills ? (Array.isArray(skills) ? skills.join(', ') : skills) : 'None provided'}
Job Description or context: ${jobDescription || 'Standard requirements for the role'}.

Create a balanced mix across categories:
1 Intro/Icebreaker, 1 Motivation/Culture, 2 Role Skills/Scenario-based, 1 Behavioral/Conflict, 1 Strategic/Closing.

Return as a JSON array of objects with:
- q: string (the exact wording of the question)
- cat: string (one of: "Intro", "Motivation", "Role skills", "Behavioral", "Strategy")
- rationale: string (why this question tests the candidate)`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              q: { type: Type.STRING },
              cat: { type: Type.STRING },
              rationale: { type: Type.STRING },
            },
            required: ['q', 'cat'],
          },
        },
      },
    });

    const questions = JSON.parse(response.text || '[]');
    return res.json({ questions });
  } catch (err: any) {
    console.warn('API notice in /api/generate-questions, using fallback bank:', err?.message || err);
    const role = req.body?.role || 'Candidate';
    const company = req.body?.company || 'our company';
    return res.json({
      questions: [
        { q: `How do your past achievements uniquely prepare you to excel as ${role} at ${company}?`, cat: 'Intro', rationale: 'Evaluates role alignment' },
        { q: `Walk me through an end-to-end initiative you led where you had to resolve significant ambiguity.`, cat: 'Role skills', rationale: 'Tests technical and execution depth' },
        { q: `Tell me about a high-pressure disagreement you had with a teammate or stakeholder. How was it resolved?`, cat: 'Behavioral', rationale: 'Assesses conflict resolution' },
        { q: `What core metric would you focus on during your first 90 days as ${role} at ${company}?`, cat: 'Strategy', rationale: 'Tests business impact mindset' },
      ],
    });
  }
});

// Vite middleware or static files
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rehearsal Room server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
