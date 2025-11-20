# Phase 1 Token Budget Fitter - Examples

This document provides comprehensive examples for using the Token Budget Fitter in Context Manager v3.1.0.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Fitting Strategies](#fitting-strategies)
- [Real-World Scenarios](#real-world-scenarios)
- [Understanding Fit Reports](#understanding-fit-reports)
- [Troubleshooting](#troubleshooting)

---

## Basic Usage

### Setting a Token Budget

```bash
# Basic token budget (100,000 tokens)
context-manager --target-tokens 100000

# Shorthand notation with 'k' suffix
context-manager --target-tokens 100k

# Million tokens with 'M' suffix
context-manager --target-tokens 1.5M

# With specific strategy
context-manager --target-tokens 50k --fit-strategy balanced
```

### Token Budget Formats

| Format | Value | Description |
|--------|-------|-------------|
| `100000` | 100,000 | Plain number |
| `100k` | 100,000 | Thousands (k suffix) |
| `1.5M` | 1,500,000 | Millions (M suffix) |
| `50K` | 50,000 | Case insensitive |

---

## Fitting Strategies

### 1. Auto Strategy (Default)

**Description:** Automatically selects the best strategy based on your codebase characteristics.

```bash
# Auto strategy (default)
context-manager --target-tokens 100k
context-manager --target-tokens 100k --fit-strategy auto
```

**When to use:**
- You're not sure which strategy to use
- You want the system to optimize automatically
- General-purpose token reduction

**How it works:**
1. Analyzes codebase composition
2. Calculates reduction needed
3. Selects optimal strategy:
   - Small reduction (< 30%): `top-n`
   - Medium reduction (30-60%): `balanced`
   - Large reduction (> 60%): `methods-only`

**Example:**
```bash
$ context-manager --target-tokens 100k --fit-strategy auto

🎯 Token Budget Fitting
═══════════════════════════════════════
✅ Successfully fit 45 files within 100000 token budget
   Strategy: balanced (auto-selected)
   Tokens: 98,234 / 100,000 (good fit)
   Reduction: 523,766 tokens (84.2%)
   Entry points preserved: 3
```

### 2. Shrink Docs Strategy

**Description:** Removes documentation files first, preserving all code.

```bash
context-manager --target-tokens 100k --fit-strategy shrink-docs
```

**What gets removed (in order):**
1. Markdown files (`*.md`)
2. Documentation directories (`docs/`, `documentation/`)
3. README files
4. Comment-heavy files
5. Example code
6. Tutorial files

**What's preserved:**
- All source code
- Configuration files
- Tests (if needed)

**When to use:**
- You need all the code but can skip docs
- Documentation is taking up significant tokens
- Code review scenarios

**Example:**
```bash
$ context-manager --target-tokens 80k --fit-strategy shrink-docs

🎯 Token Budget Fitting
═══════════════════════════════════════
✅ Successfully fit 58 files within 80000 token budget
   Strategy: shrink-docs
   Tokens: 79,450 / 80,000 (tight fit)
   Reduction: 145,550 tokens (64.7%)
   
📊 Breakdown:
   Documentation removed: 23 files (145k tokens)
   Code preserved: 58 files (79k tokens)
   Entry points preserved: 2
```

### 3. Balanced Strategy

**Description:** Optimizes the token-to-file efficiency ratio, balancing coverage and size.

```bash
context-manager --target-tokens 100k --fit-strategy balanced
```

**How it works:**
1. Calculates efficiency score for each file: `importance / tokens`
2. Sorts files by efficiency
3. Selects files with best efficiency until budget is reached

**When to use:**
- You want good coverage with reasonable token usage
- You need a mix of important and supporting files
- General-purpose optimization

**Example:**
```bash
$ context-manager --target-tokens 100k --fit-strategy balanced

🎯 Token Budget Fitting
═══════════════════════════════════════
✅ Successfully fit 42 files within 100000 token budget
   Strategy: balanced
   Tokens: 97,823 / 100,000 (good fit)
   Reduction: 487,177 tokens (83.3%)
   
📊 Breakdown:
   High efficiency files: 28 (65k tokens)
   Medium efficiency files: 14 (33k tokens)
   Average importance: 74.2
   Entry points preserved: 3
```

### 4. Methods Only Strategy

**Description:** Extracts only methods from files, providing maximum token reduction.

```bash
context-manager --target-tokens 50k --fit-strategy methods-only
```

**How it works:**
1. Enables method-level analysis automatically
2. Extracts only function/method definitions
3. Excludes file-level code, imports, comments
4. Typically achieves 60-80% token reduction

**When to use:**
- You need maximum token reduction
- You only care about function signatures and logic
- Ultra-compact LLM context
- Quick code understanding

**Example:**
```bash
$ context-manager --target-tokens 30k --fit-strategy methods-only

🎯 Token Budget Fitting
═══════════════════════════════════════
✅ Successfully fit 65 files within 30000 token budget
   Strategy: methods-only
   Tokens: 29,456 / 30,000 (tight fit)
   Reduction: 755,544 tokens (96.2%)
   
📊 Breakdown:
   Methods extracted: 342
   Files processed: 65
   Average methods per file: 5.3
   Token reduction: 96.2%
   Entry points preserved: 2
   
💡 Recommendations:
   • Excellent compression achieved
   • Consider using full files for entry points
```

### 5. Top-N Strategy

**Description:** Selects the N most important files based on importance scoring.

```bash
context-manager --target-tokens 100k --fit-strategy top-n
```

**Importance Scoring Factors:**
- **Entry points** (index.js, main.py, app.js): +40 points
- **Core directories** (src/core/, lib/core/): +30 points
- **File size** (larger files): +10-20 points
- **Path depth** (shallower = more important): +5-15 points
- **Naming patterns** (config, utils, helpers): +5-10 points

**When to use:**
- You want only the most critical files
- You need focused analysis on core functionality
- You're debugging specific issues

**Example:**
```bash
$ context-manager --target-tokens 100k --fit-strategy top-n

🎯 Token Budget Fitting
═══════════════════════════════════════
✅ Successfully fit 35 files within 100000 token budget
   Strategy: top-n
   Tokens: 98,765 / 100,000 (good fit)
   Reduction: 586,235 tokens (85.6%)
   
📊 Breakdown:
   High priority files: 35 (avg importance: 87.3)
   Entry points: 3
   Core modules: 18
   Utilities: 14
   
💡 Recommendations:
   • 47 medium-priority files excluded
   • Consider increasing budget to include more files
```

---

## Real-World Scenarios

### Scenario 1: Fitting Large Repo into Claude Context

**Goal:** Fit a 500k token repository into Claude Sonnet's 200k context window.

```bash
# Step 1: Check current size
context-manager --cli

# Output: 500,000 tokens (too large)

# Step 2: Apply aggressive fitting
context-manager --target-tokens 180k --fit-strategy methods-only

# Step 3: Verify fit
# Output: 178,450 tokens (fits!)

# Step 4: Export to clipboard
context-manager --target-tokens 180k --fit-strategy methods-only --context-clipboard
```

**Result:** Successfully reduced from 500k to 178k tokens (64% reduction) while preserving all method signatures.

### Scenario 2: Code Review with Token Limit

**Goal:** Review a PR but stay within 100k token budget.

```bash
# Use review preset with token budget
context-manager --preset review --target-tokens 100k

# With tracing to see what was excluded
context-manager --preset review --target-tokens 100k --trace-rules

# Save report for documentation
context-manager --preset review --target-tokens 100k --save-report
```

**Result:** Focused on source code, excluded tests and docs, fit within budget.

### Scenario 3: Quick Bug Fix Query

**Goal:** Get minimal context for a quick AI query about a bug.

```bash
# Ultra-minimal context
context-manager --preset minimal --target-tokens 10k

# With methods only for maximum compression
context-manager --preset minimal --target-tokens 5k --fit-strategy methods-only

# Copy to clipboard for ChatGPT
context-manager --preset minimal --target-tokens 10k --context-clipboard
```

**Result:** 5k tokens with only entry points and core methods.

### Scenario 4: Security Audit with Budget

**Goal:** Security review staying within 80k token budget.

```bash
# Security preset with budget
context-manager --preset security-audit --target-tokens 80k

# With balanced strategy for good coverage
context-manager --preset security-audit --target-tokens 80k --fit-strategy balanced

# With detailed report
context-manager --preset security-audit --target-tokens 80k --save-report --trace-rules
```

**Result:** Focused on security-critical code, balanced coverage within budget.

### Scenario 5: Documentation Generation

**Goal:** Generate API docs staying within 70k tokens.

```bash
# Documentation preset with budget
context-manager --preset documentation --target-tokens 70k

# With shrink-docs to remove non-API docs
context-manager --preset documentation --target-tokens 70k --fit-strategy shrink-docs

# Export as markdown
context-manager --preset documentation --target-tokens 70k --output markdown
```

**Result:** Public APIs and interfaces within budget, internal docs removed.

### Scenario 6: Incremental Budget Adjustment

**Goal:** Find the optimal token budget for your workflow.

```bash
# Try different budgets
context-manager --target-tokens 150k --save-report
mv token-analysis-report.json report-150k.json

context-manager --target-tokens 100k --save-report
mv token-analysis-report.json report-100k.json

context-manager --target-tokens 75k --save-report
mv token-analysis-report.json report-75k.json

# Compare reports to find sweet spot
```

**Result:** Identified 100k as optimal balance between coverage and size.

---

## Understanding Fit Reports

### Fit Quality Indicators

The fitter reports fit quality based on how close you are to the budget:

| Fit Quality | Token Usage | Description |
|-------------|-------------|-------------|
| **Perfect** | 95-100% | Excellent fit, using almost all budget |
| **Good** | 85-95% | Good fit, reasonable buffer |
| **Tight** | 75-85% | Acceptable fit, some waste |
| **Loose** | < 75% | Poor fit, significant waste |

### Example Reports

#### Perfect Fit
```
🎯 Token Budget Fitting
═══════════════════════════════════════
✅ Successfully fit 45 files within 100000 token budget
   Strategy: balanced
   Tokens: 98,234 / 100,000 (perfect fit)
   Reduction: 523,766 tokens (84.2%)
   Entry points preserved: 3
```

#### Good Fit
```
🎯 Token Budget Fitting
═══════════════════════════════════════
✅ Successfully fit 38 files within 100000 token budget
   Strategy: top-n
   Tokens: 89,456 / 100,000 (good fit)
   Reduction: 535,544 tokens (85.7%)
   Entry points preserved: 2
```

#### Tight Fit
```
🎯 Token Budget Fitting
═══════════════════════════════════════
✅ Successfully fit 52 files within 100000 token budget
   Strategy: shrink-docs
   Tokens: 78,234 / 100,000 (tight fit)
   Reduction: 546,766 tokens (87.5%)
   Entry points preserved: 3

💡 Recommendations:
   • Consider increasing token budget for better coverage
   • 23 medium-priority files were excluded
```

#### Impossible Fit
```
🎯 Token Budget Fitting
═══════════════════════════════════════
❌ Cannot fit within 10000 token budget
   Minimum required: 45,678 tokens
   Entry points alone: 45,678 tokens
   
💡 Recommendations:
   • Increase token budget to at least 50k
   • Use methods-only strategy for maximum reduction
   • Consider using minimal preset
```

### Recommendations

The fitter provides intelligent recommendations based on the fit result:

**When fit is tight:**
- "Consider increasing token budget for better coverage"
- "X high-priority files were excluded"
- "Try 'balanced' strategy for better efficiency"

**When reduction is high:**
- "Excellent compression achieved"
- "Consider using full files for entry points"

**When fit is impossible:**
- "Increase token budget to at least Xk"
- "Use methods-only strategy for maximum reduction"
- "Consider using minimal preset"

---

## Troubleshooting

### Problem: Cannot Fit Within Budget

**Error:**
```
❌ Cannot fit within 10000 token budget
   Minimum required: 45,678 tokens
```

**Solutions:**

1. **Increase budget:**
```bash
context-manager --target-tokens 50k
```

2. **Use aggressive strategy:**
```bash
context-manager --target-tokens 10k --fit-strategy methods-only
```

3. **Use minimal preset:**
```bash
context-manager --preset minimal --target-tokens 10k
```

4. **Combine approaches:**
```bash
context-manager --preset minimal --target-tokens 10k --fit-strategy methods-only
```

### Problem: Too Many Important Files Excluded

**Symptom:** Fit report shows many high-priority files excluded.

**Solutions:**

1. **Increase budget:**
```bash
context-manager --target-tokens 150k  # Instead of 100k
```

2. **Use different strategy:**
```bash
# Try balanced instead of top-n
context-manager --target-tokens 100k --fit-strategy balanced
```

3. **Use methods-only for more files:**
```bash
# Extract methods from more files
context-manager --target-tokens 100k --fit-strategy methods-only
```

### Problem: Fit is Too Loose (Wasting Budget)

**Symptom:** Using only 60% of token budget.

**Solutions:**

1. **Decrease budget:**
```bash
context-manager --target-tokens 60k  # Instead of 100k
```

2. **Use different strategy:**
```bash
# Try top-n to include more files
context-manager --target-tokens 100k --fit-strategy top-n
```

3. **Include more file types:**
```bash
# Use a less restrictive preset
context-manager --preset pair-program --target-tokens 100k
```

### Problem: Entry Points Excluded

**Symptom:** Important entry point files are missing.

**Solution:**

Entry points are always preserved by default. If they're missing, check:

1. **Verify entry point detection:**
```bash
# Use tracing to see what's detected
context-manager --target-tokens 100k --trace-rules
```

2. **Check file naming:**
Entry points must match these patterns:
- `index.js`, `index.ts`, `index.py`
- `main.js`, `main.py`, `main.go`
- `app.js`, `app.py`
- `server.js`, `server.py`

3. **Manually prioritize:**
Add to `.contextinclude`:
```
# High priority entry points
src/index.js
src/main.py
```

### Problem: Strategy Not Working as Expected

**Symptom:** Strategy doesn't seem to be doing what you expect.

**Solutions:**

1. **Use tracing to understand:**
```bash
context-manager --target-tokens 100k --fit-strategy balanced --trace-rules
```

2. **Try different strategy:**
```bash
# Compare strategies
context-manager --target-tokens 100k --fit-strategy auto
context-manager --target-tokens 100k --fit-strategy balanced
context-manager --target-tokens 100k --fit-strategy top-n
```

3. **Check fit report:**
Look at the breakdown to understand what was included/excluded.

---

## Best Practices

### 1. Start with Auto Strategy

Let the system choose the best strategy:

```bash
context-manager --target-tokens 100k
```

### 2. Use Tracing to Understand Decisions

Always use `--trace-rules` when debugging fit issues:

```bash
context-manager --target-tokens 100k --trace-rules
```

### 3. Combine with Presets

Presets + token budgets = powerful workflows:

```bash
context-manager --preset review --target-tokens 80k
context-manager --preset llm-explain --target-tokens 30k
```

### 4. Save Reports for Comparison

Compare different budgets and strategies:

```bash
context-manager --target-tokens 100k --save-report
mv token-analysis-report.json report-100k-auto.json

context-manager --target-tokens 100k --fit-strategy balanced --save-report
mv token-analysis-report.json report-100k-balanced.json
```

### 5. Know Your LLM Context Windows

Common LLM context windows:

| Model | Context Window | Recommended Budget |
|-------|----------------|-------------------|
| GPT-4 Turbo | 128k | 100-120k |
| Claude Sonnet 4.5 | 200k | 180-190k |
| Claude Opus 4 | 200k | 180-190k |
| Gemini 1.5 Pro | 1M | 900k-950k |
| Gemini 2.0 Flash | 1M | 900k-950k |

### 6. Use Methods-Only for Maximum Compression

When you need aggressive reduction:

```bash
context-manager --target-tokens 30k --fit-strategy methods-only
```

### 7. Preserve Entry Points

Entry points are preserved by default, but verify:

```bash
# Check fit report for "Entry points preserved: X"
context-manager --target-tokens 100k
```

---

## Related Documentation

- [Main README](../README.md) - Complete feature documentation
- [Token Budget Fitter README](../lib/optimizers/README.md) - Technical documentation
- [Preset Examples](./phase1-presets.md) - Preset system examples
- [Rule Tracer Examples](./phase1-rule-tracer.md) - Debugging examples

---

**Version:** 3.1.0  
**Last Updated:** 2025-11-19
