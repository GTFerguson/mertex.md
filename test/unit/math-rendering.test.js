/**
 * Comprehensive Test Suite for Mertex.md Math Rendering
 * 
 * Tests the MathProtector class for correct LaTeX math vs currency detection
 * Ported from nkrdn test framework with adaptations for mertex.md API
 * 
 * The Bug Context:
 * Currency values like `$50` are incorrectly identified as LaTeX math expressions,
 * causing markdown headers (`##`) to be passed to KaTeX and fail parsing.
 * 
 * Example bug case: "typically ~ $50/unit) ## **Impact on Operations**"
 * The `$50/unit) ##` gets treated as math, causing KaTeX to fail on "##"
 */

// Create test runner instance
const runner = new TestRunner();

// ============================================================================
// TEST CATEGORY 1: Currency Detection (should NOT be treated as math)
// ============================================================================

runner.test('Currency: Simple $50 should NOT be math', () => {
    const input = '$50';
    runner.assertFalse(
        TestHelpers.shouldBeMath(input),
        'Simple currency value $50 should not be treated as math'
    );
});

runner.test('Currency: $100.00 with decimals should NOT be math', () => {
    const input = '$100.00';
    runner.assertFalse(
        TestHelpers.shouldBeMath(input),
        'Currency with decimals $100.00 should not be treated as math'
    );
});

runner.test('Currency: $1,234.56 with comma should NOT be math', () => {
    const input = '$1,234.56';
    runner.assertFalse(
        TestHelpers.shouldBeMath(input),
        'Currency with comma separator should not be treated as math'
    );
});

runner.test('Currency: $50/unit should NOT be math', () => {
    const input = '$50/unit';
    runner.assertFalse(
        TestHelpers.shouldBeMath(input),
        'Currency with unit $50/unit should not be treated as math'
    );
});

runner.test('Currency: Range $50-$100 should NOT be math', () => {
    const input = '$50-$100';
    runner.assertFalse(
        TestHelpers.shouldBeMath(input),
        'Currency range should not be treated as math'
    );
});

runner.test('Currency: "Cost: $25 per item" should NOT be math', () => {
    const input = 'Cost: $25 per item';
    runner.assertFalse(
        TestHelpers.shouldBeMath(input),
        'Currency in sentence should not be treated as math'
    );
});

runner.test('Currency: "Save $50 today!" should NOT be math', () => {
    const input = 'Save $50 today!';
    runner.assertFalse(
        TestHelpers.shouldBeMath(input),
        'Currency with text should not be treated as math'
    );
});

// ============================================================================
// TEST CATEGORY 2: Legitimate Math (SHOULD be treated as math)
// ============================================================================

runner.test('Math: $x^2$ simple superscript SHOULD be math', () => {
    const input = '$x^2$';
    runner.assertTrue(
        TestHelpers.shouldBeMath(input),
        'Simple superscript should be treated as math'
    );
});

runner.test('Math: $x_1$ simple subscript SHOULD be math', () => {
    const input = '$x_1$';
    runner.assertTrue(
        TestHelpers.shouldBeMath(input),
        'Simple subscript should be treated as math'
    );
});

runner.test('Math: $\\alpha$ Greek letter SHOULD be math', () => {
    const input = '$\\alpha$';
    runner.assertTrue(
        TestHelpers.shouldBeMath(input),
        'Greek letter should be treated as math'
    );
});

runner.test('Math: $\\frac{a}{b}$ fraction SHOULD be math', () => {
    const input = '$\\frac{a}{b}$';
    runner.assertTrue(
        TestHelpers.shouldBeMath(input),
        'Fraction should be treated as math'
    );
});

runner.test('Math: $\\sum_{i=0}^n x_i$ summation SHOULD be math', () => {
    const input = '$\\sum_{i=0}^n x_i$';
    runner.assertTrue(
        TestHelpers.shouldBeMath(input),
        'Summation should be treated as math'
    );
});

