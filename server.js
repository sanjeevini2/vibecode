require('dotenv').config();
const express = require('express');
const path = require('path');
const Anthropic = require('@anthropic-ai/sdk');
const { SYSTEM_PROMPT } = require('./lib/systemPrompt');

const PORT = process.env.PORT || 3000;
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('[1stPrinci] Warning: ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.');
}

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function isValidMessages(messages) {
  return (
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= 200 &&
    messages.every(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length > 0 &&
        m.content.length <= 20000
    )
  );
}

app.post('/api/chat', async (req, res) => {
  const { messages } = req.body || {};

  if (!isValidMessages(messages)) {
    return res.status(400).json({ error: 'Invalid request: messages must be a non-empty array of {role, content} with role user/assistant.' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = anthropic.messages.stream({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages,
    });

    stream.on('text', (delta) => {
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    });

    stream.on('error', (err) => {
      console.error('[1stPrinci] stream error', err);
      res.write(`data: ${JSON.stringify({ error: 'Upstream error while generating a response.' })}\n\n`);
      res.end();
    });

    await stream.finalMessage();
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[1stPrinci] request error', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to reach the model.' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Failed to reach the model.' })}\n\n`);
      res.end();
    }
  }
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, model: MODEL, configured: Boolean(process.env.ANTHROPIC_API_KEY) });
});

app.listen(PORT, () => {
  console.log(`[1stPrinci] listening on http://localhost:${PORT}`);
});
