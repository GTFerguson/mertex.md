/**
 * TestRunner - A simple test framework for mertex.md
 * Ported from nkrdn test framework with adaptations for mertex.md API
 */

// Simple test framework
class TestRunner {
    constructor() {
        this.tests = [];
        this.results = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    test(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('='.repeat(80));
        console.log('Running Mertex.md Tests');
        console.log('='.repeat(80));
        
        this.results = { passed: 0, failed: 0, errors: [] };
        
        for (const test of this.tests) {
            try {
                await test.fn();
                this.results.passed++;
                console.log(`✓ ${test.name}`);
            } catch (error) {
                this.results.failed++;
                this.results.errors.push({ name: test.name, error: error.message });
                console.error(`✗ ${test.name}`);
                console.error(`  Error: ${error.message}`);
            }
        }
        
        console.log('='.repeat(80));
        console.log(`Results: ${this.results.passed} passed, ${this.results.failed} failed`);
        console.log('='.repeat(80));
        
        return this.results;
    }

    assertEqual(actual, expected, message) {
        if (actual !== expected) {
            throw new Error(message || `Expected ${expected}, got ${actual}`);
        }
    }

    assertTrue(value, message) {
        if (!value) {
            throw new Error(message || `Expected true, got ${value}`);
        }
    }

    assertFalse(value, message) {
        if (value) {
            throw new Error(message || `Expected false, got ${value}`);
        }
    }

    assertContains(haystack, needle, message) {
        if (!haystack.includes(needle)) {
            throw new Error(message || `Expected "${haystack}" to contain "${needle}"`);
        }
    }

    assertNotContains(haystack, needle, message) {
        if (haystack.includes(needle)) {
            throw new Error(message || `Expected "${haystack}" not to contain "${needle}"`);
        }
    }
    
    assertGreaterThan(actual, expected, message) {
        if (actual <= expected) {
            throw new Error(message || `Expected ${actual} to be greater than ${expected}`);
        }
    }
    
    assertLessThan(actual, expected, message) {
        if (actual >= expected) {
            throw new Error(message || `Expected ${actual} to be less than ${expected}`);
        }
    }
}

/**
 * TestHelpers - Utility functions for testing MathProtector
 * Adapted for mertex.md MathProtector API
 */
const TestHelpers = {
    /**
     * Get the MathProtector class - works in both browser and Node
     */
    getMathProtector() {
        if (typeof MathProtector !== 'undefined') return MathProtector;
        if (typeof window !== 'undefined' && window.MathProtector) return window.MathProtector;
        if (typeof global !== 'undefined' && global.MathProtector) return global.MathProtector;
        throw new Error('MathProtector not loaded');
    },

    /**
     * Check if input content is detected as math
     */
    shouldBeMath(input) {
        const MathProtectorClass = this.getMathProtector();
        const protector = new MathProtectorClass();
        const result = protector.protect(input);
        return result.mathMap.size > 0;
    },

    /**
     * Check if input content should NOT be detected as math
     */
    shouldNotBeMath(input) {
        return !this.shouldBeMath(input);
    },

    /**
     * Check if content renders without error
     */
    shouldRenderWithoutError(input) {
        try {
            const MathProtectorClass = this.getMathProtector();
            const protector = new MathProtectorClass({ renderOnRestore: false });
            const protectResult = protector.protect(input);
            let processed = protectResult.protected;
            const restored = protector.restore(processed, protectResult.mathMap);
            return true;
        } catch (error) {
            console.error('Rendering error:', error);
            return false;
        }
    },

    /**
     * Count number of math expressions in input
     */
    countMathExpressions(input) {
        const MathProtectorClass = this.getMathProtector();
        const protector = new MathProtectorClass();
        const result = protector.protect(input);
        return result.mathMap.size;
    },

    /**
     * Get all math expressions from input
     */
    getMathExpressions(input) {
        const MathProtectorClass = this.getMathProtector();
        const protector = new MathProtectorClass();
        const result = protector.protect(input);
        const expressions = [];
        result.mathMap.forEach((info, placeholder) => {
            expressions.push({
                placeholder,
                original: info.original,
                innerContent: info.innerContent,
                display: info.display
            });
        });
        return expressions;
    },
    
    /**
     * Get MertexMD class if available
     */
    getMertexMD() {
        if (typeof MertexMD !== 'undefined') return MertexMD;
        if (typeof window !== 'undefined' && window.MertexMD) return window.MertexMD;
        if (typeof global !== 'undefined' && global.MertexMD) return global.MertexMD;
        return null;
    },
    
    /**
     * Test a full render pipeline
     */
    renderMarkdown(input) {
        const MertexMDClass = this.getMertexMD();
        if (MertexMDClass) {
            const mertex = new MertexMDClass({ renderOnRestore: false });
            return mertex.render(input);
        }
        return null;
    }
};

// Export for use in different contexts
if (typeof window !== 'undefined') {
    window.TestRunner = TestRunner;
    window.TestHelpers = TestHelpers;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TestRunner, TestHelpers };
}

// Also export as ES module if supported
if (typeof exports !== 'undefined') {
    exports.TestRunner = TestRunner;
    exports.TestHelpers = TestHelpers;
}