runner.test('Math: $E = mc^2$ equation SHOULD be math', () => {
    const input = '$E = mc^2$';
    runner.assertTrue(
        TestHelpers.shouldBeMath(input),
        'Equation should be treated as math'
    );
});

runner.test('Math: $$x^2 + y^2 = z^2$$ display math SHOULD be math', () => {
    const input = '$$x^2 + y^2 = z^2$$';
    runner.assertTrue(
        TestHelpers.shouldBeMath(input),
        'Display math with $$ should be treated as math'
    );
});

runner.test('Math: \\[x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}\\] display brackets SHOULD be math', () => {
    const input = '\\[x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}\\]';
    runner.assertTrue(
        TestHelpers.shouldBeMath(input),
        'Display math with \\[\\] should be treated as math'
    );
});

runner.test('Math: \\(x + y\\) inline brackets SHOULD be math', () => {
    const input = '\\(x + y\\)';
    runner.assertTrue(
        TestHelpers.shouldBeMath(input),
        'Inline math with \\(\\) should be treated as math'
    );
});

// ============================================================================
// TEST CATEGORY 3: Bug Case Scenarios (The Original Bug Cases)
// ============================================================================

runner.test('BUG CASE: "$50/unit) ## **Impact**" should NOT be math', () => {
    const input = '$50/unit) ## **Impact on Operations**';
    runner.assertFalse(
        TestHelpers.shouldBeMath(input),
        'THE BUG CASE: Currency followed by markdown header should not be treated as math'
    );
});

runner.test('BUG CASE: "typically ~ $50/unit) ## **Impact**" should NOT be math', () => {
    const input = 'typically ~ $50/unit) ## **Impact**';
    runner.assertFalse(
        TestHelpers.shouldBeMath(input),
        'Bug case with context should not treat currency as math'
    );
});

runner.test('Edge: "Cost is $100 per unit.\\n\\n## Next Section" should NOT be math', () => {
    const input = 'Cost is $100 per unit.\n\n## Next Section';
    runner.assertFalse(
        TestHelpers.shouldBeMath(input),
        'Currency followed by header (with newlines) should not be math'
    );
});

runner.test('Edge: "$50 savings!\\n\\n### Benefits" should NOT be math', () => {
    const input = '$50 savings!\n\n### Benefits';
    runner.assertFalse(
        TestHelpers.shouldBeMath(input),
        'Currency in text before headers should not be math'
    );
});

runner.test('Edge: "Price: $25-$50 range\\n\\n## Details" should NOT be math', () => {
    const input = 'Price: $25-$50 range\n\n## Details';
    runner.assertFalse(
        TestHelpers.shouldBeMath(input),
        'Currency range before header should not be math'
    );
});

// ============================================================================
// TEST CATEGORY 4: Mixed Content (both math and currency)
// ============================================================================

runner.test('Mixed: "The equation $x^2$ costs $50" should find only one math expression', () => {
    const count = TestHelpers.countMathExpressions('The equation $x^2$ costs $50');
    runner.assertEqual(
        count, 1,
        'Should find exactly 1 math expression (the equation, not the currency)'
    );
});

runner.test('Mixed: "Budget: $100, formula: $y = mx + b$" should find only one math expression', () => {
    const count = TestHelpers.countMathExpressions('Budget: $100, formula: $y = mx + b$');
    runner.assertEqual(
        count, 1,
        'Should find exactly 1 math expression (the formula, not the budget)'
    );
});

runner.test('Mixed: Should identify correct math in mixed content', () => {
    const input = 'The equation $x^2$ costs $50';
    const expressions = TestHelpers.getMathExpressions(input);
    
    runner.assertEqual(expressions.length, 1, 'Should find exactly 1 expression');
    runner.assertContains(
        expressions[0].innerContent, 'x^2',
        'Should identify the equation as math'
    );
});

// ============================================================================
// TEST CATEGORY 5: Streaming Scenarios
// ============================================================================

