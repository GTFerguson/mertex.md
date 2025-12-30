/**
 * IncrementalContentRenderer - Full Replace with Selective KaTeX
 */

import { hashBase36 } from '../utils/hash.js';

export class IncrementalContentRenderer {
    constructor() {
        this.processedFormulas = new Set();
        this.lastContent = '';
        this.renderCount = 0;
    }
    
    reset() {
        this.processedFormulas.clear();
        this.lastContent = '';
        this.renderCount = 0;
    }
    
    appendNewContent(targetElement, fullContent, renderMarkdown) {
        if (!targetElement || !fullContent) return false;
        if (fullContent === this.lastContent) return false;
        
        this.renderCount++;
        const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
        
        const existingCursor = targetElement.querySelector('.streaming-cursor');
        if (existingCursor) existingCursor.remove();
        
        const fullRenderedHtml = renderMarkdown(fullContent, { katex: true });
        const html = typeof fullRenderedHtml === 'object' ? fullRenderedHtml.html : fullRenderedHtml;
        targetElement.innerHTML = html;
        
        const cursor = document.createElement('span');
        cursor.className = 'streaming-cursor';
        targetElement.appendChild(cursor);
        
        this.lastContent = fullContent;
        
        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;
        if (this.renderCount % 10 === 0) {
            console.log('[IncrementalRenderer] Render #' + this.renderCount + ': ' + duration.toFixed(2) + 'ms');
        }
        
        return true;
    }
    
    applySelectiveKaTeX(container) {
        if (typeof window === 'undefined' || !window.katex) return;
        
        const inlineMath = container.querySelectorAll('code.language-math');
        inlineMath.forEach(el => {
            const formula = el.textContent.trim();
            const signature = hashBase36(formula);
            
            if (!this.processedFormulas.has(signature)) {
                try {
                    const span = document.createElement('span');
                    window.katex.render(formula, span, { throwOnError: false, displayMode: false });
                    el.replaceWith(span);
                    this.processedFormulas.add(signature);
                } catch (e) { /* ignore */ }
            }
        });
        
        const displayMath = container.querySelectorAll('pre code.language-math');
        displayMath.forEach(el => {
            const formula = el.textContent.trim();
            const signature = hashBase36(formula);
            
            if (!this.processedFormulas.has(signature)) {
                try {
                    const div = document.createElement('div');
                    window.katex.render(formula, div, { throwOnError: false, displayMode: true });
                    el.closest('pre').replaceWith(div);
                    this.processedFormulas.add(signature);
                } catch (e) { /* ignore */ }
            }
        });
        
        if (typeof window.renderMathInElement === 'function') {
            try {
                window.renderMathInElement(container, {
                    delimiters: [
                        {left: '$$', right: '$$', display: true},
                        {left: '$', right: '$', display: false}
                    ],
                    throwOnError: false, trust: true,
                    ignoredClasses: ['katex', 'katex-display', 'katex-error']
                });
            } catch (e) { /* ignore */ }
        }
    }
    
    getStats() {
        return {
            renderCount: this.renderCount,
            formulasProcessed: this.processedFormulas.size,
            contentLength: this.lastContent.length
        };
    }
}

export default IncrementalContentRenderer;
