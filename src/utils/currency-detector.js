/**
 * Shared currency detection utility
 * Used by both MathProtector and StreamingMathRenderer
 */

/**
 * Determines if content between $ delimiters looks like currency rather than math
 * @param {string} content - The content between $ delimiters (without the $)
 * @returns {boolean} - True if this looks like currency, false if it looks like math
 */
export function looksLikeCurrency(content) {
    if (!content || content.trim() === '') return true;
    
    // Has LaTeX syntax? Definitely math - check this FIRST
    // This includes subscripts (_), superscripts (^), braces, backslash commands,
    // and parentheses with letters (function notation like P(t), f(x))
    if (/[\\^_{}]/.test(content)) return false;
    
    // Function notation: letter followed by parentheses like P(t), f(x), g(n)
    if (/[a-zA-Z]\s*\(.*\)/.test(content)) return false;
    
    // Has equals sign? That's math (equations)
    if (/=/.test(content)) return false;
    
    // Has comparison operators? Math
    if (/[<>]/.test(content)) return false;
    
    // Has markdown structural elements (newlines with list markers or headers)?
    // These should never be inside math expressions - check BEFORE operator check
    // because list markers use `-` which looks like subtraction
    if (/[\r\n]\s*[-*+#]/.test(content)) return true;
    
    // Contains sentence-ending punctuation followed by a capital letter
    // e.g., "50. For" in "$50. For example..."
    if (/[.!?]\s+[A-Z]/.test(content)) return true;
    
    // Contains multiple English words (3+ letter words that aren't LaTeX)
    const latexCommands = new Set([
        'frac', 'sqrt', 'sum', 'prod', 'int', 'lim', 'log', 'sin', 'cos', 'tan',
        'alpha', 'beta', 'gamma', 'delta', 'theta', 'lambda', 'sigma', 'omega',
        'infty', 'partial', 'nabla', 'cdot', 'times', 'div', 'pm', 'mp',
        'leq', 'geq', 'neq', 'approx', 'equiv', 'subset', 'supset',
        'mathbb', 'mathcal', 'mathrm', 'text', 'left', 'right', 'begin', 'end',
        'ln', 'exp', 'pi'
    ]);
    const words = content.match(/\b[a-zA-Z]{3,}\b/g) || [];
    const englishWords = words.filter(w => !latexCommands.has(w.toLowerCase()));
    if (englishWords.length >= 2) return true;
    
    // Contains markdown formatting markers (bold, italic, headers)
    if (/[*#`\[\]]/.test(content)) return true;
    
    // IMPORTANT: Check number/unit patterns BEFORE arithmetic check
    // These are "per unit" patterns, not mathematical division
    // e.g., $50/unit, $100/item - these are currency, not math
    
    // Pure numeric values with optional decimals, commas, and trailing space/comma: $50, $1,234.56
    if (/^[\d.,]+[,\s]*$/.test(content)) return true;
    
    // Currency with trailing range indicator: "50-" in "$50-$100"
    if (/^[\d.,]+\s*-?\s*$/.test(content)) return true;
    
    // Common currency formats: $50/unit, $100.00, $50k
    // Also handle trailing punctuation like ")," after currency
    if (/^[\d.,]+[kKmMbB]?(?:\/\w+)?[,\s)]*$/.test(content)) return true;
    
    // Specific pattern: number/word like 50/unit, 100/item - this is "per unit" not division
    if (/^\d+(?:\.\d+)?\/\w+[,\s)]*$/.test(content)) return true;
    
    // Has arithmetic with letters (variables)? Math: "2x", "x + y"
    // But only if the operator is between operands, not at line start
    // This catches "x + y" but not list markers like "\n- Item"
    // NOTE: This must come AFTER the number/unit patterns above
    if (/[a-zA-Z]/.test(content) && /[a-zA-Z0-9]\s*[+\-*/]\s*[a-zA-Z0-9]/.test(content)) return false;
    
    // Currency-like content: starts with number, may have comma/space, then common words
    // e.g., "50, or " - this is from "$50, or $100"
    const currencyConnectors = new Set(['or', 'to', 'and', 'per', 'a', 'an', 'the']);
    if (/^\d/.test(content)) {
        // Starts with digit - likely currency context
        const wordsInContent = content.match(/\b[a-zA-Z]+\b/g) || [];
        const nonCurrencyWords = wordsInContent.filter(w => !currencyConnectors.has(w.toLowerCase()));
        // If all words are currency connectors, it's currency
        if (wordsInContent.length > 0 && nonCurrencyWords.length === 0) return true;
    }
    
    // Single variable or variable with number? Math (like x1, y2)
    if (/^[a-z][0-9]*$/i.test(content.trim())) return false;
    
    // Has currency-like patterns?
    // Digits, dots, commas, spaces, currency words (per, unit, each, etc.)
    if (/^[\d.,\s$\-/]+(\s*(per|unit|each|k|m|b|million|billion|thousand))?$/i.test(content)) return true;
    
    // When content starts with a digit (currency-style), apply prose pattern detection
    // This catches "100, formula: " from "$100, formula: $y = mx + b$"
    if (/^\d/.test(content)) {
        // Contains comma followed by word (likely "value, word" pattern)
        if (/,\s+[a-zA-Z]/.test(content)) return true;
        
        // Contains colon (likely "value, label:" pattern)
        if (/:/.test(content)) return true;
    }
    
    // Default: if we can't determine, treat single short tokens as currency
    // but longer expressions as potential math (only if they have significant letter content)
    if (content.length < 20) {
        // Check if content is mostly numeric with maybe some short connectors
        const letterContent = content.replace(/[^a-zA-Z]/g, '');
        if (letterContent.length <= 3) return true; // Very few letters = likely currency
    }
    
    return content.length < 10;
}

/**
 * Check if a complete string is a currency range like "$50-$100" or "$25 - $50"
 * @param {string} text - The text to check
 * @returns {boolean}
 */
export function isCurrencyRange(text) {
    return /^\$[\d.,]+\s*-\s*\$[\d.,]+$/.test(text);
}

export default { looksLikeCurrency, isCurrencyRange };
