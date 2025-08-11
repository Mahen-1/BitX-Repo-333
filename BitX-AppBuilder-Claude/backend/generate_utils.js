const fs = require("fs");
const path = require("path");
const axios = require("axios");
require("dotenv").config();

const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY;

async function fetchClaudeAppCode(prompt) {
  const claudePrompt = `
You are a full-stack developer. Given this vague or detailed idea: "${prompt}", do the following:

1. Create a clean responsive React + Tailwind UI based on the idea.
2. Infer what kind of interface is needed even if the prompt is vague.
3. Generate 2 outputs:
  - Full frontend React component code (with imports)
  - A clean HTML preview for UI/UX
4. Respond in this JSON format only:

{
  "frontendCode": "<react_code_here>",
  "uiPreviewHTML": "<full_html_here>"
}
`;

  try {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-3-sonnet-20240229",
        max_tokens: 2048,
        temperature: 0.5,
        messages: [
          {
            role: "user",
            content: claudePrompt,
          },
        ],
      },
      {
        headers: {
          "x-api-key": CLAUDE_API_KEY,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
      }
    );

    const raw = response.data?.content?.[0]?.text?.trim();
    const clean = raw?.replace(/^```json|```$/g, "").trim();

    const jsonOutput = JSON.parse(clean);
    return jsonOutput;
  } catch (err) {
    console.error("Claude API Error:", err.response?.data || err.message);
    return { error: "Claude failed to generate output." };
  }
}

function createReactAppFiles(appName, frontendCode) {
  const appFolder = path.join(__dirname, "generated", appName);
  fs.mkdirSync(appFolder, { recursive: true });

  const indexJs = `
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;

  const appJs = frontendCode;

  fs.writeFileSync(path.join(appFolder, "App.jsx"), appJs);
  fs.writeFileSync(path.join(appFolder, "index.js"), indexJs);
}

module.exports = {
  fetchClaudeAppCode,
  createReactAppFiles,
};
