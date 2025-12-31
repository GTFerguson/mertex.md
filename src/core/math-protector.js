/**
 * MathProtector - Protects LaTeX math expressions during markdown processing
 */

import { encodeBase64, decodeBase64 } from '../utils/hash.js';
import { looksLikeCurrency, isCurrencyRange } from '../utils/currency-detector.js';

function getKaTeX() {
    if (typeof katex !== 'undefined') return katex;
    if (typeof window !== 'undefined' && window.katex) return window.katex;
    return null;
}

export class MathProtector {
    constructor(options = {}) {
        this.counter = 0;
        this.currencyCounter = 0;
        this.options = {
            renderOnRestore: options.renderOnRestore !== false,
            debug: options.debug || false
        };
        
        this.delimiters = [
            { left: '$$', right: '$$', display: true, priority: 1 },
            { left: '\\[', right: '\\]', display: true, priority: 2 },
            { left: '\\(', right: '\\)', display: false, priority: 3 },
            { left: '$', right: '$', display: false, priority: 4 }
        ].sort((a, b) => a.priority - b.priority);
        
        // Separate map for currency placeholders (not included in mathMap)
        this.currencyMap = new Map();
    }
    
    encodeBase64(str) { return encodeBase64(str); }
    decodeBase64(str) { return decodeBase64(str); }
    
    protect(content) {
        if (!content) return { protected: '', mathMap: new Map() };
        
        let protectedContent = content;
        const mathMap = new Map();
        
        // Reset currency map AND counter for each protect call
        this.currencyMap = new Map();
        this.currencyCounter = 0;
        
        if (this.options.debug) {
            console.log('[MathProtector.protect] Input length:', content.length, 'First 100 chars:', content.substring(0, 100));
        }
        
        // Step 1: Protect currency ranges FIRST (e.g., $50-$100, $25 - $50, $1,000-$2,000)
        // Use a separate marker that won't be mistaken for math
        // IMPORTANT: The placeholder must NOT contain underscore, caret, backslash, or braces
        // because those trigger "pending math" detection later
        // These go into currencyMap, NOT mathMap
        protectedContent = protectedContent.replace(
            /\$(\d[\d,]*(?:\.\d+)?)\s*-\s*\$(\d[\d,]*(?:\.\d+)?)/g,
            (match) => {
                // Use ::CURx:: format - NO UNDERSCORE to avoid triggering pending math detection
                const placeholder = `::CUR${this.currencyCounter}::`;
                this.currencyCounter++;
                this.currencyMap.set(placeholder, match);
                if (this.options.debug) {
                    console.log('[MathProtector] Step 1: Protected currency range:', match, '->', placeholder);
                }
                return placeholder;
            }
        );
        
        if (this.options.debug) {
            console.log('[MathProtector] After Step 1, currencyMap size:', this.currencyMap.size,
                this.currencyMap.size > 0 ? Array.from(this.currencyMap.entries()) : '(empty)');
        }
        
        // Step 2: Process all delimiter types in priority order
        try {
            for (const delim of this.delimiters) {
                protectedContent = this.extractAndReplace(protectedContent, delim, mathMap);
            }
        } catch (error) {
            console.error('[MathProtector] Error during math protection:', error);
        }
        
        if (this.options.debug) {
            console.log('[MathProtector] After Step 2, content:', protectedContent.substring(0, 200));
            console.log('[MathProtector] Currency map size:', this.currencyMap.size);
        }
        
        // Step 3: ALWAYS restore currency placeholders to their original content
        // Since we disable KaTeX auto-render when protectMath is enabled,
        // the currency values won't be picked up as math delimiters
        if (this.options.debug) {
            console.log('[MathProtector] Step 3: About to restore', this.currencyMap.size, 'currency placeholders');
            console.log('[MathProtector] Step 3: Content BEFORE restore (first 200):', protectedContent.substring(0, 200));
        }
        
        for (const [placeholder, original] of this.currencyMap) {
            if (this.options.debug) {
                const containsBefore = protectedContent.includes(placeholder);
                console.log('[MathProtector] Step 3: Restoring', placeholder, '->', original, 'Contains?', containsBefore);
            }
            protectedContent = protectedContent.split(placeholder).join(original);
            if (this.options.debug) {
                const containsAfter = protectedContent.includes(placeholder);
                console.log('[MathProtector] Step 3: After restore, still contains?', containsAfter);
            }
        }
        
        if (this.options.debug) {
            console.log('[MathProtector] Step 3: Content AFTER restore (first 200):', protectedContent.substring(0, 200));
        }
        
        // SANITY CHECK: Verify no currency placeholders leaked (always check, only warn in debug)
        if (/::CUR\d+::/.test(protectedContent) && this.options.debug) {
            console.error('[MathProtector] BUG: Currency placeholder LEAKED after Step 3!');
        }
        
        return { protected: protectedContent, mathMap };
    }
    
