/**
 * mertex.md Test Cases
 * 
 * Adapted from nkrdn/code_explorer/static/js/tests/math-rendering.test.js
 * 
 * Test cases for validating the renderer, especially currency vs math disambiguation
 * and streaming behavior.
 * 
 * The Bug Context:
 * Currency values like `$50` are incorrectly identified as LaTeX math expressions,
 * causing markdown headers (`##`) to be passed to KaTeX and fail parsing.
 */

const TEST_CASES = [
    // =========================================================================
    // CATEGORY 1: Currency Detection (should NOT be treated as math)
    // =========================================================================
    {
        name: "1. Currency: Simple values",
        description: "Basic currency values that should NOT be rendered as math",
        content: "# Currency Tests\n\nSimple: $50\n\nWith decimals: $100.00\n\nWith comma: $1,234.56\n\nWith unit: $50/unit\n\nRange: $50-$100\n\nIn sentence: Cost: $25 per item\n\nWith text: Save $50 today!"
    },
    
    {
        name: "2. BUG CASE: Currency before markdown header",
        description: "THE ACTUAL BUG - $50/unit followed by ## header",
        content: "The cost is typically ~ $50/unit) ## **Impact on Operations**\n\nThis is where the bug occurs. The renderer incorrectly treats `$50/unit) ##` as math, causing KaTeX to fail on the markdown header."
    },
    
    {
        name: "3. Currency with newlines before headers",
        description: "Currency followed by headers with proper line breaks",
        content: "Cost is $100 per unit.\n\n## Next Section\n\nThis should render correctly because there's proper separation.\n\n$50 savings!\n\n### Benefits\n\nPrice: $25-$50 range\n\n## Details"
    },
    
    // =========================================================================
    // CATEGORY 2: Legitimate Math (SHOULD be treated as math)
    // =========================================================================
    {
        name: "4. Math: Basic expressions",
        description: "Simple math expressions that SHOULD be rendered",
        content: "# Basic Math\n\nSuperscript: $x^2$\n\nSubscript: $x_1$\n\nGreek: $\\alpha$, $\\beta$, $\\gamma$\n\nFraction: $\\frac{a}{b}$\n\nSummation: $\\sum_{i=0}^n x_i$\n\nEquation: $E = mc^2$"
    },
    
    {
        name: "5. Math: Display mode",
        description: "Display math with various delimiters",
        content: "# Display Math\n\nDouble dollar:\n\n$$x^2 + y^2 = z^2$$\n\nBracket notation:\n\n\\[x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}\\]\n\nInline brackets: \\(x + y\\)"
    },
    
    {
        name: "6. Math: Numbers with LaTeX operators",
        description: "Math starting with numbers - critical edge cases",
        content: "# Math with Numbers\n\nScientific notation: $10^{-6}$\n\nPower: $2^{10}$\n\nArithmetic: $1 + 1 = 2$\n\nAlgebra: $2x + 3y = 5$\n\nMultiplication: $3 \\times 4 = 12$"
    },
    
    // =========================================================================
    // CATEGORY 3: Mixed Content (both math and currency)
    // =========================================================================
    {
        name: "7. Mixed: Math and currency together",
        description: "Content with both real math and currency values",
        content: "# Mixed Content\n\nThe equation $x^2$ costs $50\n\nBudget: $100, formula: $y = mx + b$\n\nPrice is $25 but the integral $\\int_0^1 x dx = 0.5$\n\nSave $75 using formula $A = \\pi r^2$"
    },
    
    {
        name: "8. Mixed: Financial mathematics",
        description: "Complex example with currency symbols in math context",
        content: "# Financial Mathematics\n\nThe price $P(t)$ at time $t$ follows:\n\n$$P(t) = P_0 \\cdot e^{rt}$$\n\nwhere $P_0 = \\$100$ is the initial price and $r = 0.05$ is the growth rate.\n\nCurrent value: **$150.00**\n\n## Summary\n\n| Variable | Value |\n|----------|-------|\n| $P_0$ | \\$100 |\n| $r$ | 5% |\n| $t$ | 2 years |"
    },
    
    // =========================================================================
    // CATEGORY 4: Code Blocks ($ signs should NOT be math)
    // =========================================================================
    {
        name: "9. Code: Inline code with $",
        description: "Code blocks and inline code with dollar signs",
        content: "# Code with $ Signs\n\nUse `$HOME` variable\n\nRun: `echo $PATH`\n\nMultiple: `$a = $b + $c`\n\n```bash\necho $HOME\n$PATH\n```\n\nMixed: The equation $x^2$ and code `$var`"
    },
    
    // =========================================================================
    // CATEGORY 5: Markdown Preservation
    // =========================================================================
    {
        name: "10. Markdown: Headers after currency",
        description: "Markdown features that should be preserved",
        content: "Cost: $100\n\n## Next Section\n\n- Item 1: $50\n- Item 2: $100\n\nPrice: **$50** or *$100*\n\n> Quote with $25 price\n\n### Details\n\nFinal cost: $75"
    },
    
    // =========================================================================
    // CATEGORY 6: Edge Cases
    // =========================================================================
    {
        name: "11. Edge: Empty and whitespace",
        description: "Edge cases with empty or whitespace expressions",
        content: "# Edge Cases\n\nEmpty (should skip): $$$$\n\nWhitespace only: $   $\n\nEscaped dollar: Price: \\$50\n\nMultiple expressions: $x^2$, $y^3$, $z^4$"
    },
    
    {
        name: "12. Edge: Delimiter priority",
        description: "Testing delimiter priority ($$ vs $)",
        content: "# Delimiter Priority\n\nDisplay double-dollar:\n\n$$x^2$$\n\nDisplay brackets:\n\n\\[x^2\\]\n\nInline brackets: \\(x^2\\)\n\nInline single: $x^2$"
    },
    
    // =========================================================================
    // CATEGORY 7: Streaming Edge Cases
    // =========================================================================
    {
        name: "13. Streaming: Progressive content",
        description: "Tests how content builds up during streaming",
        content: "# Streaming Test\n\nThis content will stream character by character.\n\nFirst formula: $x^2 + y^2 = z^2$\n\nThen currency: The price is $50.\n\n## Next Section\n\nMore math: $\\frac{a}{b}$\n\nMore text with $100 budget.\n\n$$\\int_0^\\infty e^{-x^2} dx = \\frac{\\sqrt{\\pi}}{2}$$\n\nFinal note with $25 savings."
    },
    
    // =========================================================================
    // CATEGORY 8: Mermaid Diagrams
    // =========================================================================
    {
        name: "14. Mermaid: Flowchart",
        description: "Mermaid diagram with math around it",
        content: "# Process Flow\n\nThe equation $E = mc^2$ shows energy-mass equivalence.\n\n```mermaid\nflowchart TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[Process A]\n    B -->|No| D[Process B]\n    C --> E[End]\n    D --> E\n```\n\nCost analysis: $500 total budget."
    },
    
    {
        name: "15. Mermaid: Sequence diagram",
        description: "Sequence diagram with surrounding content",
        content: "# Payment Flow\n\nPayment amount: $P = q \\cdot p + T$\n\n```mermaid\nsequenceDiagram\n    participant User\n    participant App\n    participant Payment\n    \n    User->>App: Submit Order\n    App->>Payment: Process\n    Payment-->>App: Success\n    App-->>User: Confirmed\n```\n\nTotal: **$99.99**"
    },
    
    // =========================================================================
    // CATEGORY 9: Currency Range Bug Fix (Visual Regression Tests)
    // =========================================================================
    {
        name: "17. Currency Range Bug Fix",
        description: "Currency ranges should NOT render as math",
        content: `# Currency Range Test

The price range is $50-$100 per unit.

Another format: $25 - $50 with spaces.

Large amounts: $1,000-$2,000 budget.

This should NOT render as math! All dollar signs should appear as regular text.

## More Examples

- Small range: $5-$10
- Medium range: $100-$500
- Large range: $10,000-$50,000

None of these should show KaTeX rendering.`
    },
    
    {
        name: "18. Escaped Dollar in Math",
        description: "Escaped dollars inside math expressions should work",
        content: `# Escaped Dollar Test

The initial price $P_0 = \\$100$ represents the starting value.

Spot price: $S_0 = \\$1.20$ per EUR.

Future value: $FV = \\$1000 \\times (1 + r)^n$

These SHOULD render as math with dollar signs inside the expressions.

## Formula with Currency

The present value formula with currency: $PV = \\$C \\times \\frac{1 - (1+r)^{-n}}{r}$

Where $C = \\$500$ is the periodic payment.`
    },
    
    {
        name: "19. Mixed Currency and Math",
        description: "Currency ranges alongside proper math expressions",
        content: `# Mixed Content Test

## Budget Analysis

The budget range is $500-$1000 for this project.

The quadratic formula is $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$.

Cost breakdown:
- Materials: $200-$300
- Labor: $150-$250
- Overhead: $100-$200

The profit margin $P$ is calculated as:

$$P = \\frac{R - C}{R} \\times 100\\%$$

Where revenue range is **$800-$1200** per month.`
    },
    
    // =========================================================================
    // CATEGORY 10: Comprehensive Financial Example (from task spec)
    // =========================================================================
    {
        name: "20. COMPREHENSIVE: Financial Mathematics",
        description: "Complex example matching the problematic screenshot",
        content: "# Financial Mathematics & Economic Systems Analysis\n\n## Introduction to Currency and Exchange Rates\n\nWhen discussing currency, we often use the dollar sign **$** in various contexts. For example, a simple price like $50 or $1,234.56. But what happens when we need to express this mathematically? The price of an asset at time t can be expressed as $P(t)$, and if we're dealing with US dollars specifically, we might write $P(t) = \\$100 \\times e^{rt}$ where $r$ is the growth rate.\n\n## Currency Exchange Model\n\nLet's say we have an initial investment of **$10,000** in USD. The exchange rate between USD and EUR at time $t$ is given by:\n\n$$E(t) = E_0 \\cdot e^{(\\mu - \\frac{\\sigma^2}{2})t + \\sigma W(t)}$$\n\nwhere:\n- $E_0$ is the initial exchange rate (e.g., $E_0 = 0.85$ EUR/USD)\n- $\\mu$ is the drift coefficient  \n- $\\sigma$ is the volatility\n- $W(t)$ is a Wiener process\n\n## Black-Scholes for Currency Options\n\nThe famous Black-Scholes formula adapted for currency options:\n\n$$d_1 = \\frac{\\ln(S_0/K) + (r_d - r_f + \\sigma^2/2)T}{\\sigma\\sqrt{T}}$$\n\n$$d_2 = d_1 - \\sigma\\sqrt{T}$$\n\n**Practical Example:**\n- Current spot: $S_0 = \\$1.20$ per EUR\n- Strike price: $K = \\$1.25$ per EUR\n- Risk-free rate: $r = 3\\%$\n- Volatility: $\\sigma = 12\\%$\n- Time to expiry: $T = 0.5$ years\n\nThis option gives you the right to buy EUR 100,000 for **$125,000** in 6 months!\n\n## Currency Flow Entity-Relationship Model\n\n```mermaid\nerDiagram\n    ACCOUNT ||--o{ TRANSACTION : has\n    ACCOUNT {\n        string accountID\n        string currency\n        float balance\n    }\n    TRANSACTION {\n        string txID\n        float amount\n        string currency\n        date timestamp\n    }\n    ACCOUNT ||--o{ EXCHANGE : performs\n    EXCHANGE {\n        string exchangeID\n        string fromCurrency\n        string toCurrency\n        float rate\n        float amount\n    }\n```\n\n## Summary Table\n\n| Symbol | Meaning | Example Value |\n|--------|---------|---------------|\n| $S_0$ | Spot rate | 1.20/EUR |\n| $K$ | Strike | 1.25/EUR |\n| $\\sigma$ | Volatility | 12% |\n| $T$ | Time | 0.5 years |"
    }
];

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TEST_CASES };
}