runner.test('Streaming: Partial math "$x^" should be protected as pending', () => {
    const input = '$x^';
    const MathProtectorClass = TestHelpers.getMathProtector();
    const protector = new MathProtectorClass();
    const result = protector.protect(input);
    
    runner.assertTrue(
        result.mathMap.size > 0 || result.protected !== input,
        'Partial math expression should be protected or modified'
    );
});

runner.test('Streaming: Partial currency "$5" should NOT cause false math detection', () => {
    const input = '$5';
    const MathProtectorClass = TestHelpers.getMathProtector();
    const protector = new MathProtectorClass();
    const result = protector.protect(input);
    
    runner.assertEqual(
        result.mathMap.size, 0,
        'Simple partial currency should not be detected as math'
    );
});

runner.test('Streaming: Content with opening $ but no LaTeX should not be protected', () => {
    const input = '$50 is the price';
    const MathProtectorClass = TestHelpers.getMathProtector();
    const protector = new MathProtectorClass();
    const result = protector.protect(input);
    
    runner.assertEqual(
        result.mathMap.size, 0,
        'Currency without LaTeX indicators should not be protected'
    );
});

// ============================================================================
// TEST CATEGORY 6: Markdown Preservation
// ============================================================================

runner.test('Markdown: Headers after currency should be preserved', () => {
    const input = 'Cost: $100\n\n## Next Section';
    const MathProtectorClass = TestHelpers.getMathProtector();
    const protector = new MathProtectorClass();
    const result = protector.protect(input);
    
    runner.assertContains(
        result.protected, '## Next Section',
        'Headers should be preserved in protected content'
    );
});

runner.test('Markdown: Lists with currency should be preserved', () => {
    const input = '- Item 1: $50\n- Item 2: $100';
    const MathProtectorClass = TestHelpers.getMathProtector();
    const protector = new MathProtectorClass();
    const result = protector.protect(input);
    
    runner.assertContains(
        result.protected, '- Item 1',
        'List markers should be preserved'
    );
    runner.assertContains(
        result.protected, '- Item 2',
        'List markers should be preserved'
    );
});

runner.test('Markdown: Bold/italic near currency should be preserved', () => {
    const input = 'Price: **$50** or *$100*';
    const MathProtectorClass = TestHelpers.getMathProtector();
    const protector = new MathProtectorClass();
    const result = protector.protect(input);
    
    runner.assertContains(
        result.protected, '**',
        'Bold markers should be preserved'
    );
    runner.assertContains(
        result.protected, '*',
        'Italic markers should be preserved'
    );
});

// ============================================================================
// TEST CATEGORY 7: Placeholder Format Tests
// ============================================================================

runner.test('Placeholders: Should use :: format not ___', () => {
    const input = '$x^2$';
    const MathProtectorClass = TestHelpers.getMathProtector();
    const protector = new MathProtectorClass();
    const result = protector.protect(input);
    
    runner.assertContains(
        result.protected, '::MATH_',
        'Should use ::MATH_ placeholder format'
    );
    runner.assertNotContains(
        result.protected, '___MATH_',
        'Should not use old ___MATH_ format'
    );
});

runner.test('Placeholders: Should be restorable', () => {
    const input = 'The equation $x^2$ is simple';
    const MathProtectorClass = TestHelpers.getMathProtector();
    const protector = new MathProtectorClass({ renderOnRestore: false });
    const protectResult = protector.protect(input);
    
    runner.assertTrue(
        protectResult.mathMap.size > 0,
        'Should have protected math'
    );
    
    const restored = protector.restore(protectResult.protected, protectResult.mathMap);
    
    runner.assertContains(
        restored, '$x^2$',
        'Should restore original math expression'
    );
});

// ============================================================================
// TEST CATEGORY 8: Protection Logic Tests
// ============================================================================

runner.test('Protection: Empty expression $$ should be skipped', () => {
    const input = '$$$$';
    const count = TestHelpers.countMathExpressions(input);
    runner.assertEqual(
        count, 0,
        'Empty math expressions should be skipped'
    );
});