    restore(content, mathMap) {
        if (!content || !mathMap || mathMap.size === 0) return content;
        
        let restored = content;
        const sortedPlaceholders = Array.from(mathMap.keys()).sort().reverse();
        const katexLib = getKaTeX();
        
        for (const placeholder of sortedPlaceholders) {
            const mathInfo = mathMap.get(placeholder);
            if (!mathInfo) continue;
            
            let original;
            if (mathInfo.encodedOriginal) {
                original = this.decodeBase64(mathInfo.encodedOriginal);
            } else if (mathInfo.original) {
                original = mathInfo.original;
            } else {
                continue;
            }
            
            let replacement;
            if (this.options.renderOnRestore && katexLib) {
                replacement = this.renderMathExpression(original, mathInfo, katexLib);
            } else {
                replacement = original;
            }
            
            restored = restored.split(placeholder).join(replacement);
        }
        
        return restored;
    }
    
    isInsideBackticks(content, position) {
        let backtickCount = 0;
        for (let i = 0; i < position; i++) {
            if (content[i] === '`') backtickCount++;
        }
        return backtickCount % 2 === 1;
    }
    
    renderMathExpression(original, mathInfo, katexLib) {
        try {
            const innerContent = mathInfo.innerContent;
            const isDisplay = mathInfo.display;
            
            if (!innerContent || !innerContent.trim()) return original;
            
            const rendered = katexLib.renderToString(innerContent, {
                displayMode: isDisplay,
                throwOnError: false,
                trust: true,
                strict: false,
                output: 'htmlAndMathml'
            });
            
            if (isDisplay) {
                return '<div class="katex-display-wrapper">' + rendered + '</div>';
            }
            return rendered;
        } catch (error) {
            return original;
        }
    }
    
