/**
 * KaTeXHandler - Handles KaTeX code blocks (```katex)
 */

import { hashCode } from '../utils/hash.js';

function getKaTeX() {
    if (typeof katex !== 'undefined') return katex;
    if (typeof window !== 'undefined' && window.katex) return window.katex;
    return null;
}

export const KaTeXHandler = {
    katexMap: new Map(),
    
    isAvailable: function() {
        return getKaTeX() !== null;
    },
    
    hashCode: function(code) {
        return hashCode(code);
    },
    
    protect: function(text) {
        this.katexMap = new Map();
        const katexRegex = /```katex\s*\n([\s\S]*?)```/gi;
        
        let protectedText = text.replace(katexRegex, (match, code) => {
            const trimmedCode = code.trim();
            const id = 'KATEX_' + this.hashCode(trimmedCode);
            
            this.katexMap.set(id, {
                code: trimmedCode,
                display: true
            });
            
            return '\n<div class="katex-placeholder" data-katex-id="' + id + '"></div>\n';
        });
        
        return {
            protected: protectedText,
            katexMap: this.katexMap
        };
    },
    
    renderInElement: function(element, katexMap) {
        const placeholders = element.querySelectorAll('.katex-placeholder');
        if (placeholders.length === 0) return 0;
        
        const katexLib = getKaTeX();
        if (!katexLib || !katexMap || katexMap.size === 0) return 0;
        
        let renderedCount = 0;
        
        for (const placeholder of placeholders) {
            const id = placeholder.getAttribute('data-katex-id');
            const info = katexMap.get(id);
            if (!info) continue;
            
            try {
                const container = document.createElement('div');
                container.className = info.display ? 'katex-display-wrapper' : 'katex-inline-wrapper';
                
                const rendered = katexLib.renderToString(info.code, {
                    displayMode: info.display,
                    throwOnError: false,
                    trust: true,
                    strict: false,
                    output: 'htmlAndMathml'
                });
                
                container.innerHTML = rendered;
                placeholder.replaceWith(container);
                renderedCount++;
            } catch (err) {
                console.error('[KaTeXHandler] Failed to render:', err);
            }
        }
        
        return renderedCount;
    },
    
    escapeHtml: function(text) {
        if (typeof document !== 'undefined') {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
        return text.replace(/&/g, '&').replace(/</g, '<').replace(/>/g, '>');
    },
    
    hasKaTeXBlocks: function(text) {
        return /```katex/i.test(text);
    }
};

export default KaTeXHandler;