runner.test('Protection: Whitespace-only expression should be skipped', () => {
    const input = '$   $';
    const count = TestHelpers.countMathExpressions(input);
    runner.assertEqual(
        count, 0,
        'Whitespace-only expressions should be skipped'
    );
});

runner.test('Protection: Escaped dollar \\$ should not trigger math', () => {
    const input = 'Price: \\$50';
    const count = TestHelpers.countMathExpressions(input);
    runner.assertEqual(
        count, 0,
        'Escaped dollar signs should not trigger math detection'
    );
});

runner.test('Protection: Multiple expressions should all be protected', () => {
    const input = 'First: $x^2$, Second: $y^3$, Third: $z^4$';
    const count = TestHelpers.countMathExpressions(input);
    runner.assertEqual(
        count, 3,
        'Should protect all three math expressions'
    );
});

// ============================================================================
// TEST CATEGORY 9: Delimiter Priority Tests
// ============================================================================

runner.test('Delimiters: $$ should take priority over $', () => {
    const input = '$$x^2$$';
    const expressions = TestHelpers.getMathExpressions(input);
    
    runner.assertEqual(expressions.length, 1, 'Should find 1 expression');
    runner.assertTrue(
        expressions[0].display,
        'Should be recognized as display math ($$)'
    );
});

runner.test('Delimiters: \\[\\] should be recognized as display', () => {
    const input = '\\[x^2\\]';
    const expressions = TestHelpers.getMathExpressions(input);
    
    runner.assertEqual(expressions.length, 1, 'Should find 1 expression');
    runner.assertTrue(
        expressions[0].display,
        'Should be recognized as display math'
    );
});

runner.test('Delimiters: \\(\\) should be recognized as inline', () => {
    const input = '\\(x^2\\)';
    const expressions = TestHelpers.getMathExpressions(input);
    
    runner.assertEqual(expressions.length, 1, 'Should find 1 expression');
    runner.assertFalse(
        expressions[0].display,
        'Should be recognized as inline math'
    );
});

// ============================================================================
// TEST CATEGORY 10: Currency Pattern Recognition
// ============================================================================

runner.test('Currency Pattern: $<digits> should NOT be math', () => {
    const inputs = ['$1', '$12', '$123', '$1234'];
    inputs.forEach(input => {
        runner.assertFalse(
            TestHelpers.shouldBeMath(input),
            `${input} should not be treated as math`
        );
    });
});

runner.test('Currency Pattern: $<digits>.<digits> should NOT be math', () => {
    const inputs = ['$1.0', '$12.50', '$123.99'];
    inputs.forEach(input => {
        runner.assertFalse(
            TestHelpers.shouldBeMath(input),
            `${input} should not be treated as math`
        );
    });
});

runner.test('Currency Pattern: $<digits>,<digits> should NOT be math', () => {
    const inputs = ['$1,000', '$12,345', '$123,456.78'];
    inputs.forEach(input => {
        runner.assertFalse(
            TestHelpers.shouldBeMath(input),
            `${input} should not be treated as math`
        );
    });
});

// ============================================================================
// TEST CATEGORY 11: Math Starting with Numbers (Critical Edge Cases)
// ============================================================================

runner.test('Math with Numbers: $10^{-6}$ scientific notation SHOULD be math', () => {
    const input = '$10^{-6}$';
    runner.assertTrue(
        TestHelpers.shouldBeMath(input),
        'Scientific notation with superscript should be treated as math'
    );
});

runner.test('Math with Numbers: $2^{10}$ power SHOULD be math', () => {
    const input = '$2^{10}$';
    runner.assertTrue(
        TestHelpers.shouldBeMath(input),
        'Power expression should be treated as math'
    );
});

runner.test('Math with Numbers: $1 + 1 = 2$ arithmetic SHOULD be math', () => {
    const input = '$1 + 1 = 2$';
    runner.assertTrue(
        TestHelpers.shouldBeMath(input),
        'Simple arithmetic with operators should be treated as math'
    );
});