    extractAndReplace(content, delim, mathMap) {
        let result = content;
        let searchPos = 0;
        
        while (searchPos < result.length) {
            const leftPos = result.indexOf(delim.left, searchPos);
            if (leftPos === -1) break;
            
            // Skip escaped dollar signs at the start (but allow \$ inside math for literal dollar)
            if (delim.left === '$' && leftPos > 0 && result[leftPos - 1] === '\\') {
                searchPos = leftPos + 1;
                continue;
            }
            
            // Skip dollar signs inside backticks (code)
            if (delim.left === '$' && this.isInsideBackticks(result, leftPos)) {
                searchPos = leftPos + 1;
                continue;
            }
            
            let rightPos;
            if (delim.left === '$$') {
                let tempPos = leftPos + delim.left.length;
                rightPos = -1;
                while (tempPos < result.length) {
                    const foundPos = result.indexOf(delim.right, tempPos);
                    if (foundPos === -1) break;
                    rightPos = foundPos;
                    break;
                }
            } else if (delim.left === '$') {
                // For single $, we need to handle escaped dollars inside the math
                // e.g., $P_0 = \$100$ should match the whole expression
                let tempPos = leftPos + delim.left.length;
                rightPos = -1;
                
                // Find the next paragraph boundary (double newline)
                const nextParagraphBreak = result.indexOf('\n\n', leftPos);
                
                while (tempPos < result.length) {
                    const foundPos = result.indexOf(delim.right, tempPos);
                    if (foundPos === -1) break;
                    
                    // Stop if we've crossed a paragraph boundary - don't match $ across paragraphs
                    if (nextParagraphBreak !== -1 && foundPos > nextParagraphBreak) {
                        break;
                    }
                    
                    // Check if this $ is escaped (preceded by backslash)
                    if (foundPos > 0 && result[foundPos - 1] === '\\') {
                        tempPos = foundPos + 1;
                        continue;
                    }
                    
                    rightPos = foundPos;
                    break;
                }
            } else {
                rightPos = result.indexOf(delim.right, leftPos + delim.left.length);
            }
            
            if (rightPos === -1) {
                // No closing delimiter found in this paragraph
                // Only treat as pending math if:
                // 1. It has LaTeX-like syntax AND
                // 2. It doesn't look like a standalone currency value
                const pendingContent = result.substring(leftPos);
                const afterDelim = pendingContent.substring(delim.left.length);
                
                // For single $, check if this looks like a standalone currency (e.g., $50)
                // Don't convert standalone currencies to pending math
                if (delim.left === '$') {
                    // Extract just the content up to the next whitespace/newline
                    const immediateContent = afterDelim.split(/[\s\n]/)[0];
                    if (looksLikeCurrency(immediateContent)) {
                        // This is just a standalone currency like "$50", skip it
                        searchPos = leftPos + 1;
                        continue;
                    }
                }
                
                // Only create pending math if it truly looks like incomplete math
                // AND the content within the same paragraph has math-like syntax
                const sameParagraphContent = result.indexOf('\n\n', leftPos);
                const checkContent = sameParagraphContent !== -1
                    ? result.substring(leftPos + delim.left.length, sameParagraphContent)
                    : afterDelim;
                
                if (checkContent.length > 0 && (
                    checkContent.includes('\\') ||
                    checkContent.includes('^') ||
                    checkContent.includes('{') ||
                    checkContent.includes('begin') ||
                    checkContent.includes('frac')
                )) {
                    // Limit pending math to the current paragraph only
                    const endPos = sameParagraphContent !== -1 ? sameParagraphContent : result.length;
                    const limitedPendingContent = result.substring(leftPos, endPos);
                    
                    const placeholder = '::PENDINGMATH' + this.counter + '::';
                    this.counter++;
                    
                    mathMap.set(placeholder, {
                        original: limitedPendingContent,
                        encodedOriginal: this.encodeBase64(limitedPendingContent),
                        display: delim.display,
                        innerContent: checkContent,
                        delimiter: delim,
                        isPending: true
                    });
                    
                    result = result.substring(0, leftPos) + placeholder + result.substring(endPos);
                    searchPos = leftPos + placeholder.length;
                    continue;
                }
                break;
            }
            
            const mathStart = leftPos;
            const mathEnd = rightPos + delim.right.length;
            const mathExpression = result.substring(mathStart, mathEnd);
            
            const innerContent = result.substring(leftPos + delim.left.length, rightPos);
            if (!innerContent.trim()) {
                searchPos = mathEnd;
                continue;
            }
            
            // Skip content that spans multiple lines (not valid inline math for single $)
            if (delim.left === '$' && (innerContent.includes('\n') || innerContent.includes('\r'))) {
                searchPos = leftPos + 1;
                continue;
            }
            
            // Skip content that contains currency placeholders (they were protected for a reason)
            if (/::CUR\d+::/.test(innerContent)) {
                searchPos = leftPos + 1;
                continue;
            }
            
            // Use the shared currency detection utility
            // Skip this $ if it looks like currency - it will be left as regular text
            if (delim.left === '$' && looksLikeCurrency(innerContent)) {
                searchPos = leftPos + 1;
                continue;
            }
            
            const placeholder = '::MATH_' + this.counter + '::';
            this.counter++;
            
            mathMap.set(placeholder, {
                original: mathExpression,
                encodedOriginal: this.encodeBase64(mathExpression),
                display: delim.display,
                innerContent: innerContent,
                delimiter: delim,
                isPending: false
            });
            
            result = result.substring(0, mathStart) + placeholder + result.substring(mathEnd);
            searchPos = mathStart + placeholder.length;
        }
        
        return result;
    }
    
    reset() {
        this.counter = 0;
        this.currencyCounter = 0;
        this.currencyMap = new Map();
    }
}

export default MathProtector;
