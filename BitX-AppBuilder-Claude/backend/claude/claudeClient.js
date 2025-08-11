// backend/claude/claudeClient.js
const axios = require('axios');

/**
 * Extracts and cleans JSON content from Claude's response.
 * Handles markdown-style ```json blocks and falls back to full response.
 */
function extractJsonFromClaude(rawText) {
  // Try to extract from ```json ... ```
  const match = rawText.match(/```json\s*([\s\S]*?)```/i);
  if (match && match[1]) {
    return match[1];
  }

  // Fallback: find first {...} JSON block
  const fallback = rawText.match(/{[\s\S]*?}/);
  if (fallback && fallback[0]) {
    return fallback[0];
  }

  throw new Error("❌ No valid JSON block found in Claude's response.");
}

async function callClaude(prompt) {
  const apiKey = process.env.CLAUDE_API_KEY;
  const apiUrl = process.env.CLAUDE_API_URL;

  if (!apiKey || !apiUrl) {
    throw new Error("Claude API key or URL is missing in environment variables.");
  }

  const fullPrompt = `
You are an AI developer that returns production-ready full-stack web app code.

Output must be strictly in JSON format with keys: frontend, backend, ui.
Only return the JSON object. No explanations.

Prompt: ${prompt}
  `;

  try {
    const response = await axios.post(apiUrl, {
      model: "claude-sonnet-4-20250514",
      max_tokens: 60000,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: fullPrompt
        }
      ]
    }, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    const rawText = response.data?.content?.[0]?.text;

    if (!rawText) {
      throw new Error("❌ Claude response was empty or malformed.");
    }

    const cleanedJsonText = extractJsonFromClaude(rawText);
    const parsed = JSON.parse(cleanedJsonText);

    return parsed;
  } catch (error) {
    console.error("❌ Claude API Error:", error.response?.data || error.message);
    throw error;
  }
}

module.exports = { callClaude };
