# mertex.md

A JavaScript library for rendering Markdown with LaTeX math (KaTeX) and Mermaid diagrams. Designed for both static rendering and real-time streaming scenarios.

## Features

- **Markdown Rendering**: Full GitHub Flavored Markdown support via marked.js
- **Math Protection**: Protects LaTeX expressions from markdown processing corruption
- **KaTeX Integration**: Renders inline (`$...$`) and display (`$$...$$`) math
- **Mermaid Diagrams**: Renders mermaid code blocks as SVG diagrams
- **Streaming Support**: Optimized incremental rendering for real-time content
- **XSS Protection**: Built-in HTML sanitization via DOMPurify
- **Syntax Highlighting**: Code block highlighting via highlight.js

## Installation

```bash
npm install mertex.md
```

## Quick Start

### Static Rendering

```javascript
import { MertexMD } from 'mertex.md';

const renderer = new MertexMD();
const html = renderer.render('# Hello **World**\n\n$E = mc^2$');
document.getElementById('content').innerHTML = html;
```

### Streaming Rendering

```javascript
import { MertexMD } from 'mertex.md';

const renderer = new MertexMD();
const targetElement = document.getElementById('content');
const stream = renderer.createStreamRenderer(targetElement);

// As chunks arrive from your streaming source:
stream.appendContent('# Hello ');
stream.appendContent('**World**\n\n');
stream.appendContent('$E = mc^2$');

// When streaming completes:
stream.finalize();

// Reset for new content:
stream.reset();
```

### Browser Usage (UMD)

```html
<!-- Dependencies -->
<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex/dist/contrib/auto-render.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/highlight.js/lib/core.min.js"></script>

<!-- Mertex.md -->
<script src="path/to/mertex.umd.js"></script>

<script>
  const renderer = new MertexMD.default();
  const html = renderer.render('# Hello $E=mc^2$');
</script>
```

## API Reference

### `MertexMD` Class

#### Constructor Options

```javascript
const renderer = new MertexMD({
  breaks: true,        // Convert line breaks to <br>
  gfm: true,           // GitHub Flavored Markdown
  headerIds: true,     // Add IDs to headers
  katex: true,         // Enable KaTeX math rendering
  mermaid: true,       // Enable Mermaid diagram rendering
  highlight: true,     // Enable syntax highlighting
  sanitize: true,      // Enable HTML sanitization
  protectMath: true,   // Protect math from markdown corruption
  renderOnRestore: true // Render math during restore phase
});
```

#### Methods

- **`render(markdown)`** - Render markdown to HTML string
- **`renderFull(markdown)`** - Render and return `{ html, mermaidMap, katexMap }`
- **`createStreamRenderer(element)`** - Create a streaming renderer
- **`renderInElement(element, markdown)`** - Render into a DOM element
- **`autoRender(selector)`** - Auto-render all matching elements
- **`init()`** - Initialize auto-rendering on DOMContentLoaded

### Stream Renderer

```javascript
const stream = renderer.createStreamRenderer(element);

stream.appendContent(chunk);  // Append new content chunk
stream.setContent(content);   // Replace content entirely
stream.finalize();            // Complete rendering
stream.reset();               // Reset for new content
stream.getContent();          // Get current content
stream.getStats();            // Get rendering statistics
```

## Dependencies

### Required
- [marked](https://marked.js.org/) - Markdown parser
- [DOMPurify](https://github.com/cure53/DOMPurify) - HTML sanitizer

### Optional (for enhanced features)
- [KaTeX](https://katex.org/) - Math rendering
- [Mermaid](https://mermaid.js.org/) - Diagram rendering
- [highlight.js](https://highlightjs.org/) - Syntax highlighting

## Building

```bash
npm install
npm run build
```

This generates:
- `dist/mertex.esm.js` - ES module version
- `dist/mertex.umd.js` - UMD version for browsers
- `dist/mertex.min.js` - Minified UMD version

## License

MIT © Gary Ferguson
