#!/usr/bin/env node
/**
 * Stress Test for mertex.md Streaming Renderer
 * 
 * Tests edge cases to identify any remaining bugs
 */

const path = require('path');
const fs = require('fs');
const vm = require('vm');

// Set up global browser-like environment (minimal)
global.window = global;
global.btoa = (str) => Buffer.from(str, 'binary').toString('base64');
global.atob = (str) => Buffer.from(str, 'base64').toString('binary');
global.escape = (str) => encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode('0x' + p1));
global.unescape = (str) => str.replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode('0x' + p1));
global.katex = undefined;

// Provide base64 encoding/decoding functions
global.encodeBase64 = (str) => {
    try {
        return Buffer.from(str, 'utf8').toString('base64');
    } catch (e) {
        return btoa(unescape(encodeURIComponent(str)));
    }
};

global.decodeBase64 = (str) => {
    try {
        return Buffer.from(str, 'base64').toString('utf8');
    } catch (e) {
        return decodeURIComponent(escape(atob(str)));
    }
};

// Path to files
const srcPath = path.join(__dirname, '..', '..', 'src');

console.log('Loading mertex.md components for stress testing...');

// Load currency detector utility first
try {
    const currencyDetectorCode = fs.readFileSync(path.join(srcPath, 'utils', 'currency-detector.js'), 'utf8');
    
    const currencyDetectorCJS = currencyDetectorCode
        .replace(/export\s+function\s+looksLikeCurrency/g, 'function looksLikeCurrency')
        .replace(/export\s+function\s+isCurrencyRange/g, 'function isCurrencyRange')
        .replace(/export\s+default\s+.*?;/g, '')
        .trim();
    
    const currencyScript = new vm.Script(currencyDetectorCJS + '\nglobal.looksLikeCurrency = looksLikeCurrency;\nglobal.isCurrencyRange = isCurrencyRange;');
    currencyScript.runInThisContext();
    
    console.log('✓ Currency detector loaded');
} catch (e) {
    console.error('Failed to load currency detector:', e.message);
    process.exit(1);
}

