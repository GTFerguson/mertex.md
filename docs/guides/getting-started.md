---
title: Getting Started
created: 2026-03-19
updated: 2026-03-19
status: current
tags: [guides, getting-started, installation]
---

# Getting Started

## Installation

```bash
npm install mertex.md
```

mertex.md requires `marked` and `dompurify` as peer dependencies. Optionally install `katex`, `mermaid`, and `highlight.js` for math, diagram, and code highlighting support:

```bash
npm install marked dompurify
npm install katex mermaid highlight.js  # optional
```

## Usage Patterns

### ES Module (Recommended)

For bundled applications using Vite, webpack, Rollup, or similar:

```javascript
import { MertexMD } from 'mertex.md';

const renderer = new MertexMD();
const html = await renderer.render('# Hello\n\n$E = mc^2$');
```

All render methods are async — they return Promises.

### Browser Script Tag (UMD)

Load dependencies as globals, then load the mertex UMD bundle:

```html
<!-- Required dependencies -->
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js"></script>

<!-- Optional dependencies -->
<script src="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex/dist/contrib/auto-render.min.js"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.css">
<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/highlight.js/lib/core.min.js"></script>

<!-- mertex.md -->
<script src="path/to/mertex.umd.js"></script>

<script>
  const renderer = new MertexMD.default();
  renderer.render('# Hello $E=mc^2$').then(html => {
    document.getElementById('content').innerHTML = html;
  });
</script>
```

> [!NOTE]
> In UMD mode, use `new MertexMD.default()` (not `new MertexMD()`). The UMD global `MertexMD` is a namespace containing all exports; the class itself is at `MertexMD.default` or `MertexMD.MertexMD`.

### Bundled Version

The `dist/mertex.bundled.min.js` build includes `marked` and `DOMPurify` — you only need to provide optional dependencies:

```html
<script src="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
<script src="path/to/mertex.bundled.min.js"></script>
```

---

## Rendering Methods

### Basic Render

Returns an HTML string:

```javascript
const renderer = new MertexMD();
const html = await renderer.render('**Bold** and $x^2 + y^2 = z^2$');
// html: '<p><strong>Bold</strong> and <span class="katex">...</span></p>'
```

### Full Render (with maps)

Returns the HTML plus maps of protected content for deferred rendering:

```javascript
const { html, mermaidMap, katexMap } = await renderer.renderFull(markdown);
// mermaidMap: Map<id, mermaidSourceCode>
// katexMap: Map<id, { code, display }>
```

### Render into DOM Element

Renders directly into an element, including deferred Mermaid SVG and KaTeX block rendering:

```javascript
await renderer.renderInElement(document.getElementById('content'), markdown);
```

If no markdown string is provided, it uses the element's existing text content:

```javascript
await renderer.renderInElement(document.getElementById('content'));
```

### Auto-render All Matching Elements

Finds elements by CSS selector and renders their text content as Markdown:

```javascript
await renderer.autoRender('[data-markdown], .markdown-content');
```

### Auto-render on Page Load

Calls `autoRender()` on `DOMContentLoaded`:

```javascript
renderer.init();
```

---

## Constructor Options

```javascript
const renderer = new MertexMD({
  // Markdown settings
  breaks: true,           // Convert \n to <br> (default: true)
  gfm: true,              // GitHub Flavoured Markdown (default: true)
  headerIds: true,        // Add IDs to headings (default: true)

  // Feature toggles
  katex: true,            // Enable KaTeX rendering (default: true)
  mermaid: true,          // Enable Mermaid rendering (default: true)
  highlight: true,        // Enable highlight.js (default: true)

  // Protection
  sanitize: true,         // Enable DOMPurify (default: true)
  protectMath: true,      // Protect math from Markdown corruption (default: true)
  renderOnRestore: true,  // Render math during restore phase (default: true)

  // Self-correction (optional — see self-correcting-render guide)
  selfCorrect: {
    fix: async (code, format, error) => correctedCode,
    maxRetries: 1          // 1-3 (default: 1)
  }
});
```

> [!TIP]
> Leave `protectMath: true` (the default) unless you have a specific reason to disable it. When enabled, MathProtector handles all `$` disambiguation, preventing currency values like `$50` from being incorrectly rendered as math. When disabled, KaTeX's auto-render runs instead, which does not distinguish currency from math.

Options can be overridden per-call:

```javascript
// Disable mermaid for this one render
const html = await renderer.render(markdown, { mermaid: false });
```

---

## Supported Formats

### Math Delimiters

| Delimiter | Type | Example |
|-----------|------|---------|
| `$...$` | Inline math | `$x^2$` |
| `$$...$$` | Display math | `$$\sum_{i=0}^n x_i$$` |
| `\(...\)` | Inline math | `\(x^2\)` |
| `\[...\]` | Display math | `\[\sum_{i=0}^n x_i\]` |
| ` ```katex ` | Display math block | Fenced code block with `katex` language |

### Mermaid Diagram Types

Fenced code blocks with the `mermaid` language identifier are rendered as SVG diagrams:

````markdown
```mermaid
flowchart TD
    A --> B
```
````

Supported types: graph, flowchart, sequenceDiagram, classDiagram, stateDiagram, erDiagram, journey, gantt, pie, quadrantChart, requirementDiagram, gitGraph, mindmap, timeline, zenuml, C4Context, C4Container, C4Component, C4Dynamic, C4Deployment, sankey, xychart, block.

---

## Exported API Surface

For consumers who need lower-level access, all internal components are exported:

```javascript
import {
  MertexMD,                      // Main class
  MathProtector,                 // Math protection/restoration
  renderMarkdown,                // Core render function
  renderMarkdownLegacy,          // Returns HTML string only
  renderMarkdownInElement,       // DOM element rendering
  autoRenderMarkdown,            // Auto-render by selector
  initMarkdownRenderer,          // Init on DOMContentLoaded
  IncrementalContentRenderer,    // Streaming renderer internals
  MermaidHandler,                // Mermaid protection/rendering
  KaTeXHandler,                  // KaTeX block protection/rendering
  StreamingMathRenderer,         // Streaming math internals
  selfCorrectRender,             // Self-correction utility
  hashCode, hashBase36,          // Hash functions
  encodeBase64, decodeBase64,    // Base64 utilities
  looksLikeCurrency,             // Currency detection
  isCurrencyRange,               // Currency range detection
  VERSION                        // Package version string
} from 'mertex.md';
```

---

## Next Steps

- [[streaming]] — Real-time rendering for LLM output and streaming APIs
- [[self-correcting-render]] — Auto-fix broken Mermaid/KaTeX with LLM-powered correction
