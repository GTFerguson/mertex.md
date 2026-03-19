/**
 * Build script for mertex.md using esbuild
 */

import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

const banner = `/**
 * mertex.md v${pkg.version}
 * ${pkg.description}
 * @license MIT
 */`;

// Footer that exposes backward-compatible globals for drop-in replacement
// Note: esbuild exports getters, so we access them directly as the getters auto-invoke
const legacyGlobalsFooter = `
if(typeof window!=="undefined"){
    // Mertex is the IIFE global — ensure MertexMD class is accessible
    // esbuild IIFE may put MertexMD as Mertex.MertexMD or as Mertex.default
    var _M = Mertex.MertexMD || Mertex.default || Mertex;

    // Expose MertexMD as a top-level global with all sub-exports attached
    window.MertexMD = Object.assign(_M, {
        MertexMD: _M,
        MathProtector: Mertex.MathProtector,
        IncrementalContentRenderer: Mertex.IncrementalContentRenderer,
        StreamingMathRenderer: Mertex.StreamingMathRenderer,
        MermaidHandler: Mertex.MermaidHandler,
        KaTeXHandler: Mertex.KaTeXHandler,
        renderMarkdown: Mertex.renderMarkdown,
        renderMarkdownLegacy: Mertex.renderMarkdownLegacy,
        renderMarkdownInElement: Mertex.renderMarkdownInElement,
        autoRenderMarkdown: Mertex.autoRenderMarkdown,
        initMarkdownRenderer: Mertex.initMarkdownRenderer,
        selfCorrectRender: Mertex.selfCorrectRender,
        VERSION: Mertex.VERSION
    });

    // Keep Mertex as alias
    window.Mertex = window.MertexMD;

    // Backward-compatible globals
    window.MarkdownRenderer={
        render: Mertex.renderMarkdown,
        renderLegacy: Mertex.renderMarkdownLegacy,
        renderInElement: Mertex.renderMarkdownInElement,
        autoRender: Mertex.autoRenderMarkdown,
        init: Mertex.initMarkdownRenderer,
        mermaid: Mertex.MermaidHandler || {},
        katex: Mertex.KaTeXHandler || {}
    };
    window.MathProtector = Mertex.MathProtector;
    window.IncrementalContentRenderer = Mertex.IncrementalContentRenderer;
    window.StreamingMathRenderer = Mertex.StreamingMathRenderer;
    window.MermaidHandler = Mertex.MermaidHandler;
    window.KaTeXHandler = Mertex.KaTeXHandler;
}
`;

const commonOptions = {
    entryPoints: ['src/index.js'],
    bundle: true,
    banner: { js: banner },
    sourcemap: true,
    external: ['marked', 'dompurify', 'katex', 'mermaid', 'highlight.js']
};

async function build() {
    console.log('Building mertex.md...');
    
    // ESM bundle
    await esbuild.build({
        ...commonOptions,
        outfile: 'dist/mertex.esm.js',
        format: 'esm',
        platform: 'browser'
    });
    console.log('✓ ESM bundle built');
    
    // UMD bundle (for script tags)
    await esbuild.build({
        ...commonOptions,
        outfile: 'dist/mertex.umd.js',
        format: 'iife',
        globalName: 'Mertex',
        platform: 'browser',
        footer: { js: legacyGlobalsFooter }
    });
    console.log('✓ UMD bundle built');
    
    // Minified UMD bundle
    await esbuild.build({
        ...commonOptions,
        outfile: 'dist/mertex.min.js',
        format: 'iife',
        globalName: 'Mertex',
        platform: 'browser',
        minify: true,
        footer: { js: legacyGlobalsFooter }
    });
    console.log('✓ Minified bundle built');
    
    // Bundled version with marked (for direct script tag usage)
    // Note: KaTeX, Mermaid, highlight.js are large - keep them external
    await esbuild.build({
        entryPoints: ['src/index.js'],
        bundle: true,
        banner: { js: banner },
        outfile: 'dist/mertex.bundled.min.js',
        format: 'iife',
        globalName: 'Mertex',
        platform: 'browser',
        minify: true,
        external: ['katex', 'mermaid', 'highlight.js'], // Keep large libs external
        footer: { js: legacyGlobalsFooter }
    });
    console.log('✓ Bundled version built');
    
    console.log('\nBuild complete!');
}

build().catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
});