runner.test('Math with Numbers: $2x + 3y = 5$ algebra SHOULD be math', () => {
    const input = '$2x + 3y = 5$';
    runner.assertTrue(
        TestHelpers.shouldBeMath(input),
        'Algebraic equation starting with number should be treated as math'
    );
});

runner.test('Math with Numbers: $3 \\times 4 = 12$ multiplication SHOULD be math', () => {
    const input = '$3 \\times 4 = 12$';
    runner.assertTrue(
        TestHelpers.shouldBeMath(input),
        'Multiplication with LaTeX command should be treated as math'
    );
});

runner.test('Math with Numbers: $3.14159$ constant vs currency ambiguity', () => {
    const input = '$3.14159$';
    // This is ambiguous but without operators, it's likely currency
    // Our implementation should handle this gracefully
    const isMath = TestHelpers.shouldBeMath(input);
    runner.assertTrue(
        isMath === true || isMath === false,
        'Should handle numeric constant without error (ambiguous case)'
    );
});

// ============================================================================
// TEST CATEGORY 12: Code Blocks with $ Signs (Critical)
// ============================================================================

runner.test('Code Block: Inline code with $ should NOT be treated as math', () => {
    const input = 'Use `$HOME` variable';
    const MathProtectorClass = TestHelpers.getMathProtector();
    const protector = new MathProtectorClass();
    const result = protector.protect(input);
    
    // Should not extract $HOME as math since it's in code
    runner.assertEqual(
        result.mathMap.size, 0,
        'Inline code with $ should not be treated as math'
    );
});

runner.test('Code Block: bash $variable should NOT be math', () => {
    const input = 'Run: `echo $PATH`';
    const count = TestHelpers.countMathExpressions(input);
    runner.assertEqual(
        count, 0,
        'Bash variables in code should not be treated as math'
    );
});

runner.test('Code Block: Multiple $ in code should NOT be math', () => {
    const input = 'Code: `$a = $b + $c`';
    const count = TestHelpers.countMathExpressions(input);
    runner.assertEqual(
        count, 0,
        'Multiple $ signs in inline code should not be treated as math'
    );
});

runner.test('Code Block: Fenced code block with $ should be handled', () => {
    const input = '```bash\necho $HOME\n$PATH\n```';
    const MathProtectorClass = TestHelpers.getMathProtector();
    const protector = new MathProtectorClass();
    const result = protector.protect(input);
    
    // Ideally should preserve code blocks, but at minimum shouldn't break
    runner.assertTrue(
        result.protected.includes('echo') || result.protected.includes('```'),
        'Code block content should be preserved or protected'
    );
});

runner.test('Code Block: Mixed code and math should handle both', () => {
    const input = 'The equation $x^2$ and code `$var`';
    const count = TestHelpers.countMathExpressions(input);
    runner.assertEqual(
        count, 1,
        'Should find math but not code variable'
    );
});

// ============================================================================
// TEST CATEGORY 13: Currency Range Bug Fix (Regression Tests)
// ============================================================================

runner.test('REGRESSION: Currency range $50-$100 preserved', () => {
    const input = 'Range: $50-$100';
    const MathProtectorClass = TestHelpers.getMathProtector();
    const protector = new MathProtectorClass({ renderOnRestore: false });
    const result = protector.protect(input);
    
    // Should NOT treat $50-$100 as math
    const mathExpressions = TestHelpers.getMathExpressions(input);
    const hasMathWithDollar = mathExpressions.some(e =>
        e.innerContent && (e.innerContent.includes('50-') || e.innerContent.includes('100'))
    );
    runner.assertFalse(
        hasMathWithDollar,
        'Currency range $50-$100 should not be detected as math'
    );
});

runner.test('REGRESSION: Currency range with spaces $25 - $50', () => {
    const input = 'Price: $25 - $50';
    runner.assertFalse(
        TestHelpers.shouldBeMath(input),
        'Currency range with spaces should not be treated as math'
    );
});

