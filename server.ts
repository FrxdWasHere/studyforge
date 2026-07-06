import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const currentDir = typeof __dirname !== 'undefined'
  ? __dirname
  : path.dirname(fileURLToPath((import.meta as any).url || 'file:'));

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// AI Generation endpoint
app.post('/api/generate', async (req, res) => {
  const {
    material,
    count,
    difficulty,
    types,
    subject,
    instructions,
    provider,
    model,
    apiKey,
    temperature,
    maxTokens,
    promptTemplate
  } = req.body;

  if (!material || !material.trim()) {
    return res.status(400).json({ error: 'Study material is required' });
  }

  const providerType = provider || 'gemini';
  const selectedModel = model || (
    providerType === 'gemini' ? 'gemini-3.5-flash' :
    providerType === 'openai' ? 'gpt-4o-mini' :
    providerType === 'anthropic' ? 'claude-3-5-haiku' :
    providerType === 'openrouter' ? 'meta-llama/llama-3-8b-instruct:free' :
    'llama3'
  );

  const finalApiKey = apiKey?.trim() || (
    providerType === 'gemini' ? process.env.GEMINI_API_KEY :
    providerType === 'openai' ? process.env.OPENAI_API_KEY :
    providerType === 'anthropic' ? process.env.ANTHROPIC_API_KEY :
    providerType === 'openrouter' ? process.env.OPENROUTER_API_KEY :
    ''
  );

  if (['gemini', 'openai', 'anthropic', 'openrouter'].includes(providerType) && !finalApiKey) {
    return res.status(400).json({
      error: `API Key for ${providerType.toUpperCase()} is missing. Please add it in Settings.`,
    });
  }

  const countStr = String(count || 10);
  const diffStr = difficulty || 'medium';
  const typesStr = (types && types.length > 0) ? types.join(', ') : 'Multiple Choice, Basic Recall';
  const subjStr = subject || 'General Knowledge';
  const instrStr = instructions || 'None';

  // Base System Prompt Builder
  const defaultSystemPrompt = `# Comprehensive Study Question Generator

You are an expert assessment writer and educational specialist.
Your task is to transform any study material I provide into a comprehensive bank of high-quality study questions that maximize learning.

## Rules
* Base every question only on the provided material.
* Never invent facts.
* Do not create redundant or overlapping questions.
* Ensure questions are unambiguous with one correct answer.`;

  let systemPromptText = defaultSystemPrompt;
  if (promptTemplate) {
    systemPromptText = promptTemplate
      .replace(/\{\{questionCount\}\}/g, countStr)
      .replace(/\{\{difficulty\}\}/g, diffStr)
      .replace(/\{\{subject\}\}/g, subjStr)
      .replace(/\{\{questionTypes\}\}/g, typesStr)
      .replace(/\{\{studyMaterial\}\}/g, material)
      .replace(/\{\{extraInstructions\}\}/g, instrStr);
  } else {
    systemPromptText += `\n\nGenerate exactly ${countStr} questions of difficulty ${diffStr} on "${subjStr}" using formats: ${typesStr}.`;
  }

  const jsonSchemaInstructions = `
\n\nIMPORTANT: You MUST respond with a single, well-formed JSON object matching the following structure. Do NOT include any introductory or concluding text, or any markdown formatting block unless it is strictly valid JSON.

JSON Structure:
{
  "deck": {
    "title": "Concise Deck Title",
    "description": "Short description of the deck scope",
    "subject": "${subjStr}"
  },
  "questions": [
    {
      "type": "Multiple Choice | True False | Basic Recall | Short Answer | Scenario | Application",
      "difficulty": "easy | medium | hard",
      "concept": "Core academic concept",
      "tags": ["Tag1", "Tag2"],
      "question": "The question text",
      "options": ["Option 0", "Option 1", "Option 2", "Option 3"], // For Multiple Choice/True False; null or omit for others
      "correct": "0", // index of correct option for MC/TF, or text for others
      "answer": "The text representation of the correct answer",
      "explanation": "Why this answer is correct"
    }
  ]
}`;

  const fullSystemPrompt = systemPromptText + jsonSchemaInstructions;
  const userPromptText = `Subject: ${subjStr}\nStudy Material:\n${material}\n\nAdditional Instructions: ${instrStr}`;

  try {
    let resultJsonText = '';

    if (providerType === 'gemini') {
      const ai = new GoogleGenAI({
        apiKey: finalApiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          deck: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              subject: { type: Type.STRING }
            },
            required: ['title', 'description', 'subject']
          },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING },
                difficulty: { type: Type.STRING },
                concept: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                question: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                correct: { type: Type.STRING },
                answer: { type: Type.STRING },
                explanation: { type: Type.STRING }
              },
              required: ['type', 'difficulty', 'question', 'answer']
            }
          }
        },
        required: ['deck', 'questions']
      };

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: userPromptText,
        config: {
          systemInstruction: fullSystemPrompt,
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: temperature || 0.2,
          maxOutputTokens: maxTokens || 2048,
        },
      });

      resultJsonText = response.text || '';
    } else {
      // Fetch REST API for OpenAI, Anthropic, OpenRouter, Ollama, LM Studio
      let url = '';
      let headers: Record<string, string> = { 'Content-Type': 'application/json' };
      let body: any = {};

      if (providerType === 'openai') {
        url = 'https://api.openai.com/v1/chat/completions';
        headers['Authorization'] = `Bearer ${finalApiKey}`;
        body = {
          model: selectedModel,
          messages: [
            { role: 'system', content: fullSystemPrompt },
            { role: 'user', content: userPromptText }
          ],
          temperature: temperature || 0.2,
          max_tokens: maxTokens || 2048,
          response_format: { type: 'json_object' }
        };
      } else if (providerType === 'anthropic') {
        url = 'https://api.anthropic.com/v1/messages';
        headers['x-api-key'] = finalApiKey;
        headers['anthropic-version'] = '2023-06-01';
        body = {
          model: selectedModel,
          system: fullSystemPrompt,
          messages: [{ role: 'user', content: userPromptText }],
          temperature: temperature || 0.2,
          max_tokens: maxTokens || 2048,
        };
      } else if (providerType === 'openrouter') {
        url = 'https://openrouter.ai/api/v1/chat/completions';
        headers['Authorization'] = `Bearer ${finalApiKey}`;
        body = {
          model: selectedModel,
          messages: [
            { role: 'system', content: fullSystemPrompt },
            { role: 'user', content: userPromptText }
          ],
          temperature: temperature || 0.2,
          max_tokens: maxTokens || 2048,
          response_format: { type: 'json_object' }
        };
      } else if (providerType === 'ollama') {
        const ollamaBase = req.body.ollamaUrl?.trim() || 'http://localhost:11434';
        url = `${ollamaBase}/api/chat`;
        body = {
          model: selectedModel,
          messages: [
            { role: 'system', content: fullSystemPrompt },
            { role: 'user', content: userPromptText }
          ],
          options: { temperature: temperature || 0.2 },
          stream: false,
          format: 'json'
        };
      } else if (providerType === 'lmstudio') {
        const lmstudioBase = req.body.lmstudioUrl?.trim() || 'http://localhost:1234';
        url = `${lmstudioBase}/v1/chat/completions`;
        body = {
          model: selectedModel,
          messages: [
            { role: 'system', content: fullSystemPrompt },
            { role: 'user', content: userPromptText }
          ],
          temperature: temperature || 0.2,
          max_tokens: maxTokens || 2048,
        };
      }

      const resFetch = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!resFetch.ok) {
        const errText = await resFetch.text();
        throw new Error(`${providerType.toUpperCase()} endpoint returned error: ${resFetch.status} - ${errText}`);
      }

      const responseData = await resFetch.json();

      if (providerType === 'anthropic') {
        resultJsonText = responseData.content?.[0]?.text || '';
      } else if (providerType === 'ollama') {
        resultJsonText = responseData.message?.content || '';
      } else {
        resultJsonText = responseData.choices?.[0]?.message?.content || '';
      }
    }

    if (!resultJsonText) {
      throw new Error(`Empty response received from ${providerType}.`);
    }

    // Clean JSON formatting triggers
    let cleaned = resultJsonText.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
    }
    cleaned = cleaned.trim();

    const parsed = JSON.parse(cleaned);

    // Validate structure basics
    if (!parsed.deck || !parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Response JSON is missing either the "deck" or "questions" schema.');
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error(`${providerType} generation error:`, error);
    return res.status(500).json({
      error: error.message || `An error occurred during ${providerType} question generation.`,
    });
  }
});

async function startServer() {
  // Configure Vite or Static Assets serving
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`StudyForge server running on http://localhost:${PORT}`);
  });
}

startServer();
