---
title: API Reference
created: 2026-03-19
updated: 2026-03-19
status: current
tags: [guides, api, reference]
---

# API Reference

Complete reference for all public APIs exported by mertex.md.

## MertexMD

The main class. Wraps the rendering pipeline with configuration management.

**Import:** `import { MertexMD } from 'mertex.md'`

### Constructor

```javascript
new MertexMD(options?)
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `breaks` | `boolean` | `true` | Convert `\n` to `<br>` |
| `gfm` | `boolean` | `true` | GitHub Flavoured Markdown |
| `headerIds` | `boolean` | `true` | Add IDs to headings |
| `katex` | `boolean` | `true` | Enable KaTeX math rendering |
| `mermaid` | `boolean` | `true` | Enable Mermaid diagram rendering |
| `highlight` | `boolean` | `true` | Enable highlight.js code highlighting |
| `sanitize` | `boolean` | `true` | Enable DOMPurify HTML sanitisation |
| `protectMath` | `boolean` | `true` | Protect math expressions from Markdown corruption |
| `renderOnRestore` | `boolean` | `true` | Render math via KaTeX during restore phase |
| `selfCorrect` | `object` | `undefined` | Self-correction config (see below) |

**selfCorrect options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `selfCorrect.fix` | `(code: string, format: string, error: string) => Promise<string>` | required | Callback to fix broken code |
| `selfCorrect.maxRetries` | `number` | `1` | Max correction attempts (capped at 3) |

### render(markdown, options?)

Render Markdown to an HTML string.

```javascript
const html = await renderer.render(markdown);
const html = await renderer.render(markdown, { mermaid: false }); // per-call override
```

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `markdown` | `string` | Markdown content |
| `options` | `object` | Optional overrides for constructor options |

**Returns:** `Promise<string>` — rendered HTML

### renderFull(markdown, options?)

Render Markdown with full result including content maps.

```javascript
const { html, mermaidMap, katexMap } = await renderer.renderFull(markdown);
```

**Returns:** `Promise<{ html: string, mermaidMap: Map, katexMap: Map }>`

- `mermaidMap` — `Map<string, string>` of mermaid placeholder IDs to source code
- `katexMap` — `Map<string, { code: string, display: boolean }>` of KaTeX block IDs to source

### renderInElement(element, markdown?, options?)

Render into a DOM element, including deferred Mermaid and KaTeX rendering.

```javascript
await renderer.renderInElement(element, markdown);
await renderer.renderInElement(element); // uses element's text content
```

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `element` | `HTMLElement` | Target DOM element |
| `markdown` | `string` | Optional Markdown (uses element text if omitted) |
| `options` | `object` | Optional overrides |

**Returns:** `Promise<void>`

### createStreamRenderer(element, options?)

Create a `StreamRenderer` for incremental/streaming content.

```javascript
const stream = renderer.createStreamRenderer(element);
```

**Returns:** `StreamRenderer` instance (see below)

### autoRender(selector?, options?)

Find all elements matching a CSS selector and render their text content.

```javascript
await renderer.autoRender('[data-markdown], .markdown-content');
```

**Parameters:**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `selector` | `string` | `'[data-markdown], .markdown-content'` | CSS selector |
| `options` | `object` | `{}` | Optional overrides |

**Returns:** `Promise<void>`

### init()

Register `autoRender()` to run on `DOMContentLoaded`.

```javascript
renderer.init();
```

---

## StreamRenderer

Returned by `MertexMD.createStreamRenderer()`. Manages streaming/incremental rendering.

### appendContent(chunk)

Append a content chunk and re-render the full accumulated content.

```javascript
const updated = await stream.appendContent(chunk);
```

**Returns:** `Promise<boolean>` — `true` if content was updated, `false` if chunk was empty

### setContent(content)

Replace all content and re-render.

```javascript
const updated = await stream.setContent(fullContent);
```

**Returns:** `Promise<boolean>`

### finalize()

Final render pass. Removes the streaming cursor, does a final KaTeX render, and renders all Mermaid diagrams.

```javascript
await stream.finalize();
```

**Returns:** `Promise<void>`

### reset()

Clear all state (accumulated content, caches, DOM) for a new streaming session.

```javascript
stream.reset();
```

### getContent()

Return the current accumulated Markdown content.

```javascript
const markdown = stream.getContent();
```

**Returns:** `string`

### getStats()

Return rendering statistics.

```javascript
const stats = stream.getStats();
```

**Returns:**
```javascript
{
  incremental: {
    renderCount: number,       // total re-renders
    formulasProcessed: number, // unique KaTeX formulas
    contentLength: number      // current content size
  },
  math: {
    rendersAttempted: number,  // chunks processed
    rendersSkipped: number,    // chunks with no new formulas
    rendersExecuted: number,   // actual KaTeX render passes
    skipRate: string           // e.g., '88.1%'
  },
  contentLength: number
}
```

---

## Standalone Functions

These are the lower-level functions that `MertexMD` wraps. Useful for custom pipelines.

### renderMarkdown(text, options?)

Core rendering pipeline. Returns full result with content maps.

```javascript
import { renderMarkdown } from 'mertex.md';
const { html, mermaidMap, katexMap } = await renderMarkdown(text, options);
```

**Parameters:** Accepts the same options as the `MertexMD` constructor, plus these additional options with different defaults:

| Option | Default | Description |
|--------|---------|-------------|
| `sanitize` | `false` | Unlike the constructor default (`true`). DOMPurify still runs if available regardless of this flag. |
| `mangle` | `false` | Disable marked.js header ID mangling |
| `katexBlocks` | `true` | Process ` ```katex ` fenced code blocks |

