---
title: Data Flow
created: 2026-03-19
updated: 2026-03-19
status: current
tags: [architecture, data-flow]
---

# Data Flow

## Overview

mertex.md has two major data flows: **static rendering** (one-shot Markdown to HTML) and **streaming rendering** (incremental chunks to live DOM). Both share the same core pipeline but differ in how they manage state across renders.

## Static Rendering

The primary flow for rendering a complete Markdown string to HTML.

```mermaid
flowchart TD
    A[Markdown string] --> B{Has mermaid blocks?}
    B -->|yes| C[MermaidHandler.protect<br/>Extract blocks → placeholders]
    B -->|no| D{Has katex blocks?}
    C --> D

    D -->|yes| E[KaTeXHandler.protect<br/>Extract blocks → placeholders]
    D -->|no| F{protectMath enabled?}
    E --> F

    F -->|yes| G[MathProtector.protect]
    F -->|no| H[marked.parse]

    subgraph MathProtector.protect
        G --> G1[Protect currency ranges<br/>$50-$100 → ::CUR0::]
        G1 --> G2[Extract $$ math<br/>→ ::MATH_0::]
        G2 --> G3["Extract \\[..\\] math"]
        G3 --> G4["Extract \\(..\\) math"]
        G4 --> G5[Extract $ math<br/>with currency check]
        G5 --> G6[Restore currency<br/>::CUR0:: → $50-$100]
    end

    G6 --> H[marked.parse]
    H --> I{highlight enabled?}
    I -->|yes| J[hljs.highlight<br/>code blocks]
    I -->|no| K[DOMPurify.sanitize]
    J --> K

    K --> L{mathMap non-empty?}
    L -->|yes| M[MathProtector.restore<br/>Placeholders → KaTeX HTML]
    L -->|no| N["Return {html, mermaidMap, katexMap}"]
    M --> N
```

**Entry point:** `MertexMD.render(markdown)` or `renderMarkdown(text, options)`
**Processing:** protect → parse → highlight → sanitise → restore
**Exit point:** Returns `{ html, mermaidMap, katexMap }` — HTML string with mermaid/katex maps for deferred DOM rendering

**Key transformation points:**

| Stage | Location | Transform |
|-------|----------|-----------|
| Currency protection | `math-protector.js:57-69` | `$50-$100` → `::CUR0::` |
| Math protection | `math-protector.js:78-83` | `$x^2$` → `::MATH_0::` |
| Mermaid protection | `mermaid-handler.js:84-88` | ` ```mermaid...``` ` → `<div class="mermaid-placeholder">` |
| KaTeX block protection | `katex-handler.js:29-38` | ` ```katex...``` ` → `<div class="katex-placeholder">` |
| Markdown parse | `markdown-renderer.js:93` | Protected Markdown → HTML |
| Code highlighting | `markdown-renderer.js:74-88` | `<code>` → `<code class="hljs">` |
| HTML sanitisation | `markdown-renderer.js:100-122` | Raw HTML → sanitised HTML (allowlisted tags/attrs) |
| Math restore | `math-protector.js:131-158` | `::MATH_0::` → KaTeX-rendered HTML |
| Currency restore | `math-protector.js:98-108` | `::CUR0::` → `$50-$100` (before markdown parse) |

---

## Streaming Rendering

For real-time content (e.g., LLM output arriving chunk by chunk), the `StreamRenderer` accumulates content and re-renders the full document on each chunk.

