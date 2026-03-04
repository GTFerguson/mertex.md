/**
 * Self-correcting render utility
 *
 * When a render fails, calls a consumer-provided fix callback to get corrected
 * code, then retries. Enables LLM-powered correction of broken mermaid/katex.
 */

/**
 * Attempt to fix and re-render broken code
 * @param {string} code - The broken source code
 * @param {"mermaid"|"katex"} format - Which renderer failed
 * @param {string} error - The error message from the failed render
 * @param {(code: string) => Promise<any>} renderFn - Renders code, returns result or throws
 * @param {{ fix: Function, maxRetries?: number }} options - Self-correct options
 * @returns {Promise<{ success: boolean, result?: any, code?: string }>}
 */
export async function selfCorrectRender(code, format, error, renderFn, options) {
    const maxRetries = Math.min(options.maxRetries ?? 1, 3);
    let lastError = error;
    let currentCode = code;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            currentCode = await options.fix(currentCode, format, lastError);
        } catch (fixError) {
            console.error(`[selfCorrect] fix callback threw on attempt ${attempt + 1}:`, fixError);
            return { success: false };
        }

        try {
            const result = await renderFn(currentCode);
            return { success: true, result, code: currentCode };
        } catch (renderError) {
            lastError = renderError.message || String(renderError);
        }
    }

    return { success: false };
}
