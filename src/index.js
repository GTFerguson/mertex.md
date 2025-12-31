/**
 * mertex.md - Main entry point
 */

export { MertexMD, default } from './mertex.js';
export { MathProtector } from './core/math-protector.js';
export { renderMarkdown, renderMarkdownLegacy, renderMarkdownInElement, autoRenderMarkdown, initMarkdownRenderer } from './core/markdown-renderer.js';
export { IncrementalContentRenderer } from './core/incremental-renderer.js';
export { MermaidHandler } from './handlers/mermaid-handler.js';
export { KaTeXHandler } from './handlers/katex-handler.js';
export { StreamingMathRenderer } from './handlers/streaming-math-renderer.js';
export { hashCode, hashBase36, encodeBase64, decodeBase64 } from './utils/hash.js';
export { looksLikeCurrency, isCurrencyRange } from './utils/currency-detector.js';
export const VERSION = '1.0.0';