```mermaid
sequenceDiagram
    participant Consumer
    participant SR as StreamRenderer
    participant ICR as IncrementalRenderer
    participant SMR as StreamingMathRenderer
    participant Pipeline as renderMarkdown()

    Consumer->>SR: appendContent(chunk)
    SR->>SR: content += chunk
    SR->>Pipeline: renderMarkdown(fullContent)
    Pipeline-->>SR: {html, mermaidMap}

    SR->>ICR: appendNewContent(element, content, renderFn)
    ICR->>ICR: Check: content changed?
    ICR->>Pipeline: renderMarkdown(fullContent)
    Pipeline-->>ICR: {html}
    ICR->>ICR: Replace element.innerHTML
    ICR->>ICR: Restore cached mermaid SVGs
    ICR->>ICR: Add streaming cursor

    SR->>SMR: processChunk(content, element)
    SMR->>SMR: Extract formula signatures
    SMR->>SMR: Skip if no new formulas
    SMR->>SMR: renderMathInElement()

    Consumer->>SR: finalize()
    SR->>SR: Remove streaming cursor
    SR->>SMR: finalRender(element)
    SR->>Pipeline: renderMarkdown(fullContent)
    SR->>SR: MermaidHandler.renderInElement()
```

**Entry point:** `stream.appendContent(chunk)` called repeatedly
**Processing:** Each call re-renders the full accumulated content; the incremental renderer caches mermaid SVGs
**Exit point:** `stream.finalize()` triggers final math and mermaid rendering

**Key state tracked across chunks:**

| State | Location | Purpose |
|-------|----------|---------|
| `content` | `StreamRenderer` | Accumulated raw Markdown |
| `lastContent` | `IncrementalContentRenderer` | Previous render content (skip if unchanged) |
| `mermaidCache` | `IncrementalContentRenderer` | Map of mermaid ID → rendered SVG outerHTML |
| `seenFormulas` | `StreamingMathRenderer` | Set of formula signature hashes (skip re-render) |
| `processedFormulas` | `IncrementalContentRenderer` | Set of KaTeX formula hashes |

---

## Self-Correcting Render Flow

When a Mermaid or KaTeX render fails and `selfCorrect` is configured, the system enters a retry loop with consumer-provided error correction.

```mermaid
flowchart TD
    A[Render attempt fails] --> B{selfCorrect.fix configured?}
    B -->|no| C[Log error, skip]
    B -->|yes| D[Add .mertex-fixing class]

    D --> E[Call fix callback<br/>fix code, format, error]
    E --> F[Retry render with<br/>corrected code]
    F --> G{Render succeeded?}

    G -->|yes| H[Remove .mertex-fixing<br/>Use corrected result]
    G -->|no| I{Retries remaining?}
    I -->|yes| E
    I -->|no| J[Remove .mertex-fixing<br/>Log failure]
```

**Entry point:** Render failure in `MermaidHandler.renderInElement()`, `KaTeXHandler.renderInElement()`, or `MathProtector._renderMathWithSelfCorrect()`
**Processing:** Up to 3 fix-and-retry cycles via `selfCorrectRender()`
**Exit point:** `{ success: true, result, code }` or `{ success: false }`

---

## DOM Rendering Flow

When rendering into a DOM element (via `renderInElement` or `autoRender`), there is a two-phase process: first the HTML is set, then deferred rendering happens for mermaid diagrams and katex blocks.

```mermaid
flowchart TD
    A[renderMarkdownInElement] --> B[Get element text content]
    B --> C[renderMarkdown pipeline]
    C --> D[Set element.innerHTML = html]
    D --> E[Add .markdown-rendered class]

    E --> F{katexMap non-empty?}
    F -->|yes| G[KaTeXHandler.renderInElement<br/>Replace placeholders with rendered math]
    F -->|no| H{protectMath disabled?}

    G --> H
    H -->|yes + KaTeX available| I[renderMathInElement<br/>KaTeX auto-render pass]
    H -->|no| J{mermaidMap non-empty?}
    I --> J

    J -->|yes| K[MermaidHandler.renderInElement<br/>Replace placeholders with SVGs]
    J -->|no| L[Done]
    K --> L
```

> [!IMPORTANT]
> When `protectMath` is `true` (the default), the KaTeX auto-render pass is skipped. MathProtector already handled all math expressions during the pipeline, and running auto-render again would incorrectly pick up currency values like `$50`.
