/**
 * MathProtector - Protects LaTeX math expressions during markdown processing
 */

import { encodeBase64, decodeBase64 } from '../utils/hash.js';

function getKaTeX() {
    if (typeof katex !== 'undefined') return katex;
    if (typeof window !== 'undefined' && window.katex) return window.katex;
    return null;
}

export class MathProtector {
    constructor(options = {}) {
        this.counter = 0;
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
    }
    
    encodeBase64(str) { return encodeBase64(str); }
    decodeBase64(str) { return decodeBase64(str); }
    
    protect(content) {
        if (!content) return { protected: '', mathMap: new Map() };
        
        let protectedContent = content;
        const mathMap = new Map();
        
        for (const delim of this.delimiters) {
            protectedContent = this.extractAndReplace(protectedContent, delim, mathMap);
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
    
    looksLikeCurrency(content) {
        if (/[\r\n]\s*[-*+#]/.test(content)) return true;
        if (/[\\^_{}]|\\[a-z]+/i.test(content)) return false;
        if (/[a-z]/i.test(content) && /[+\-*/=]/.test(content)) return false;
        if (/^[a-z][0-9]*$/i.test(content.trim())) return false;
        if (/^[\d.,\s$\-/]+(\s*(per|unit|each|k|m|b|million|billion|thousand))?$/i.test(content)) return true;
        return /^[\d.,]+$/.test(content);
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
            
            if (delim.left === '$' && leftPos > 0 && result[leftPos - 1] === '\\') {
                searchPos = leftPos + 1;
                continue;
            }
            
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
            } else {
                rightPos = result.indexOf(delim.right, leftPos + delim.left.length);
            }
            
            if (rightPos === -1) {
                const pendingContent = result.substring(leftPos);
                const afterDelim = pendingContent.substring(delim.left.length);
                if (afterDelim.length > 0 && (
                    afterDelim.includes('\\') ||
                    afterDelim.includes('^') ||
                    afterDelim.includes('_') ||
                    afterDelim.includes('{') ||
                    afterDelim.includes('begin') ||
                    afterDelim.includes('frac')
                )) {
                    const placeholder = '::PENDINGMATH_' + this.counter + '::';
                    this.counter++;
                    
                    mathMap.set(placeholder, {
                        original: pendingContent,
                        encodedOriginal: this.encodeBase64(pendingContent),
                        display: delim.display,
                        innerContent: afterDelim,
                        delimiter: delim,
                        isPending: true
                    });
                    
                    result = result.substring(0, leftPos) + placeholder;
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
            
            if (delim.left === '$' && this.looksLikeCurrency(innerContent)) {
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
    }
}

export default MathProtector;
