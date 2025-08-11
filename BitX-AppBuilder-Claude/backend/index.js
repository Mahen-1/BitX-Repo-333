// backend/index.js
import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch"; // Node >=18 can use global fetch
import cors from "cors";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json({ limit: "20mb" }));

/**
 * Extracts the first valid JSON or code block from the AI output text.
 */
function extractJsonString(text) {
  if (!text || typeof text !== "string") return null;

  // Remove triple backticks if present
  let cleaned = text.replace(/```(?:json|html|javascript)?\n?([\s\S]*?)```/gi, "$1");
  cleaned = cleaned.replace(/^\uFEFF/, ""); // Remove BOM if present

  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  const startIndex =
    firstBrace === -1
      ? firstBracket
      : firstBracket === -1
      ? firstBrace
      : Math.min(firstBrace, firstBracket);
  if (startIndex === -1) return null;

  let inString = false;
  let escape = false;
  let depth = 0;
  const openChar = cleaned[startIndex];
  const closeChar = openChar === "{" ? "}" : "]";

  for (let i = startIndex; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        return cleaned.slice(startIndex, i + 1);
      }
    }
  }
  return null;
}

// ✅ Validate output structure
function isValidClaudeJson(obj) {
  return (
    obj &&
    (typeof obj === "string" ||
      (typeof obj === "object" && obj.code && typeof obj.code === "string"))
  );
}

app.post("/api/generate-app", async (req, res) => {
  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "prompt required" });
  }

  try {
    const anthropicBody = {
      model: "claude-sonnet-4-20250514",
      messages: [
        {
          role: "user",
          content: `You are an AI that outputs a single JSON object containing "code" as a string. Only output valid JSON. Generate code for: ${prompt}`
        }
      ],
      max_tokens: 60000
    };

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify(anthropicBody)
    });

    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.error("Anthropic error:", resp.status, txt);
      return res
        .status(502)
        .json({ error: `Anthropic API error: ${resp.status}`, details: txt.slice(0, 500) });
    }

    const apiJson = await resp.json().catch((err) => {
      throw new Error(`Invalid JSON from API: ${err.message}`);
    });

    console.log("📥 Claude API JSON keys:", Object.keys(apiJson || {}));

    const rawText = String(apiJson?.content?.[0]?.text || "");
    console.log("📜 Claude text output (first 200 chars):", rawText.slice(0, 200));

    const candidate = extractJsonString(rawText);
    if (!candidate) {
      return res.status(500).json({
        error: "no_json_found",
        raw: rawText.slice(0, 500)
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(candidate);
    } catch (e) {
      console.error("JSON.parse failed:", e.message);
      return res.status(500).json({
        error: "invalid_json",
        message: e.message,
        candidate: candidate.slice(0, 500)
      });
    }

    if (!isValidClaudeJson(parsed)) {
      return res.status(422).json({
        error: "invalid_structure",
        message: "Claude JSON missing 'code' string",
        parsedPreview: JSON.stringify(parsed).slice(0, 300)
      });
    }

    const codeOutput = typeof parsed === "string" ? parsed : parsed.code;
    return res.json({ code: codeOutput });

  } catch (err) {
    console.error("❌ Claude failed:", err);
    return res.status(500).json({ error: err.message });
  }
});

// ✅ Catch-all to prevent process crash
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Rejection:", reason);
});

app.listen(PORT, () => {
  console.log(`🟢 Backend running at http://localhost:${PORT}`);
});