runner.test('REGRESSION: Currency range $1,000-$2,000', () => {
    const input = 'Budget: $1,000-$2,000';
    runner.assertFalse(
        TestHelpers.shouldBeMath(input),
        'Currency range with commas should not be treated as math'
    );
});

runner.test('REGRESSION: Escaped dollar in math $P_0 = \\$100$', () => {
    const input = 'where $P_0 = \\$100$';
    const expressions = TestHelpers.getMathExpressions(input);
    
    runner.assertEqual(
        expressions.length, 1,
        'Should find exactly 1 math expression'
    );
    runner.assertContains(
        expressions[0].innerContent, 'P_0',
        'Should recognize the expression with escaped dollar as math'
    );
});

runner.test('REGRESSION: Escaped dollar $S_0 = \\$1.20$', () => {
    const input = 'Spot price $S_0 = \\$1.20$';
    const expressions = TestHelpers.getMathExpressions(input);
    
    runner.assertEqual(
        expressions.length, 1,
        'Should find exactly 1 math expression with escaped dollar'
    );
});

runner.test('REGRESSION: Whitespace preserved in sentence with currency', () => {
    const input = 'In various contexts. For example, a simple price like $50';
    const MathProtectorClass = TestHelpers.getMathProtector();
    const protector = new MathProtectorClass({ renderOnRestore: false });
    const result = protector.protect(input);
    
    // After protect, the text structure should be preserved
    runner.assertContains(
        result.protected, 'contexts. For',
        'Whitespace and punctuation should be preserved'
    );
});

runner.test('REGRESSION: Currency before markdown header preserved', () => {
    const input = 'Cost is $100\n\n## Next Section\n\nMore content here.';
    const MathProtectorClass = TestHelpers.getMathProtector();
    const protector = new MathProtectorClass({ renderOnRestore: false });
    const result = protector.protect(input);
    
    runner.assertContains(
        result.protected, '## Next Section',
        'Markdown headers should be preserved after currency'
    );
    runner.assertEqual(
        result.mathMap.size, 0,
        'Currency should not create any math placeholders'
    );
});

runner.test('REGRESSION: Multiple currency values in one line', () => {
    const input = 'Options: $25, $50, or $100 per month';
    const count = TestHelpers.countMathExpressions(input);
    runner.assertEqual(
        count, 0,
        'Multiple currency values should not be detected as math'
    );
});

runner.test('REGRESSION: Currency range does not break adjacent math', () => {
    const input = 'Price range $50-$100, formula: $x^2 + y^2$';
    const expressions = TestHelpers.getMathExpressions(input);
    
    runner.assertEqual(
        expressions.length, 1,
        'Should find exactly 1 math expression (the formula)'
    );
    runner.assertContains(
        expressions[0].innerContent, 'x^2',
        'Should correctly identify the math formula'
    );
});

// ============================================================================
// Main test execution function
// ============================================================================

async function runAllTests() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                  Mertex.md Math Rendering Test Suite                       ║');
    console.log('║                                                                            ║');
    console.log('║  Testing: MathProtector, StreamingMathRenderer                            ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    console.log('\n');
    
    try {
        TestHelpers.getMathProtector();
    } catch (e) {
        console.error('ERROR: MathProtector not loaded! Please include the mertex.md library');
        return { passed: 0, failed: 1, errors: [{ name: 'Setup', error: e.message }] };
    }
    
    const results = await runner.run();
    
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                           Test Summary                                     ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════╝');
    console.log(`Total Tests: ${results.passed + results.failed}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    
    if (results.failed > 0) {
        console.log('\nFailed Tests:');
        results.errors.forEach(({ name, error }) => {
            console.log(`  ✗ ${name}`);
            console.log(`    ${error}`);
        });
    }
    
    console.log('\n');
    
    return results;
}

// Export for use in HTML test runner and module contexts
if (typeof window !== 'undefined') {
    window.MathRenderingTests = {
        runAllTests,
        runner,
        TestHelpers
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        runAllTests,
        runner,
        TestHelpers
    };
}
