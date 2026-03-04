/**
 * MermaidHandler - Handles Mermaid diagram code blocks
 * 
 * Provides protection of mermaid code blocks during markdown processing
 * and rendering of diagrams into SVG.
 */

import { hashCode } from '../utils/hash.js';
import { selfCorrectRender } from './self-correct.js';

/**
 * Check if Mermaid library is available
 * @returns {object|null} Mermaid instance or null
 */
function getMermaid() {
    if (typeof mermaid !== 'undefined') return mermaid;
    if (typeof window !== 'undefined' && window.mermaid) return window.mermaid;
    return null;
}

/**
 * MermaidHandler - Mermaid diagram handling utilities
 */
export const MermaidHandler = {
    // Map to store mermaid code during protection
    mermaidMap: new Map(),
    
    // List of supported Mermaid diagram types
    supportedTypes: [
        'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram',
        'erDiagram', 'journey', 'gantt', 'pie', 'quadrantChart', 'requirementDiagram',
        'gitGraph', 'mindmap', 'timeline', 'zenuml', 'C4Context', 'C4Container',
        'C4Component', 'C4Dynamic', 'C4Deployment', 'sankey', 'xychart', 'block'
    ],
    
    // List of known unsupported or beta types
    unsupportedTypes: [
        'sankey-beta', 'xychart-beta', 'block-beta', 'packet-beta'
    ],
    
    isAvailable: function() {
        return getMermaid() !== null;
    },
    
    hashCode: function(code) {
        return hashCode(code);
    },
    
    normalizeNewlines: function(text) {
        if (!text) return text;
        let normalized = text.replace(/\\\\n/g, '::ESCAPED_NEWLINE::');
        normalized = normalized.replace(/\\n/g, '\n');
        normalized = normalized.replace(/::ESCAPED_NEWLINE::/g, '\\n');
        return normalized;
    },
    
    checkDiagramType: function(code) {
        const firstLine = code.trim().split('\n')[0].trim().toLowerCase();
        
        for (const unsupported of this.unsupportedTypes) {
            if (firstLine.startsWith(unsupported.toLowerCase())) {
                return {
                    supported: false,
                    type: unsupported,
                    message: 'The diagram type "' + unsupported + '" is not supported.'
                };
            }
        }
        
        for (const supported of this.supportedTypes) {
            if (firstLine.startsWith(supported.toLowerCase())) {
                return { supported: true, type: supported, message: '' };
            }
        }
        
        return { supported: true, type: 'unknown', message: '' };
    },
    
    protect: function(text) {
        this.mermaidMap = new Map();
        let normalizedText = this.normalizeNewlines(text);
        const mermaidRegex = /\`\`\`mermaid\s*\n([\s\S]*?)\`\`\`/gi;
        
        let protectedText = normalizedText.replace(mermaidRegex, (match, code) => {
            const sanitizedCode = code.split('\n').map(line => line.trimEnd()).join('\n').trim();
            const id = 'MERMAID_' + this.hashCode(sanitizedCode);
            this.mermaidMap.set(id, sanitizedCode);
            return '\n<div class="mermaid-placeholder" data-mermaid-id="' + id + '"></div>\n';
        });
        
        return {
            protected: protectedText,
            mermaidMap: this.mermaidMap
        };
    },
    
    renderInElement: async function(element, mermaidMap, selfCorrect) {
        const placeholders = element.querySelectorAll('.mermaid-placeholder');
        if (placeholders.length === 0) return 0;

        const mermaidLib = getMermaid();
        if (!mermaidLib) {
            console.warn('[MermaidHandler] Mermaid library not available');
            return 0;
        }

        if (!mermaidMap || mermaidMap.size === 0) {
            console.warn('[MermaidHandler] No mermaid map provided');
            return 0;
        }

        let renderedCount = 0;

        for (const placeholder of placeholders) {
            const id = placeholder.getAttribute('data-mermaid-id');
            const code = mermaidMap.get(id);

            if (!code) continue;

            try {
                const diagramId = 'mermaid-diagram-' + Date.now() + '-' + renderedCount;
                const container = document.createElement('div');
                container.className = 'mermaid-container';
                container.id = diagramId;

                const { svg } = await mermaidLib.render(diagramId + '-svg', code);
                container.innerHTML = svg;
                placeholder.replaceWith(container);
                renderedCount++;
            } catch (err) {
                if (selfCorrect?.fix) {
                    placeholder.classList.add('mertex-fixing');
                    const result = await selfCorrectRender(
                        code, 'mermaid', err.message || String(err),
                        async (corrected) => {
                            const retryId = 'mermaid-diagram-' + Date.now() + '-retry-' + renderedCount;
                            return (await mermaidLib.render(retryId + '-svg', corrected)).svg;
                        },
                        selfCorrect
                    );
                    placeholder.classList.remove('mertex-fixing');
                    if (result.success) {
                        const container = document.createElement('div');
                        container.className = 'mermaid-container';
                        container.innerHTML = result.result;
                        placeholder.replaceWith(container);
                        renderedCount++;
                    } else {
                        console.error('[MermaidHandler] Failed to render after self-correct:', err);
                    }
                } else {
                    console.error('[MermaidHandler] Failed to render:', err);
                }
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
    
    hasMermaidBlocks: function(text) {
        return /\`\`\`mermaid/i.test(text);
    }
};

export default MermaidHandler;
