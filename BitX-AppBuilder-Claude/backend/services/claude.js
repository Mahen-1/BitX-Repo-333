// backend/services/claude.js
const { createClaudeClient } = require('../claude/claudeClient');

async function generateAppFromClaude(prompt) {
  const claude = await createClaudeClient();

  const fullPrompt = `
You are an AI app generator. Given a user prompt, respond ONLY with JSON (no commentary, no text, no triple backticks, no markdown). Follow this format:

{
  "frontend": {
    "package.json": "...",
    "src/index.js": "...",
    ...
  },
  "backend": {
    "index.js": "...",
    ...
  },
  "ui": {
    "components/Button.jsx": "...",
    ...
  }
}

Only respond with valid JSON.

User prompt: ${prompt}
`;

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-20250514', // ✅ or 'claude-sonnet-4' if that works for you
    max_tokens: 60000,
    messages: [{ role: 'user', content: fullPrompt }],
  });

  const content = response.content[0].text;

  // Clean any markdown wrappers
  const cleaned = content
    .replace(/^```json/, '')
    .replace(/^```/, '')
    .replace(/```$/, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    console.error('❌ JSON parse error:', error.message);
    console.error('⚠️ Raw Claude response:', cleaned);
    throw new Error('Claude returned invalid JSON');
  }
}

module.exports = { generateAppFromClaude };
