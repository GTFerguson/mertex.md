/**
 * MertexMD - Main class for markdown rendering with math and diagrams
 */

import { renderMarkdown, renderMarkdownInElement, autoRenderMarkdown, initMarkdownRenderer } from './core/markdown-renderer.js';
import { MathProtector } from './core/math-protector.js';
import { IncrementalContentRenderer } from './core/incremental-renderer.js';
import { MermaidHandler } from './handlers/mermaid-handler.js';
import { KaTeXHandler } from './handlers/katex-handler.js';
import { StreamingMathRenderer } from './handlers/streaming-math-renderer.js';

export class MertexMD {
    constructor(options = {}) {
        this.options = {
            breaks: true,
            gfm: true,
            headerIds: true,
            katex: true,
            mermaid: true,
            highlight: true,
            sanitize: true,
            protectMath: true,
            renderOnRestore: true,
            ...options
        };
    }
    
    /**
     * Render markdown to HTML string
     * @param {string} markdown - Markdown content
     * @param {Object} options - Override options for this render
     * @returns {string} HTML string
     */
    render(markdown, options = {}) {
        const config = { ...this.options, ...options };
        const result = renderMarkdown(markdown, config);
        return typeof result === 'object' ? result.html : result;
    }
    
    /**
     * Render markdown with full result including maps
     * @param {string} markdown - Markdown content
     * @param {Object} options - Override options for this render
     * @returns {Object} { html, mermaidMap, katexMap }
     */
    renderFull(markdown, options = {}) {
        const config = { ...this.options, ...options };
        return renderMarkdown(markdown, config);
    }
    
    /**
     * Render markdown into a DOM element
     * @param {HTMLElement} element - Target element
     * @param {string} markdown - Markdown content (optional, uses element content if not provided)
     * @param {Object} options - Override options
     * @returns {Promise<void>}
     */
    async renderInElement(element, markdown, options = {}) {
        if (!element) return;
        
        const config = { ...this.options, ...options };
        
        if (markdown) {
            element.textContent = markdown;
        }
        
        await renderMarkdownInElement(element, config);
    }
    
    /**
     * Create a streaming renderer for real-time content
     * @param {HTMLElement} targetElement - Element to render into
     * @param {Object} options - Override options
     * @returns {StreamRenderer}
     */
    createStreamRenderer(targetElement, options = {}) {
        const config = { ...this.options, ...options };
        return new StreamRenderer(targetElement, config);
    }
    
    /**
     * Auto-render all matching elements
     * @param {string} selector - CSS selector
     * @param {Object} options - Override options
     * @returns {Promise<void>}
     */
    async autoRender(selector, options = {}) {
        const config = { ...this.options, ...options };
        await autoRenderMarkdown(selector, config);
    }
    
    /**
     * Initialize auto-rendering on DOMContentLoaded
     */
    init() {
        initMarkdownRenderer();
    }
}

/**
 * StreamRenderer - Handles streaming/incremental content rendering
 */
class StreamRenderer {
    constructor(targetElement, options = {}) {
        this.targetElement = targetElement;
        this.options = options;
        this.content = '';
        this.incrementalRenderer = new IncrementalContentRenderer();
        this.streamingMathRenderer = new StreamingMathRenderer();
    }
    
    /**
     * Append content chunk and re-render
     * @param {string} chunk - New content to append
     * @returns {boolean} True if content was updated
     */
    appendContent(chunk) {
        if (!chunk) return false;
        
        this.content += chunk;
        
        const updated = this.incrementalRenderer.appendNewContent(
            this.targetElement,
            this.content,
            (md, opts) => renderMarkdown(md, { ...this.options, ...opts })
        );
        
        if (updated) {
            this.streamingMathRenderer.processChunk(this.content, this.targetElement);
        }
        
        return updated;
    }
    
    /**
     * Set full content (replaces existing)
     * @param {string} content - Full content
     * @returns {boolean} True if content was updated
     */
    setContent(content) {
        this.content = content || '';
        
        return this.incrementalRenderer.appendNewContent(
            this.targetElement,
            this.content,
            (md, opts) => renderMarkdown(md, { ...this.options, ...opts })
        );
    }
    
    /**
     * Finalize rendering (call when streaming completes)
     */
    async finalize() {
        // Remove streaming cursor
        const cursor = this.targetElement.querySelector('.streaming-cursor');
        if (cursor) cursor.remove();
        
        // Final math render
        this.streamingMathRenderer.finalRender(this.targetElement);
        
        // Render mermaid diagrams
        const result = renderMarkdown(this.content, this.options);
        if (result.mermaidMap && result.mermaidMap.size > 0) {
            await MermaidHandler.renderInElement(this.targetElement, result.mermaidMap);
        }
    }
    
    /**
     * Reset for new content
     */
    reset() {
        this.content = '';
        this.incrementalRenderer.reset();
        this.streamingMathRenderer.reset();
        this.targetElement.innerHTML = '';
    }
    
    /**
     * Get current content
     * @returns {string}
     */
    getContent() {
        return this.content;
    }
    
    /**
     * Get rendering statistics
     * @returns {Object}
     */
    getStats() {
        return {
            incremental: this.incrementalRenderer.getStats(),
            math: this.streamingMathRenderer.getStats(),
            contentLength: this.content.length
        };
    }
}

// Export for convenience
MertexMD.StreamRenderer = StreamRenderer;
MertexMD.MathProtector = MathProtector;
MertexMD.MermaidHandler = MermaidHandler;
MertexMD.KaTeXHandler = KaTeXHandler;
MertexMD.IncrementalContentRenderer = IncrementalContentRenderer;
MertexMD.StreamingMathRenderer = StreamingMathRenderer;

export default MertexMD;
