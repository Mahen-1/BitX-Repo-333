import express from "express";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

router.post("/", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }

  // Set headers for streaming response
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Transfer-Encoding", "chunked");
  res.flushHeaders?.(); // For some Node environments

  try {
    let fullText = "";

    const stream = await anthropic.messages.stream({
      model: "claude-3.5-sonnet",
      max_tokens: 4096,
      temperature: 0,
      messages: [{ role: "user", content: prompt }],
    });

    stream.on("text", (text) => {
      fullText += text;
      const chunk = JSON.stringify({
        partial: true,
        code: fullText,
      }) + "\n";
      res.write(chunk);
    });

    stream.on("end", () => {
      const finalChunk = JSON.stringify({
        partial: false,
        code: fullText,
        error: null,
      }) + "\n";
      res.write(finalChunk);
      res.end();
    });

    stream.on("error", (err) => {
      const errorChunk = JSON.stringify({
        partial: false,
        code: fullText || "",
        error: err.message || "Unknown error",
      }) + "\n";
      res.write(errorChunk);
      res.end();
    });

  } catch (err) {
    const errorChunk = JSON.stringify({
      partial: false,
      code: "",
      error: err.message || "Unexpected error",
    }) + "\n";
    res.write(errorChunk);
    res.end();
  }
});

export default router;
