// backend/routes/generate.js
const express = require('express');
const router = express.Router();
const { callClaudeStream } = require('../utils/callClaudeStream'); // NEW streaming util
require('dotenv').config();

let JSON5 = null;
try {
  JSON5 = require('json5');
  console.log('ℹ️ json5 available — will use as a tolerant parser if needed.');
} catch (e) {
  console.log('ℹ️ json5 not installed — falling back to built-in sanitizers.');
}

let lastPrompt = null; // avoid wasting Claude tokens

function tryParseWithSteps(raw) {
  const steps = [];
  const record = (msg) => steps.push(msg);
  const tryParse = (s) => {
    try { return { ok: true, value: JSON.parse(s) }; }
    catch (err) { return { ok: false, err }; }
  };

  if (!raw || typeof raw !== 'string') {
    record('Empty or non-string raw input.');
    return { success: false, parsed: null, steps, lastError: 'No input', cleaned: raw };
  }

  record('Attempt 0: JSON.parse(raw)');
  let attempt = tryParse(raw);
  if (attempt.ok) return { success: true, parsed: attempt.value, steps, cleaned: raw };

  if (JSON5) {
    try {
      record('Attempt 0.5: JSON5.parse(raw)');
      return { success: true, parsed: JSON5.parse(raw), steps, cleaned: raw };
    } catch { record('JSON5.parse failed on raw'); }
  }

  let cleaned = String(raw);
  record('Sanitizer 1: strip markdown fences and keep first {...} block');
  cleaned = cleaned.replace(/```(?:json)?/gi, '');
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    record(' - extracted first {...} block');
  }
  cleaned = cleaned.trim();

  record('Attempt 1: JSON.parse(cleaned)');
  attempt = tryParse(cleaned);
  if (attempt.ok) return { success: true, parsed: attempt.value, steps, cleaned };

  if (JSON5) {
    try {
      record('Attempt 1.5: JSON5.parse(cleaned)');
      return { success: true, parsed: JSON5.parse(cleaned), steps, cleaned };
    } catch { record('JSON5.parse failed on cleaned'); }
  }

  record('Sanitizers: remove comments, trailing commas, fix keys & quotes');
  cleaned = cleaned
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/([{,]\s*)([A-Za-z0-9_\-]+)\s*:/g, '$1"$2":')
    .replace(/'((?:[^'\\]|\\.)*)'/g, (_, inner) => `"${inner.replace(/"/g, '\\"')}"`)
    .replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
    .replace(/"([^"]*?)\n([^"]*?)"/gs, (_, a, b) => `"${a}\\n${b}"`)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim();

  record('Attempt 2: JSON.parse(after sanitizers)');
  attempt = tryParse(cleaned);
  if (attempt.ok) return { success: true, parsed: attempt.value, steps, cleaned };

  if (JSON5) {
    try {
      record('Attempt 2.5: JSON5.parse(after sanitizers)');
      return { success: true, parsed: JSON5.parse(cleaned), steps, cleaned };
    } catch { record('JSON5.parse failed on sanitized'); }
  }

  record('Final heuristic: wrap with {} if needed');
  if (!cleaned.startsWith('{') && cleaned.includes(':')) {
    const wrapped = `{${cleaned}}`;
    attempt = tryParse(wrapped);
    if (attempt.ok) return { success: true, parsed: attempt.value, steps, cleaned: wrapped };
    if (JSON5) {
      try { return { success: true, parsed: JSON5.parse(wrapped), steps, cleaned: wrapped }; }
      catch { record('JSON5 failed on wrapped'); }
    }
  }

  return { success: false, parsed: null, steps, lastError: attempt.err?.message || 'unknown', cleaned };
}

// STREAMING ENDPOINT
router.post('/', async (req, res) => {
  const { prompt } = req.body;
  console.log('\n📩 Prompt received:', prompt);

  if (!prompt?.trim()) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  if (lastPrompt && prompt.trim() === lastPrompt.trim()) {
    console.log('⚠️ Skipping Claude call — same prompt.');
    return res.status(200).json({ warning: 'Same prompt — skipped Claude', source: 'cache' });
  }

  // Prepare streaming headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  let buffer = '';

  try {
    await callClaudeStream(prompt, async (chunk, isFinal) => {
      buffer += chunk;
      if (!isFinal) {
        res.write(`data: ${JSON.stringify({ partial: true, raw: buffer })}\n\n`);
      } else {
        const parseResult = tryParseWithSteps(buffer);
        lastPrompt = prompt;
        if (parseResult.success) {
          res.write(`data: ${JSON.stringify({
            partial: false,
            frontend: parseResult.parsed.frontend || '',
            backend: parseResult.parsed.backend || '',
            ui: parseResult.parsed.ui || '',
            raw: parseResult.cleaned
          })}\n\n`);
        } else {
          res.write(`data: ${JSON.stringify({
            partial: true,
            error: 'Parse failed',
            lastError: parseResult.lastError,
            raw: buffer
          })}\n\n`);
        }
        res.write(`event: end\ndata: {}\n\n`);
        res.end();
      }
    });
  } catch (err) {
    console.error('❌ Claude stream failed:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
