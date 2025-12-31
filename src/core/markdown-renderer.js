/**
 * Unified Markdown Renderer
 */

import { MathProtector } from './math-protector.js';
import { MermaidHandler } from '../handlers/mermaid-handler.js';
import { KaTeXHandler } from '../handlers/katex-handler.js';

function getMarked() {
    if (typeof marked !== 'undefined') return marked;
    if (typeof window !== 'undefined' && window.marked) return window.marked;
    return null;
}

function getDOMPurify() {
    if (typeof DOMPurify !== 'undefined') return DOMPurify;
    if (typeof window !== 'undefined' && window.DOMPurify) return window.DOMPurify;
    return null;
}

function getHljs() {
    if (typeof hljs !== 'undefined') return hljs;
    if (typeof window !== 'undefined' && window.hljs) return window.hljs;
    return null;
}

function getRenderMathInElement() {
    if (typeof renderMathInElement !== 'undefined') return renderMathInElement;
    if (typeof window !== 'undefined' && window.renderMathInElement) return window.renderMathInElement;
    return null;
}

export function renderMarkdown(text, options = {}) {
    if (!text) return { html: '', mermaidMap: new Map(), katexMap: new Map() };
    
    const defaults = {
        breaks: true, gfm: true, headerIds: true, mangle: false,
        sanitize: false, highlight: true, katex: true,
        protectMath: true, mermaid: true, katexBlocks: true
    };
    
    const config = { ...defaults, ...options };
    let processedText = text;
    let mathMap = new Map();
    let mermaidMap = new Map();
    let katexMap = new Map();
    
    if (config.mermaid && MermaidHandler.hasMermaidBlocks(text)) {
        const mermaidResult = MermaidHandler.protect(text);
        processedText = mermaidResult.protected;
        mermaidMap = mermaidResult.mermaidMap;
    }
    
    if (config.katexBlocks && KaTeXHandler.hasKaTeXBlocks(processedText)) {
        const katexResult = KaTeXHandler.protect(processedText);
        processedText = katexResult.protected;
        katexMap = katexResult.katexMap;
    }
    
    if (config.protectMath) {
        const protector = new MathProtector({ renderOnRestore: config.katex, debug: config.debug });
        const result = protector.protect(processedText);
        processedText = result.protected;
        mathMap = result.mathMap;
    }
    
    const markedLib = getMarked();
    const hljsLib = getHljs();
    
    if (markedLib) {
        markedLib.setOptions({
            breaks: config.breaks, gfm: config.gfm,
            headerIds: config.headerIds, mangle: config.mangle,
            highlight: config.highlight && hljsLib ? function(code, lang) {
                if (lang && lang.toLowerCase() === 'mermaid') return code;
                if (lang && hljsLib.getLanguage(lang)) {
                    try { return hljsLib.highlight(code, { language: lang }).value; }
                    catch (err) { return code; }
                }
                try { return hljsLib.highlightAuto(code).value; }
                catch (err) { return code; }
            } : null
        });
    }
    
    let html = markedLib ? markedLib.parse(processedText) : processedText;
    
    const purify = getDOMPurify();
    if (purify) {
        html = purify.sanitize(html, {
            ALLOWED_TAGS: [
                'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'ul', 'ol', 'li', 'blockquote', 'a', 'img',
                'table', 'thead', 'tbody', 'tr', 'th', 'td',
                'span', 'div', 'hr', 'del', 'ins', 'sub', 'sup',
                'svg', 'g', 'path', 'rect', 'circle', 'ellipse', 'line',
                'polyline', 'polygon', 'text', 'tspan', 'defs', 'marker', 'use', 'foreignObject'
            ],
            ALLOWED_ATTR: [
                'href', 'src', 'alt', 'title', 'class', 'id',
                'target', 'rel', 'type', 'start',
                'data-mermaid-id', 'data-mermaid', 'data-katex-id',
                'd', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray',
                'transform', 'viewBox', 'width', 'height', 'x', 'y', 'dx', 'dy',
                'cx', 'cy', 'r', 'points', 'marker-end', 'marker-start',
                'text-anchor', 'dominant-baseline', 'font-size', 'font-family',
                'font-weight', 'style', 'xmlns', 'xmlns:xlink', 'xlink:href',
                'aria-hidden', 'role'
            ]
        });
    }
    
    if (mathMap.size > 0) {
        const protector = new MathProtector({ renderOnRestore: config.katex });
        html = protector.restore(html, mathMap);
    }
    
    return { html, mermaidMap, katexMap };
}

export function renderMarkdownLegacy(text, options = {}) {
    const result = renderMarkdown(text, options);
    return result.html || result;
}

export async function renderMarkdownInElement(element, options = {}) {
    if (!element) return;
    
    const markdown = element.textContent || element.innerText;
    const result = renderMarkdown(markdown, options);
    
    const html = typeof result === 'object' ? result.html : result;
    const mermaidMap = typeof result === 'object' ? result.mermaidMap : new Map();
    const katexMap = typeof result === 'object' ? result.katexMap : new Map();
    
    element.innerHTML = html;
    element.classList.add('markdown-rendered');
    
    if (options.katexBlocks !== false && katexMap && katexMap.size > 0) {
        try { KaTeXHandler.renderInElement(element, katexMap); }
        catch (err) { console.error('[MarkdownRenderer] KaTeX block error:', err); }
    }
    
    // Only run KaTeX auto-render if MathProtector is NOT enabled
    // When protectMath is true, MathProtector already handled all math expressions
    // Running auto-render again would incorrectly pick up currency values like $50
    const renderMath = getRenderMathInElement();
    if (options.katex !== false && options.protectMath === false && renderMath) {
        try {
            renderMath(element, {
                delimiters: [
                    {left: '$$', right: '$$', display: true},
                    {left: '$', right: '$', display: false},
                    {left: '\\[', right: '\\]', display: true},
                    {left: '\\(', right: '\\)', display: false}
                ],
                throwOnError: false, trust: true,
                ignoredClasses: ['katex', 'katex-display', 'katex-error']
            });
        } catch (err) { console.error('[MarkdownRenderer] KaTeX error:', err); }
    }
    
    if (options.mermaid !== false && mermaidMap && mermaidMap.size > 0) {
        try { await MermaidHandler.renderInElement(element, mermaidMap); }
        catch (err) { console.error('[MarkdownRenderer] Mermaid error:', err); }
    }
}

export async function autoRenderMarkdown(selector = '[data-markdown], .markdown-content', options = {}) {
    if (typeof document === 'undefined') return;
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
        try { await renderMarkdownInElement(element, options); }
        catch (err) { element.classList.add('markdown-error'); }
    }
}

export function initMarkdownRenderer() {
    if (typeof document === 'undefined') return;
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => autoRenderMarkdown());
    } else {
        autoRenderMarkdown();
    }
}

export default {
    render: renderMarkdown,
    renderLegacy: renderMarkdownLegacy,
    renderInElement: renderMarkdownInElement,
    autoRender: autoRenderMarkdown,
    init: initMarkdownRenderer
};
