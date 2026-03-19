---
title: Dependencies
created: 2026-03-19
updated: 2026-03-19
status: current
tags: [architecture, dependencies]
---

# Dependencies

## External Libraries

mertex.md uses peer dependencies — consumers provide them. All libraries are detected at runtime via global variable checks, allowing the library to work in both `<script>` tag and ES module environments.

### Required Peer Dependencies

| Library | Version | Purpose | Detection |
|---------|---------|---------|-----------|
| [marked](https://marked.js.org/) | >=9.0.0 | Markdown parsing (GFM support) | `typeof marked !== 'undefined'` or `window.marked` |
| [DOMPurify](https://github.com/cure53/DOMPurify) | >=3.0.0 | HTML sanitisation (XSS protection) | `typeof DOMPurify !== 'undefined'` or `window.DOMPurify` |

Without these, mertex.md will still run but will return unsanitised, unparsed content.

### Optional Peer Dependencies

| Library | Purpose | Detection | Fallback |
|---------|---------|-----------|----------|
| [KaTeX](https://katex.org/) | Math expression rendering | `typeof katex !== 'undefined'` or `window.katex` | Math expressions are restored as raw LaTeX text |
| [KaTeX auto-render](https://katex.org/docs/autorender) | DOM-based math rendering | `typeof renderMathInElement !== 'undefined'` | Only used when `protectMath: false` |
| [Mermaid](https://mermaid.js.org/) | Diagram rendering to SVG | `typeof mermaid !== 'undefined'` or `window.mermaid` | Mermaid blocks remain as `<div>` placeholders |
| [highlight.js](https://highlightjs.org/) | Code syntax highlighting | `typeof hljs !== 'undefined'` or `window.hljs` | Code blocks rendered without highlighting |

### Dev Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| [esbuild](https://esbuild.github.io/) | ^0.19.0 | JavaScript bundler — builds 4 output formats |
| [jsdom](https://github.com/jsdom/jsdom) | ^27.4.0 | DOM implementation for Node.js test runner |

## Build Outputs

The build script (`build.js`) produces four bundles, all with external peer dependencies:

| Output | Format | File | Externals | Use Case |
|--------|--------|------|-----------|----------|
| ESM | ES module | `dist/mertex.esm.js` | All peers | Modern bundlers (Vite, webpack, Rollup) |
| UMD | IIFE (`Mertex` global) | `dist/mertex.umd.js` | All peers | Browser `<script>` tags |
| Minified | IIFE minified | `dist/mertex.min.js` | All peers | Production browser use |
| Bundled | IIFE minified | `dist/mertex.bundled.min.js` | KaTeX, Mermaid, highlight.js | Browser with marked+DOMPurify bundled |

The UMD, minified, and bundled builds include a footer script that exposes backward-compatible globals:
- `window.MertexMD` — primary global (class + all exports)
- `window.Mertex` — alias for `MertexMD`
- `window.MarkdownRenderer` — legacy API shape
- `window.MathProtector`, `window.MermaidHandler`, etc. — individual component globals

## DOMPurify Configuration

The sanitiser is configured with an explicit allowlist (`markdown-renderer.js:101-121`):

**Allowed tags:** Standard HTML (`p`, `br`, `strong`, `em`, headings, lists, tables, links, images), SVG elements (`svg`, `g`, `path`, `rect`, `circle`, `text`, etc.), and utility elements (`span`, `div`, `hr`).

**Allowed attributes:** Standard (`href`, `src`, `class`, `id`), data attributes for mertex (`data-mermaid-id`, `data-mermaid`, `data-katex-id`), SVG presentation attributes (`d`, `fill`, `stroke`, `transform`, `viewBox`, etc.), and accessibility attributes (`aria-hidden`, `role`).

> [!NOTE]
> The `style` attribute is allowed to support Mermaid SVG output, which uses inline styles for diagram rendering.