> [!NOTE]
> When using `renderMarkdown` directly (not via `MertexMD`), the defaults come from the function itself, not the constructor. Most notably, `sanitize` defaults to `false` here. When called through `MertexMD.render()`, the constructor defaults are merged first, so `sanitize` is `true`.

**Returns:** `Promise<{ html: string, mermaidMap: Map, katexMap: Map }>`

### renderMarkdownLegacy(text, options?)

Same as `renderMarkdown` but returns only the HTML string.

```javascript
import { renderMarkdownLegacy } from 'mertex.md';
const html = await renderMarkdownLegacy(text);
```

**Returns:** `Promise<string>`

### renderMarkdownInElement(element, options?)

Render an element's text content as Markdown in place.

```javascript
import { renderMarkdownInElement } from 'mertex.md';
await renderMarkdownInElement(element, options);
```

### autoRenderMarkdown(selector?, options?)

Find and render all matching elements.

```javascript
import { autoRenderMarkdown } from 'mertex.md';
await autoRenderMarkdown('[data-markdown]', options);
```

### initMarkdownRenderer()

Register `autoRenderMarkdown()` on `DOMContentLoaded`.

```javascript
import { initMarkdownRenderer } from 'mertex.md';
initMarkdownRenderer();
```

---

## MathProtector

Protects LaTeX math expressions from Markdown processing corruption.

```javascript
import { MathProtector } from 'mertex.md';
const protector = new MathProtector({ renderOnRestore: true });
```

### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `renderOnRestore` | `boolean` | `true` | Render math via KaTeX when restoring |
| `debug` | `boolean` | `false` | Log protection steps to console |

### protect(content)

Replace math expressions with placeholders.

```javascript
const { protected: text, mathMap } = protector.protect(content);
```

**Returns:** `{ protected: string, mathMap: Map }`

- `protected` — content with math replaced by `::MATH_0::` style placeholders
- `mathMap` — `Map<string, MathInfo>` where each entry contains:
  - `original` — the full match including delimiters
  - `encodedOriginal` — base64-encoded original
  - `display` — `boolean` (display vs inline math)
  - `innerContent` — the math content without delimiters
  - `delimiter` — `{ left, right, display, priority }`
  - `isPending` — `boolean` (true if no closing delimiter was found)

### restore(content, mathMap, selfCorrect?)

Replace placeholders with original or rendered math.

```javascript
const html = await protector.restore(htmlWithPlaceholders, mathMap);
```

**Returns:** `Promise<string>` or `string` (async only when `selfCorrect` is provided)

### reset()

Reset internal counters for reuse.

```javascript
protector.reset();
```

---

## MermaidHandler

Static utility object for Mermaid diagram handling.

```javascript
import { MermaidHandler } from 'mertex.md';
```

### protect(text)

Extract mermaid code blocks and replace with placeholder divs.

```javascript
const { protected: text, mermaidMap } = MermaidHandler.protect(markdownText);
```

**Returns:** `{ protected: string, mermaidMap: Map<string, string> }`

### renderInElement(element, mermaidMap, selfCorrect?)

Render mermaid placeholders in a DOM element as SVG diagrams.

```javascript
const count = await MermaidHandler.renderInElement(element, mermaidMap);
```

**Returns:** `Promise<number>` — count of successfully rendered diagrams

### hasMermaidBlocks(text)

Check if text contains mermaid code blocks.

```javascript
if (MermaidHandler.hasMermaidBlocks(text)) { ... }
```

**Returns:** `boolean`

### checkDiagramType(code)

Check if a mermaid diagram type is supported.

```javascript
const { supported, type, message } = MermaidHandler.checkDiagramType(code);
```

**Returns:** `{ supported: boolean, type: string, message: string }`

### isAvailable()

Check if the Mermaid library is loaded.

**Returns:** `boolean`

---

## KaTeXHandler

Static utility object for KaTeX fenced code block handling.

```javascript
import { KaTeXHandler } from 'mertex.md';
```

### protect(text)

