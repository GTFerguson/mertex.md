/**
 * StreamingMathRenderer - Clean implementation for KaTeX rendering during streaming
 */

import { hashBase36 } from '../utils/hash.js';

function getRenderMathInElement() {
    if (typeof renderMathInElement !== 'undefined') return renderMathInElement;
    if (typeof window !== 'undefined' && window.renderMathInElement) return window.renderMathInElement;
    return null;
}

export class StreamingMathRenderer {
    constructor() {
        this.seenFormulas = new Set();
        this.lastContentHash = '';
        this.consecutiveSkips = 0;
        
        this.delimiters = [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false }
        ];
        
        this.stats = {
            rendersAttempted: 0,
            rendersSkipped: 0,
            rendersExecuted: 0
        };
    }
    
    processChunk(content, targetElement) {
        this.stats.rendersAttempted++;
        
        const currentFormulas = this.extractFormulaSignatures(content);
        const newFormulas = currentFormulas.filter(sig => !this.seenFormulas.has(sig));
        
        if (newFormulas.length === 0) {
            this.stats.rendersSkipped++;
            this.consecutiveSkips++;
            return false;
        }
        
        const rendered = this.renderMath(targetElement);
        
        if (rendered) {
            newFormulas.forEach(sig => this.seenFormulas.add(sig));
            this.consecutiveSkips = 0;
            this.stats.rendersExecuted++;
        }
        
        return rendered;
    }
    
    looksLikeCurrency(content) {
        if (/[\r\n]\s*[-*+#]/.test(content)) return true;
        if (/[\\^_{}]|\\[a-z]+/i.test(content)) return false;
        if (/[a-z]/i.test(content) && /[+\-*/=]/.test(content)) return false;
        if (/^[a-z][0-9]*$/i.test(content.trim())) return false;
        if (/^[\d.,\s$\-/]+(\s*(per|unit|each|k|m|b|million|billion|thousand))?$/i.test(content)) return true;
        return /^[\d.,]+$/.test(content);
    }
    
    isInsideBackticks(text, pos) {
        let backtickCount = 0;
        for (let i = 0; i < pos; i++) {
            if (text[i] === '`') backtickCount++;
        }
        return backtickCount % 2 === 1;
    }
    
    extractFormulaSignatures(content) {
        const signatures = [];
        
        for (const delim of this.delimiters) {
            let searchPos = 0;
            
            while (true) {
                const leftPos = content.indexOf(delim.left, searchPos);
                if (leftPos === -1) break;
                
                if (delim.left === '$' && this.isInsideBackticks(content, leftPos)) {
                    searchPos = leftPos + 1;
                    continue;
                }
                
                const rightPos = content.indexOf(delim.right, leftPos + delim.left.length);
                if (rightPos === -1) break;
                
                const formula = content.substring(leftPos + delim.left.length, rightPos);
                
                if (formula.trim()) {
                    if (delim.left === '$' && this.looksLikeCurrency(formula)) {
                        searchPos = leftPos + 1;
                        continue;
                    }
                    
                    const signature = delim.left + hashBase36(formula);
                    signatures.push(signature);
                }
                
                searchPos = rightPos + delim.right.length;
            }
        }
        
        return signatures;
    }
    
    renderMath(targetElement) {
        const renderFn = getRenderMathInElement();
        if (!renderFn) return false;
        
        try {
            const beforeCount = targetElement.querySelectorAll('.katex').length;
            
            renderFn(targetElement, {
                delimiters: this.delimiters,
                throwOnError: false,
                trust: true,
                strict: false,
                ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre'],
                ignoredClasses: ['katex', 'katex-display']
            });
            
            const afterCount = targetElement.querySelectorAll('.katex').length;
            return afterCount > beforeCount;
        } catch (err) {
            console.error('[StreamingMath] Render error:', err);
            return false;
        }
    }
    
    finalRender(targetElement) {
        this.renderMath(targetElement);
    }
    
    reset() {
        this.seenFormulas.clear();
        this.lastContentHash = '';
        this.consecutiveSkips = 0;
        this.stats = {
            rendersAttempted: 0,
            rendersSkipped: 0,
            rendersExecuted: 0
        };
    }
    
    getStats() {
        const total = this.stats.rendersAttempted;
        const skipRate = total > 0 ? ((this.stats.rendersSkipped / total) * 100).toFixed(1) : 0;
        
        return {
            ...this.stats,
            skipRate: skipRate + '%'
        };
    }
}

export default StreamingMathRenderer;
