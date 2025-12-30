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
        footer: {
            js: 'if(typeof window!=="undefined"){window.Mertex=Mertex.default||Mertex;}'
        }
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
        footer: {
            js: 'if(typeof window!=="undefined"){window.Mertex=Mertex.default||Mertex;}'
        }
    });
    console.log('✓ Minified bundle built');
    
    // Bundled version with all deps (for direct script tag usage)
    await esbuild.build({
        entryPoints: ['src/index.js'],
        bundle: true,
        banner: { js: banner },
        outfile: 'dist/mertex.bundled.min.js',
        format: 'iife',
        globalName: 'Mertex',
        platform: 'browser',
        minify: true,
        external: [], // Include all deps
        footer: {
            js: 'if(typeof window!=="undefined"){window.Mertex=Mertex.default||Mertex;}'
        }
    });
    console.log('✓ Bundled version built');
    
    console.log('\nBuild complete!');
}

build().catch((err) => {
    console.error('Build failed:', err);
    process.exit(1);
});