Extract ` ```katex ` code blocks and replace with placeholder divs.

```javascript
const { protected: text, katexMap } = KaTeXHandler.protect(markdownText);
```

**Returns:** `{ protected: string, katexMap: Map<string, { code: string, display: boolean }> }`

### renderInElement(element, katexMap, selfCorrect?)

Render KaTeX placeholders in a DOM element.

```javascript
const count = await KaTeXHandler.renderInElement(element, katexMap);
```

**Returns:** `Promise<number>` — count of successfully rendered blocks

### hasKaTeXBlocks(text)

Check if text contains KaTeX fenced code blocks.

**Returns:** `boolean`

### isAvailable()

Check if the KaTeX library is loaded.

**Returns:** `boolean`

---

## selfCorrectRender

Standalone self-correction utility.

```javascript
import { selfCorrectRender } from 'mertex.md';

const result = await selfCorrectRender(code, format, error, renderFn, options);
```

**Parameters:**

| Param | Type | Description |
|-------|------|-------------|
| `code` | `string` | The broken source code |
| `format` | `"mermaid" \| "katex"` | Which renderer failed |
| `error` | `string` | Error message from the failed render |
| `renderFn` | `(code: string) => Promise<any>` | Render function — returns result or throws |
| `options` | `{ fix: Function, maxRetries?: number }` | Self-correct config |

**Returns:** `Promise<{ success: boolean, result?: any, code?: string }>`

---

## Utility Functions

### Currency Detection

```javascript
import { looksLikeCurrency, isCurrencyRange } from 'mertex.md';

looksLikeCurrency('50');       // true — likely "$50"
looksLikeCurrency('x^2');      // false — likely "$x^2$"
isCurrencyRange('$50-$100');   // true
```

### Hash Functions

```javascript
import { hashCode, hashBase36, encodeBase64, decodeBase64 } from 'mertex.md';

hashCode('hello');          // hex string hash
hashBase36('hello');        // base36 string hash
encodeBase64('hello');      // 'aGVsbG8=' (works in browser + Node)
decodeBase64('aGVsbG8=');   // 'hello'
```

### VERSION

```javascript
import { VERSION } from 'mertex.md';
console.log(VERSION); // '1.0.0'
```

---

## CSS Classes

Classes added by mertex.md during rendering:

| Class | Element | When |
|-------|---------|------|
| `markdown-rendered` | Target element | After `renderInElement()` completes |
| `markdown-error` | Target element | When `autoRender()` fails on an element |
| `mermaid-placeholder` | `<div>` | Mermaid block before SVG render |
| `mermaid-container` | `<div>` | Mermaid block after SVG render |
| `katex-placeholder` | `<div>` | KaTeX block before render |
| `katex-display-wrapper` | `<div>` | Display-mode KaTeX after render |
| `katex-inline-wrapper` | `<div>` | Inline KaTeX block after render |
| `streaming-cursor` | `<span>` | Appended during streaming, removed on `finalize()` |
| `mertex-fixing` | placeholder | During self-correction callback execution |
| `hljs` | `<code>` | Code blocks highlighted by highlight.js |
| `language-{lang}` | `<code>` | Code blocks with a specified language |

---

## UMD Globals

When loaded via `<script>` tag, the UMD build exposes:

**Top-level globals:**

| Global | Value |
|--------|-------|
| `window.MertexMD` | The `MertexMD` class with all exports attached as properties |
| `window.Mertex` | Alias for `window.MertexMD` |
| `window.MarkdownRenderer` | Legacy API: `{ render, renderLegacy, renderInElement, autoRender, init, mermaid, katex }` |
| `window.MathProtector` | `MathProtector` class |
| `window.MermaidHandler` | `MermaidHandler` object |
| `window.KaTeXHandler` | `KaTeXHandler` object |
| `window.IncrementalContentRenderer` | `IncrementalContentRenderer` class |
| `window.StreamingMathRenderer` | `StreamingMathRenderer` class |

**Properties on `window.MertexMD`:**

| Property | Value |
|----------|-------|
| `MertexMD.default` | The `MertexMD` class itself |
| `MertexMD.MertexMD` | The `MertexMD` class itself |
| `MertexMD.MathProtector` | `MathProtector` class |
| `MertexMD.IncrementalContentRenderer` | `IncrementalContentRenderer` class |
| `MertexMD.StreamingMathRenderer` | `StreamingMathRenderer` class |
| `MertexMD.MermaidHandler` | `MermaidHandler` object |
| `MertexMD.KaTeXHandler` | `KaTeXHandler` object |
| `MertexMD.renderMarkdown` | `renderMarkdown` function |
| `MertexMD.renderMarkdownLegacy` | `renderMarkdownLegacy` function |
| `MertexMD.renderMarkdownInElement` | `renderMarkdownInElement` function |
| `MertexMD.autoRenderMarkdown` | `autoRenderMarkdown` function |
| `MertexMD.initMarkdownRenderer` | `initMarkdownRenderer` function |
| `MertexMD.selfCorrectRender` | `selfCorrectRender` function |
| `MertexMD.VERSION` | Version string |