// Load MathProtector directly from source
try {
    const mathProtectorCode = fs.readFileSync(path.join(srcPath, 'core', 'math-protector.js'), 'utf8');
    
    const mathProtectorCJS = mathProtectorCode
        .replace(/import\s*{\s*encodeBase64\s*,\s*decodeBase64\s*}\s*from\s*['"].*['"];?\n?/g, '')
        .replace(/import\s*{\s*looksLikeCurrency\s*,\s*isCurrencyRange\s*}\s*from\s*['"].*['"];?\n?/g, '')
        .replace(/export\s+class\s+MathProtector/g, 'class MathProtector')
        .replace(/export\s+default\s+MathProtector;?/g, '');
    
    const script = new vm.Script(mathProtectorCJS + '\nglobal.MathProtector = MathProtector;');
    script.runInThisContext();
    
    console.log('✓ MathProtector loaded');
} catch (e) {
    console.error('Failed to load MathProtector:', e.message);
    process.exit(1);
}

// Helper functions
function testProtector(content, description) {
    const protector = new global.MathProtector({ debug: false });
    try {
        const { protected: protectedText, mathMap } = protector.protect(content);
        const restored = protector.restore(protectedText, mathMap);
        return {
            description,
            input: content,
            protected: protectedText,
            mathMap: mathMap,
            mathCount: mathMap ? mathMap.size : 0,
            restored,
            pass: true
        };
    } catch (e) {
        return {
            description,
            input: content,
            error: e.message,
            stack: e.stack,
            pass: false
        };
    }
}

function checkCurrencyPreserved(content, description) {
    const result = testProtector(content, description);
    if (!result.pass) return result;
    
    // Check if currency values are preserved (not treated as math)
    const currencyPattern = /\$\d+([,\.]\d+)*/g;
    const inputCurrencies = content.match(currencyPattern) || [];
    const outputCurrencies = result.restored.match(currencyPattern) || [];
    
    result.currencyPreserved = inputCurrencies.length === outputCurrencies.length &&
        inputCurrencies.every((c, i) => c === outputCurrencies[i]);
    
    if (!result.currencyPreserved) {
        result.pass = false;
        result.error = `Currency not preserved. Input: ${inputCurrencies.join(', ')} Output: ${outputCurrencies.join(', ')}`;
    }
    return result;
}

function checkMathProcessed(content, description, expectedMathCount) {
    const result = testProtector(content, description);
    if (!result.pass) return result;
    
    result.expectedMathCount = expectedMathCount;
    
    if (result.mathCount !== expectedMathCount) {
        result.pass = false;
        result.error = `Expected ${expectedMathCount} math expressions, found ${result.mathCount}`;
    }
    return result;
}

function checkPlaceholderFormat(content, description) {
    const result = testProtector(content, description);
    if (!result.pass) return result;
    
    // Check placeholders don't leak
    const placeholderLeaks = result.restored.match(/::(?:MATH_|DISPLAY_|INLINE_|CUR|PENDINGMATH)\d+::/g);
    if (placeholderLeaks && placeholderLeaks.length > 0) {
        result.pass = false;
        result.error = `Placeholder leaks found: ${placeholderLeaks.join(', ')}`;
    }
    return result;
}

function checkRoundTrip(content, description) {
    const result = testProtector(content, description);
    if (!result.pass) return result;
    
    // For round-trip, the restored content should equal the input
    // (when no KaTeX is available, math expressions are restored as-is)
    if (result.restored !== content) {
        result.pass = false;
        result.error = `Round-trip failed.\nExpected: ${content.substring(0, 100)}...\nGot: ${result.restored.substring(0, 100)}...`;
    }
    return result;
}

// Run stress tests
console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║               mertex.md STRESS TEST SUITE                                 ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;
const failures = [];

function runTest(testFn, ...args) {
    const result = testFn(...args);
    if (result.pass) {
        console.log(`✓ ${result.description}`);
        passed++;
    } else {
        console.log(`✗ ${result.description}`);
        console.log(`  ERROR: ${result.error}`);
        failed++;
        failures.push(result);
    }
    return result;
}

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('Test 1: Multiple Currency Values in Close Proximity');
console.log('═══════════════════════════════════════════════════════════════════════════════');

runTest(checkCurrencyPreserved, 
    'The prices are $50, $75, $100, and $150 per item.',
    'Multiple currency values in sentence');

runTest(checkCurrencyPreserved,
    'Total cost: $50 + $75 + $100 + $150 = $375',
    'Currency arithmetic expression');

runTest(checkCurrencyPreserved,
    'Budget breakdown: $100, $200, $300',
    'Currency with commas in sentence');

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('Test 2: Currency with Percentages');
console.log('═══════════════════════════════════════════════════════════════════════════════');

runTest(checkCurrencyPreserved,
    'The stock dropped from $100 to $85 (a 15% decrease).',
    'Currency with percentage in parentheses');

runTest(checkCurrencyPreserved,
    'Expected return: 8-12% on $10,000 investment.',
    'Percentage range with currency');

runTest(checkCurrencyPreserved,
    'Profit margin: 25% on $500 revenue.',
    'Single percentage with currency');

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('Test 3: Nested Math with Currency Context');
console.log('═══════════════════════════════════════════════════════════════════════════════');

runTest(checkMathProcessed,
    'The profit function is $P(x) = 100x - 5000$ where $x$ is units sold.',
    'Math function with currency-like prefix', 2);

runTest(checkMathProcessed,
    'At $50/unit, break-even is at $\\frac{5000}{50} = 100$ units.',
    'Currency followed by math fraction', 1);

runTest(checkMathProcessed,
    'Revenue: $R(x) = px$ where $p = \\$50$ per unit.',
    'Math with escaped dollar inside', 2);

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('Test 4: Currency in Code Blocks');
console.log('═══════════════════════════════════════════════════════════════════════════════');

runTest(checkPlaceholderFormat,
    'Here\'s the pricing code:\n`const price = $50;` - This won\'t work!',
    'Inline code with currency-like syntax');

runTest(checkPlaceholderFormat,
    '```javascript\nconst price = 50; // $50 per unit\nconst total = price * quantity; // Total $$$\n```',
    'Fenced code block with currency comment');

runTest(checkPlaceholderFormat,
    'Watch for bash variables: `$HOME`, `$PATH`, `echo $USER`',
    'Bash variables in inline code');

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('Test 5: Edge Cases with Delimiters');
console.log('═══════════════════════════════════════════════════════════════════════════════');

runTest(checkMathProcessed,
    'The equation $$E = mc^2$$ shows mass-energy equivalence.',
    'Display math with double dollar', 1);

runTest(checkMathProcessed,
    'Inline math $x^2 + y^2 = r^2$ describes a circle.',
    'Inline math with single dollar', 1);

runTest(checkMathProcessed,
    'Display math: \\[F = ma\\]',
    'Display math with bracket notation', 1);

runTest(checkMathProcessed,
    'Alternative: \\(F = ma\\)',
    'Inline math with bracket notation', 1);

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('Test 6: Special Characters Near Currency');
console.log('═══════════════════════════════════════════════════════════════════════════════');

runTest(checkCurrencyPreserved,
    'Prices: $50* $75** $100***',
    'Currency with asterisks');

runTest(checkCurrencyPreserved,
    'Discounts: *$25 off* **$50 off** ***$75 off***',
    'Currency inside markdown emphasis');

runTest(checkCurrencyPreserved,
    'Footnote: Cost is $100[^1]',
    'Currency with footnote');

runTest(checkCurrencyPreserved,
    'Link price: [$50 deal](https://example.com)',
    'Currency in markdown link');

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('Test 7: Currency in Tables');
console.log('═══════════════════════════════════════════════════════════════════════════════');

runTest(checkCurrencyPreserved,
    '| Item | Price |\n|------|-------|\n| A | $50 |\n| B | $75 |\n| C | $100 |',
    'Currency in markdown table');

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('Test 8: Math with Special Operators');
console.log('═══════════════════════════════════════════════════════════════════════════════');

runTest(checkMathProcessed,
    'The limit: $\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1$',
    'Limit notation', 1);

runTest(checkMathProcessed,
    'Summation: $\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$',
    'Summation notation', 1);

runTest(checkMathProcessed,
    'Integral: $\\int_0^1 x^2 dx = \\frac{1}{3}$',
    'Integral notation', 1);

runTest(checkMathProcessed,
    'Product: $\\prod_{i=1}^{n} i = n!$',
    'Product notation', 1);

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('Test 9: Greek Letters and Symbols');
console.log('═══════════════════════════════════════════════════════════════════════════════');

runTest(checkMathProcessed,
    'Variables: $\\alpha$, $\\beta$, $\\gamma$, $\\delta$',
    'Multiple Greek letters', 4);

runTest(checkMathProcessed,
    'Constants: $\\pi \\approx 3.14159$, $e \\approx 2.71828$',
    'Mathematical constants', 2);

runTest(checkMathProcessed,
    'Operators: $\\nabla \\cdot \\vec{E} = \\frac{\\rho}{\\epsilon_0}$',
    'Vector calculus notation', 1);

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('Test 10: Mixed Content Stress Test');
console.log('═══════════════════════════════════════════════════════════════════════════════');

const mixedContent = `# Financial Report Q4 2024

The company earned **$1.5M** in revenue, a 25% increase from Q3.

## Key Metrics

- Revenue: $1,500,000 (+25%)
- Expenses: $1,200,000
- Profit: $300,000

The profit margin $P = \\frac{Revenue - Expenses}{Revenue} = \\frac{300000}{1500000} = 0.2 = 20\\%$

### Stock Analysis

Current price: $150.00
52-week range: $100-$200
P/E ratio: 15.5x

The Black-Scholes formula for option pricing:

$$C = S_0 N(d_1) - Ke^{-rT}N(d_2)$$

where:
- $S_0 = \\$150$ (current stock price)
- $K = \\$160$ (strike price)
- $r = 5\\%$ (risk-free rate)
- $T = 0.5$ (time to expiry in years)`;

runTest(checkPlaceholderFormat, mixedContent, 'Comprehensive financial report no placeholder leaks');
runTest(checkMathProcessed, mixedContent, 'Financial report math count', 6);

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('Test 11: Rapid Delimiter Changes');
console.log('═══════════════════════════════════════════════════════════════════════════════');

runTest(checkMathProcessed,
    '$a$ then $$b$$ then $c$ then \\[d\\] then $e$ then \\(f\\)',
    'Rapid delimiter changes', 6);

runTest(checkMathProcessed,
    '$x$$y$$z$',
    'Adjacent math expressions', 3);

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('Test 12: Escaped Characters');
console.log('═══════════════════════════════════════════════════════════════════════════════');

runTest(checkPlaceholderFormat,
    'Cost: \\$100 (not math)',
    'Escaped dollar not math');

runTest(checkMathProcessed,
    'Math: $x = \\$100$ (dollar inside math)',
    'Escaped dollar inside math', 1);

runTest(checkPlaceholderFormat,
    'Escaped: \\$50 vs $50 vs $\\$50$',
    'Mixed escaped and regular currency');

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('Test 13: Mermaid Diagram Markers');
console.log('═══════════════════════════════════════════════════════════════════════════════');

const mermaidContent = `\`\`\`mermaid
graph TD
    A[$100 Investment] --> B{Decision}
    B -->|Option 1| C[$150 Return]
    B -->|Option 2| D[$80 Loss]
\`\`\``;

runTest(checkPlaceholderFormat, mermaidContent, 'Mermaid diagram with currency-like values');

console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('ADDITIONAL EDGE CASES');
console.log('═══════════════════════════════════════════════════════════════════════════════');

runTest(checkCurrencyPreserved,
    'Price: $0.99',
    'Sub-dollar currency');

runTest(checkCurrencyPreserved,
    'Cost: $.50',
    'Currency without leading zero');

runTest(checkMathProcessed,
    '$n! = n \\times (n-1) \\times ... \\times 1$',
    'Factorial notation', 1);

runTest(checkMathProcessed,
    '$\\sqrt{x^2 + y^2}$',
    'Square root notation', 1);

runTest(checkCurrencyPreserved,
    'Pay $1M or $2B',
    'Currency with magnitude suffix');

runTest(checkMathProcessed,
    'Matrix: $\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$',
    'Matrix notation', 1);

runTest(checkPlaceholderFormat,
    'The $P(A|B) = \\frac{P(B|A)P(A)}{P(B)}$ formula',
    'Bayes theorem with conditional probability');

runTest(checkCurrencyPreserved,
    'Save $$ on purchases!',
    'Double dollar as emphasis not math');

// Round-trip tests
console.log('\n═══════════════════════════════════════════════════════════════════════════════');
console.log('ROUND-TRIP INTEGRITY TESTS');
console.log('═══════════════════════════════════════════════════════════════════════════════');

runTest(checkRoundTrip,
    'Simple text with $50 and $100 prices.',
    'Round-trip: Simple currency');

runTest(checkRoundTrip,
    'Math $x^2$ and currency $50 together.',
    'Round-trip: Math and currency');

runTest(checkRoundTrip,
    'Range: $50-$100 is affordable.',
    'Round-trip: Currency range');

// Summary
console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
console.log('║                           STRESS TEST RESULTS                              ║');
console.log('╚════════════════════════════════════════════════════════════════════════════╝');
console.log(`Total: ${passed + failed}`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Pass Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

if (failures.length > 0) {
    console.log('\n═══════════════════════════════════════════════════════════════════════════════');
    console.log('FAILURE DETAILS');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    failures.forEach((f, i) => {
        console.log(`\n${i + 1}. ${f.description}`);
        console.log(`   Input: ${f.input.substring(0, 80)}${f.input.length > 80 ? '...' : ''}`);
        console.log(`   Error: ${f.error}`);
        if (f.protected) {
            console.log(`   Protected: ${f.protected.substring(0, 80)}${f.protected.length > 80 ? '...' : ''}`);
        }
        if (f.restored) {
            console.log(`   Restored: ${f.restored.substring(0, 80)}${f.restored.length > 80 ? '...' : ''}`);
        }
    });
}

process.exit(failed > 0 ? 1 : 0);
