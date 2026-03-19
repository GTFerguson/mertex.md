---
title: Streaming Rendering
created: 2026-03-19
updated: 2026-03-19
status: current
tags: [guides, streaming, llm]
---

# Streaming Rendering

mertex.md's `StreamRenderer` is designed for real-time content — LLM output, collaborative editing, or any source that delivers Markdown in chunks. It renders the full accumulated content on each update while caching expensive operations (Mermaid SVGs, KaTeX formulas) across re-renders.

## Basic Usage

```javascript
import { MertexMD } from 'mertex.md';

const renderer = new MertexMD();
const element = document.getElementById('content');
const stream = renderer.createStreamRenderer(element);

// As chunks arrive:
for await (const chunk of source) {
  await stream.appendContent(chunk);
}

// When the source is done:
await stream.finalize();
```

## StreamRenderer API

| Method | Returns | Description |
|--------|---------|-------------|
| `appendContent(chunk)` | `Promise<boolean>` | Append a chunk and re-render. Returns `true` if content updated. |
| `setContent(content)` | `Promise<boolean>` | Replace all content and re-render. |
| `finalize()` | `Promise<void>` | Final render pass — removes streaming cursor, renders Mermaid diagrams. |
| `reset()` | `void` | Clear all state and DOM for a new rendering session. |
| `getContent()` | `string` | Return the current accumulated content. |
| `getStats()` | `Object` | Return rendering statistics. |

## How It Works

Each `appendContent()` call:

1. Appends the chunk to the accumulated content string
2. Runs the full rendering pipeline on the entire accumulated content
3. Replaces `element.innerHTML` with the new rendered HTML
4. Restores cached Mermaid SVGs (avoids re-rendering diagrams)
5. Tracks KaTeX formula signatures — only renders new formulas
6. Appends a `.streaming-cursor` element for visual feedback

`finalize()` triggers a final Mermaid render pass for any diagrams that appeared in the last chunks, and removes the streaming cursor.

> [!NOTE]
> The full re-render approach is simpler and more correct than incremental DOM patching. The caching of Mermaid SVGs and KaTeX formula tracking prevents it from being expensive despite re-rendering everything.

---

## Integrating with LLM APIs

### Fetch + ReadableStream

For any API that returns a streaming response body (OpenAI, Anthropic, etc.):

```javascript
const renderer = new MertexMD();
const stream = renderer.createStreamRenderer(document.getElementById('output'));

const response = await fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({ messages }),
  headers: { 'Content-Type': 'application/json' }
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  await stream.appendContent(decoder.decode(value));
}

await stream.finalize();
```

### Server-Sent Events (SSE)

For APIs that use SSE (common with OpenAI-compatible endpoints):

```javascript
const renderer = new MertexMD();
const stream = renderer.createStreamRenderer(document.getElementById('output'));

const eventSource = new EventSource('/api/stream');

eventSource.onmessage = async (event) => {
  if (event.data === '[DONE]') {
    await stream.finalize();
    eventSource.close();
    return;
  }

  const data = JSON.parse(event.data);
  const chunk = data.choices?.[0]?.delta?.content;
  if (chunk) {
    await stream.appendContent(chunk);
  }
};
```

### Anthropic SDK (Messages API)

```javascript
import Anthropic from '@anthropic-ai/sdk';
import { MertexMD } from 'mertex.md';

const client = new Anthropic();
const renderer = new MertexMD();
const stream = renderer.createStreamRenderer(document.getElementById('output'));

const response = await client.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 4096,
  messages: [{ role: 'user', content: prompt }],
  stream: true
});

for await (const event of response) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    await stream.appendContent(event.delta.text);
  }
}

await stream.finalize();
```

---

## Multi-Turn Conversations

Use `reset()` between messages to clear the renderer state:

```javascript
const stream = renderer.createStreamRenderer(element);

// First message
for await (const chunk of firstResponse) {
  await stream.appendContent(chunk);
}
await stream.finalize();

// User sends another message — reset and start fresh
stream.reset();

for await (const chunk of secondResponse) {
  await stream.appendContent(chunk);
}
await stream.finalize();
```

> [!IMPORTANT]
> Always call `reset()` before starting a new stream. Without it, the renderer accumulates content from the previous stream and caches become stale.

---

## Styling the Streaming Cursor

During streaming, a `.streaming-cursor` span is appended to the target element. Style it to provide visual feedback:

```css
.streaming-cursor {
  display: inline-block;
  width: 8px;
  height: 1.2em;
  background-color: currentColor;
  animation: blink 1s step-end infinite;
  vertical-align: text-bottom;
  margin-left: 2px;
}

@keyframes blink {
  50% { opacity: 0; }
}
```

The cursor is automatically removed when `finalize()` is called.

---

## Monitoring Performance

Use `getStats()` to monitor streaming performance:

```javascript
const stats = stream.getStats();
console.log(stats);
// {
//   incremental: {
//     renderCount: 42,          // total re-renders
//     formulasProcessed: 5,     // unique KaTeX formulas rendered
//     contentLength: 3200       // current content size
//   },
//   math: {
//     rendersAttempted: 42,     // chunks processed
//     rendersSkipped: 37,       // chunks with no new formulas
//     rendersExecuted: 5,       // actual KaTeX render passes
//     skipRate: '88.1%'         // efficiency metric
//   },
//   contentLength: 3200
// }
```

A high `skipRate` is good — it means the renderer is efficiently avoiding redundant KaTeX passes.

---

## Combining Streaming with Self-Correction

Streaming and self-correction work together. Configure `selfCorrect` on the renderer and it applies to the `finalize()` Mermaid render pass:

```javascript
const renderer = new MertexMD({
  selfCorrect: {
    fix: async (code, format, error) => {
      return await fixWithLLM(code, format, error);
    },
    maxRetries: 2
  }
});

const stream = renderer.createStreamRenderer(element);
// ... stream chunks ...
await stream.finalize(); // Mermaid diagrams get self-correction on failure
```

See [[self-correcting-render]] for details on implementing the `fix` callback.
