/**
 * StreamingMathRenderer - Clean implementation for KaTeX rendering during streaming
 */

import { hashBase36 } from '../utils/hash.js';
import { looksLikeCurrency } from '../utils/currency-detector.js';

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
        this.lastCharWasWhitespace = false;
        this.accumulatedContent = '';
        
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
        
        // Track whitespace at chunk boundaries for proper spacing
        if (this.lastCharWasWhitespace && /^\S/.test(content) && this.accumulatedContent.length > 0) {
            // Whitespace tracking helps with boundary issues
        }
        
        this.accumulatedContent += content;
        this.lastCharWasWhitespace = /\s$/.test(content);
        
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
    
    isInsideBackticks(text, pos) {
        let backtickCount = 0;
        for (let i = 0; i < pos; i++) {
            if (text[i] === '`') backtickCount++;
        }
        return backtickCount % 2 === 1;
    }
    
    extractFormulaSignatures(content) {
        const signatures = [];
        
        // First, skip currency ranges entirely
        // Replace them temporarily so they don't interfere
        const currencyRangePattern = /\$(\d[\d,]*(?:\.\d+)?)\s*-\s*\$(\d[\d,]*(?:\.\d+)?)/g;
        const cleanContent = content.replace(currencyRangePattern, '___CURRENCY_RANGE___');
        
        for (const delim of this.delimiters) {
            let searchPos = 0;
            
            while (true) {
                const leftPos = cleanContent.indexOf(delim.left, searchPos);
                if (leftPos === -1) break;
                
                if (delim.left === '$' && this.isInsideBackticks(cleanContent, leftPos)) {
                    searchPos = leftPos + 1;
                    continue;
                }
                
                // For single $, handle escaped dollars inside math
                let rightPos;
                if (delim.left === '$') {
                    let tempPos = leftPos + delim.left.length;
                    rightPos = -1;
                    
                    while (tempPos < cleanContent.length) {
                        const foundPos = cleanContent.indexOf(delim.right, tempPos);
                        if (foundPos === -1) break;
                        
                        // Check if this $ is escaped
                        if (foundPos > 0 && cleanContent[foundPos - 1] === '\\') {
                            tempPos = foundPos + 1;
                            continue;
                        }
                        
                        rightPos = foundPos;
                        break;
                    }
                } else {
                    rightPos = cleanContent.indexOf(delim.right, leftPos + delim.left.length);
                }
                
                if (rightPos === -1) break;
                
                const formula = cleanContent.substring(leftPos + delim.left.length, rightPos);
                
                if (formula.trim()) {
                    // Use shared currency detection utility
                    if (delim.left === '$' && looksLikeCurrency(formula)) {
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
        this.lastCharWasWhitespace = false;
        this.accumulatedContent = '';
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
