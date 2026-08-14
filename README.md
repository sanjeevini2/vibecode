# 1stPrinci

An AI agent that helps you think through a problem or a piece of customer pain using **first-principles reasoning**: strip away assumptions and inherited conventions, get down to what's actually true, then reconstruct a solution from the ground up.

Rather than answering questions for you, 1stPrinci runs a Socratic process:

1. **Clarify** the problem or customer pain into something concrete.
2. **Surface assumptions** baked into how it's currently framed.
3. **Strip to fundamentals** by drilling with "how do we know that?" until it hits verifiable facts, real constraints, or explicit unknowns.
4. **Diagnose the root cause** (the underlying need), not just the symptom.
5. **Reconstruct a solution** from the fundamentals only — ignoring the legacy/default approach.
6. **Pressure-test** it, and identify the cheapest experiment to validate the riskiest assumption.

On request (or once the conversation converges), it produces a tight structured summary: problem statement, assumptions (tagged fact/belief/guess), fundamental truths, root cause, reconstructed solution, and the riskiest assumption + cheapest test.

## Running it

```bash
npm install
cp .env.example .env   # then add your ANTHROPIC_API_KEY
npm start
```

Open http://localhost:3000 and describe a problem or customer pain point to start.

## How it's built

- `server.js` — Express server. `POST /api/chat` streams a response from Claude (via `@anthropic-ai/sdk`) over Server-Sent Events, keeping the API key server-side.
- `lib/systemPrompt.js` — the 1stPrinci system prompt: the stage-by-stage first-principles process and the structured-summary format.
- `public/` — a small vanilla HTML/CSS/JS chat UI. No build step.

Conversation history is kept client-side in memory (not persisted) and resent with each turn; click "New session" to clear it.

## Configuration

Set in `.env` (see `.env.example`):

- `ANTHROPIC_API_KEY` — required.
- `ANTHROPIC_MODEL` — defaults to `claude-sonnet-4-5`.
- `PORT` — defaults to `3000`.
