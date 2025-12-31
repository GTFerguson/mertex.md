#!/usr/bin/env node
/**
 * Node.js Test Runner for Mertex.md Math Rendering Tests
 * 
 * This script provides a minimal environment to run tests without JSDOM.
 * It directly loads the MathProtector class and runs the test suite.
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
global.katex = undefined; // KaTeX not available in Node

// Mock console for cleaner output
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

// Suppress internal logs during test execution
let suppressLogs = false;
console.log = (...args) => {
    if (suppressLogs && args[0]?.toString().startsWith('[MathProtector]')) return;
    if (suppressLogs && args[0]?.toString().startsWith('[Mertex')) return;
    originalLog.apply(console, args);
};
console.error = originalError;
console.warn = (...args) => {
    if (suppressLogs && args[0]?.toString().startsWith('[MathProtector]')) return;
    if (suppressLogs && args[0]?.toString().startsWith('[Mertex')) return;
    originalWarn.apply(console, args);
};

// Path to files
const testPath = __dirname;
const srcPath = path.join(__dirname, '..', '..', 'src');

console.log('Loading mertex.md MathProtector...');

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

// Load currency detector utility first
try {
    const currencyDetectorCode = fs.readFileSync(path.join(srcPath, 'utils', 'currency-detector.js'), 'utf8');
    
    // Convert ES module to CommonJS-compatible format
    const currencyDetectorCJS = currencyDetectorCode
        .replace(/export\s+function\s+looksLikeCurrency/g, 'function looksLikeCurrency')
        .replace(/export\s+function\s+isCurrencyRange/g, 'function isCurrencyRange')
        .replace(/export\s+default\s+.*?;/g, '')
        .trim();
    
    // Create the functions
    const currencyScript = new vm.Script(currencyDetectorCJS + '\nglobal.looksLikeCurrency = looksLikeCurrency;\nglobal.isCurrencyRange = isCurrencyRange;');
    currencyScript.runInThisContext();
    
    console.log('✓ Currency detector loaded from source');
} catch (e) {
    console.error('Failed to load currency detector:', e.message);
    console.error(e.stack);
    process.exit(1);
}

// Load MathProtector directly from source
try {
    const mathProtectorCode = fs.readFileSync(path.join(srcPath, 'core', 'math-protector.js'), 'utf8');
    
    // Convert ES module to CommonJS-compatible format
    const mathProtectorCJS = mathProtectorCode
        .replace(/import\s*{\s*encodeBase64\s*,\s*decodeBase64\s*}\s*from\s*['"].*['"];?\n?/g, '')
        .replace(/import\s*{\s*looksLikeCurrency\s*,\s*isCurrencyRange\s*}\s*from\s*['"].*['"];?\n?/g, '')
        .replace(/export\s+class\s+MathProtector/g, 'class MathProtector')
        .replace(/export\s+default\s+MathProtector;?/g, '');
    
    // Create the class
    const script = new vm.Script(mathProtectorCJS + '\nglobal.MathProtector = MathProtector;');
    script.runInThisContext();
    
    console.log('✓ MathProtector loaded from source');
} catch (e) {
    console.error('Failed to load MathProtector:', e.message);
    console.error(e.stack);
    process.exit(1);
}

// Verify MathProtector is available
if (typeof global.MathProtector === 'undefined') {
    console.error('ERROR: MathProtector not available after loading');
    process.exit(1);
}

// Test MathProtector works
try {
    const testProtector = new global.MathProtector();
    const testResult = testProtector.protect('$x^2$');
    if (!testResult.mathMap || testResult.mathMap.size === 0) {
        console.error('WARNING: MathProtector may not be working correctly');
    } else {
        console.log('✓ MathProtector verified working');
    }
} catch (e) {
    console.error('ERROR: MathProtector test failed:', e.message);
    process.exit(1);
}

console.log('Loading test framework...');

// Load test runner
const testRunnerCode = fs.readFileSync(path.join(testPath, 'test-runner.js'), 'utf8');
const testRunnerScript = new vm.Script(testRunnerCode);
testRunnerScript.runInThisContext();

console.log('Loading test cases...');

// Load test cases
const testCasesCode = fs.readFileSync(path.join(testPath, 'math-rendering.test.js'), 'utf8');
const testCasesScript = new vm.Script(testCasesCode);
testCasesScript.runInThisContext();

console.log('');

// Run tests with suppressed internal logs
suppressLogs = true;

// Run the tests
runAllTests().then(results => {
    suppressLogs = false;
    
    // Output final summary
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('FINAL TEST RESULTS');
    console.log('═'.repeat(80));
    console.log(`Total: ${results.passed + results.failed}`);
    console.log(`Passed: ${results.passed}`);
    console.log(`Failed: ${results.failed}`);
    
    if (results.errors && results.errors.length > 0) {
        console.log('\n--- FAILED TESTS ---');
        results.errors.forEach(({ name, error }) => {
            console.log(`\n✗ ${name}`);
            console.log(`  → ${error}`);
        });
    }
    
    // Output pass rate
    const total = results.passed + results.failed;
    const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
    console.log(`\nPass Rate: ${passRate}%`);
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
}).catch(err => {
    console.error('Test runner error:', err);
    process.exit(1);
});
