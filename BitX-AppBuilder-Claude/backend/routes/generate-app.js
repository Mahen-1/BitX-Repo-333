// backend/routes/generate-app.js
import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// 🔹 CHANGE: Improved JSON extractor to handle code blocks, partials, and nested braces safely
function extractJSON(text) {
  if (!text || typeof text !== 'string') {
    throw new Error('Claude returned no text');
  }

  // Remove ```json or ``` wrappers
  let cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();

  // Find first { and last } to avoid HTML-only output crashes
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    throw new Error('No valid JSON object found');
  }

  const jsonSlice = cleaned.slice(start, end + 1);

  try {
    return JSON.parse(jsonSlice);
  } catch (err) {
    console.error('❌ JSON parse error:', err.message);
    throw new Error('Claude returned invalid JSON');
  }
}

// ✅ Call Claude Sonnet 4 API
async function generateWithClaude(prompt) {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error('Claude API key missing in .env');

  const fullPrompt = `
You are an AI developer that returns production-ready full-stack web app code.

Output must be strictly in JSON format with keys: frontend, backend, ui.
Only return the JSON object. No explanations.

Prompt: ${prompt}
  `;

  try {
    const res = await axios.post(
      'https://api.anthropic.com/v1/messages',
      {
        // 🔹 CHANGE: Using fixed model name as per request
        model: 'claude-sonnet-4-20250514',
        max_tokens: 60000,
        temperature: 0.7,
        messages: [{ role: 'user', content: fullPrompt }],
      },
      {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
      }
    );

    // 🔹 CHANGE: Log usage and raw API structure
    console.log('📥 Claude API keys:', Object.keys(res.data));
    if (res.data.usage) {
      console.log(`📊 Tokens used → Input: ${res.data.usage.input_tokens}, Output: ${res.data.usage.output_tokens}`);
    }

    const text = res.data.content?.[0]?.text || '';
    console.log('📜 Claude text output (first 200 chars):', text.slice(0, 200));

    if (!text.trim()) {
      throw new Error('Empty text from Claude');
    }

    return text;
  } catch (err) {
    console.error('❌ Claude API request failed:', err.response?.data || err.message);
    throw err;
  }
}

// ✅ POST /api/generate-app
router.post('/', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

  console.log('📩 Prompt:', prompt);

  try {
    const claudeText = await generateWithClaude(prompt);
    console.log('✅ Claude responded, attempting JSON extraction...');
    const parsed = extractJSON(claudeText);

    // 🔹 CHANGE: Always send valid JSON to frontend, even if missing keys
    return res.json({
      output: {
        frontend: parsed.frontend || '',
        backend: parsed.backend || '',
        ui: parsed.ui || '',
      },
      source: 'claude',
    });
  } catch (err) {
    console.error('❌ Claude failed:', err.message);
    // 🔹 CHANGE: Send error details so frontend can show failure reason
    return res.status(500).json({
      error: 'Claude failed',
      details: err.message,
    });
  }
});

export default router;
