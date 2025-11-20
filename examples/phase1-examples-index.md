# Phase 1 Core Enhancements - Examples Index

This document provides an index of all Phase 1 feature examples and guides you to the right documentation for your use case.

## Quick Links

- [Preset System Examples](./phase1-presets.md) - Ready-to-use configuration profiles
- [Token Budget Fitter Examples](./phase1-token-budget.md) - Intelligent file selection for LLM context windows
- [Rule Tracer Examples](./phase1-rule-tracer.md) - Debug filter configurations

---

## Find Examples by Use Case

### 🔍 I want to...

#### Optimize for Code Review
→ [Preset System: Code Review Scenario](./phase1-presets.md#scenario-1-code-review)
```bash
context-manager --preset review --target-tokens 80k --trace-rules
```

#### Fit Large Repo into LLM Context
→ [Token Budget: Fitting Large Repo](./phase1-token-budget.md#scenario-1-fitting-large-repo-into-claude-context)
```bash
context-manager --target-tokens 180k --fit-strategy methods-only
```

#### Debug Why Files Are Excluded
→ [Rule Tracer: File Not Being Included](./phase1-rule-tracer.md#scenario-1-file-not-being-included)
```bash
context-manager --trace-rules
```

#### Generate Ultra-Compact LLM Context
→ [Preset System: LLM Explanation](./phase1-presets.md#scenario-2-llm-explanation)
→ [Token Budget: Quick Bug Fix](./phase1-token-budget.md#scenario-3-quick-bug-fix-query)
```bash
context-manager --preset llm-explain --target-tokens 30k --fit-strategy methods-only
```

#### Perform Security Audit
→ [Preset System: Security Audit](./phase1-presets.md#scenario-3-security-audit)
```bash
context-manager --preset security-audit --target-tokens 100k --trace-rules
```

#### Generate API Documentation
→ [Preset System: Documentation Generation](./phase1-presets.md#scenario-4-documentation-generation)
```bash
context-manager --preset documentation --target-tokens 70k
```

#### Quick Debugging with Minimal Context
→ [Preset System: Minimal Debugging](./phase1-presets.md#scenario-5-minimal-debugging)
```bash
context-manager --preset minimal --target-tokens 10k
```

#### Understand Pattern Matching
→ [Rule Tracer: Pattern Analysis](./phase1-rule-tracer.md#pattern-analysis)
```bash
context-manager --trace-rules
```

#### Create Custom Preset
→ [Preset System: Custom Presets](./phase1-presets.md#custom-presets)

#### Compare Different Strategies
→ [Token Budget: Fitting Strategies](./phase1-token-budget.md#fitting-strategies)

#### Fix Conflicting Patterns
→ [Rule Tracer: Conflicting Patterns](./phase1-rule-tracer.md#scenario-4-conflicting-patterns)

---

## Examples by Feature

### 🎨 Preset System

**Basic Operations:**
- [Listing Presets](./phase1-presets.md#listing-available-presets)
- [Viewing Preset Details](./phase1-presets.md#viewing-preset-details)
- [Applying a Preset](./phase1-presets.md#applying-a-preset)

**Scenarios:**
1. [Code Review](./phase1-presets.md#scenario-1-code-review)
2. [LLM Explanation](./phase1-presets.md#scenario-2-llm-explanation)
3. [Security Audit](./phase1-presets.md#scenario-3-security-audit)
4. [Documentation Generation](./phase1-presets.md#scenario-4-documentation-generation)
5. [Minimal Debugging](./phase1-presets.md#scenario-5-minimal-debugging)
6. [Pair Programming](./phase1-presets.md#scenario-6-pair-programming)
7. [Full Analysis](./phase1-presets.md#scenario-7-full-analysis)

**Advanced:**
- [Creating Custom Presets](./phase1-presets.md#creating-a-custom-preset)
- [Example Custom Presets](./phase1-presets.md#example-custom-presets)
- [Troubleshooting](./phase1-presets.md#troubleshooting)

### 🎯 Token Budget Fitter

**Basic Operations:**
- [Setting Token Budget](./phase1-token-budget.md#setting-a-token-budget)
- [Token Budget Formats](./phase1-token-budget.md#token-budget-formats)

**Strategies:**
1. [Auto Strategy](./phase1-token-budget.md#1-auto-strategy-default)
2. [Shrink Docs Strategy](./phase1-token-budget.md#2-shrink-docs-strategy)
3. [Balanced Strategy](./phase1-token-budget.md#3-balanced-strategy)
4. [Methods Only Strategy](./phase1-token-budget.md#4-methods-only-strategy)
5. [Top-N Strategy](./phase1-token-budget.md#5-top-n-strategy)

**Scenarios:**
1. [Fitting Large Repo into Claude](./phase1-token-budget.md#scenario-1-fitting-large-repo-into-claude-context)
2. [Code Review with Token Limit](./phase1-token-budget.md#scenario-2-code-review-with-token-limit)
3. [Quick Bug Fix Query](./phase1-token-budget.md#scenario-3-quick-bug-fix-query)
4. [Security Audit with Budget](./phase1-token-budget.md#scenario-4-security-audit-with-budget)
5. [Documentation Generation](./phase1-token-budget.md#scenario-5-documentation-generation)
6. [Incremental Budget Adjustment](./phase1-token-budget.md#scenario-6-incremental-budget-adjustment)

**Advanced:**
- [Understanding Fit Reports](./phase1-token-budget.md#understanding-fit-reports)
- [Importance Scoring](./phase1-token-budget.md#importance-scoring)
- [Troubleshooting](./phase1-token-budget.md#troubleshooting)

### 🔍 Rule Tracer

**Basic Operations:**
- [Enabling Rule Tracing](./phase1-rule-tracer.md#enabling-rule-tracing)
- [What Gets Traced](./phase1-rule-tracer.md#what-gets-traced)

**Understanding Reports:**
- [Complete Trace Report](./phase1-rule-tracer.md#complete-trace-report-example)
- [Report Sections Explained](./phase1-rule-tracer.md#report-sections-explained)

**Debugging Scenarios:**
1. [File Not Being Included](./phase1-rule-tracer.md#scenario-1-file-not-being-included)
2. [Too Many Files Included](./phase1-rule-tracer.md#scenario-2-too-many-files-included)
3. [Pattern Not Matching](./phase1-rule-tracer.md#scenario-3-pattern-not-matching)
4. [Conflicting Patterns](./phase1-rule-tracer.md#scenario-4-conflicting-patterns)
5. [Understanding Priority](./phase1-rule-tracer.md#scenario-5-understanding-priority)
6. [Method-Level Tracing](./phase1-rule-tracer.md#scenario-6-method-level-tracing)

**Advanced:**
- [Pattern Analysis](./phase1-rule-tracer.md#pattern-analysis)
- [Troubleshooting](./phase1-rule-tracer.md#troubleshooting)
- [Best Practices](./phase1-rule-tracer.md#best-practices)

---

## Common Workflows

### Workflow 1: Code Review Optimization

**Goal:** Review PR with optimal token usage and debugging.

```bash
# Step 1: Apply review preset with token budget
context-manager --preset review --target-tokens 80k

# Step 2: If issues, enable tracing
context-manager --preset review --target-tokens 80k --trace-rules

# Step 3: Save report for documentation
context-manager --preset review --target-tokens 80k --save-report

# Step 4: Copy to clipboard for AI review
context-manager --preset review --target-tokens 80k --context-clipboard
```

**Documentation:**
- [Preset: Code Review](./phase1-presets.md#scenario-1-code-review)
- [Token Budget: Code Review](./phase1-token-budget.md#scenario-2-code-review-with-token-limit)

### Workflow 2: Ultra-Compact LLM Context

**Goal:** Maximum compression for quick AI queries.

```bash
# Step 1: Start with llm-explain preset
context-manager --preset llm-explain

# Step 2: Add aggressive token reduction
context-manager --preset llm-explain --target-tokens 30k

# Step 3: Use methods-only for maximum compression
context-manager --preset llm-explain --target-tokens 30k --fit-strategy methods-only

# Step 4: Copy to clipboard
context-manager --preset llm-explain --target-tokens 30k --fit-strategy methods-only --context-clipboard
```

**Documentation:**
- [Preset: LLM Explain](./phase1-presets.md#scenario-2-llm-explanation)
- [Token Budget: Methods Only](./phase1-token-budget.md#4-methods-only-strategy)

### Workflow 3: Security Audit with Documentation

**Goal:** Comprehensive security review with detailed reporting.

```bash
# Step 1: Apply security preset
context-manager --preset security-audit

# Step 2: Add token budget
context-manager --preset security-audit --target-tokens 100k

# Step 3: Enable tracing to see what's included
context-manager --preset security-audit --target-tokens 100k --trace-rules

# Step 4: Save detailed report
context-manager --preset security-audit --target-tokens 100k --trace-rules --save-report
```

**Documentation:**
- [Preset: Security Audit](./phase1-presets.md#scenario-3-security-audit)
- [Token Budget: Security Audit](./phase1-token-budget.md#scenario-4-security-audit-with-budget)

### Workflow 4: Debugging Filter Configuration

**Goal:** Understand and fix filter issues.

```bash
# Step 1: Enable tracing to see current state
context-manager --trace-rules

# Step 2: Identify issues in trace report
# Look for:
# - Unexpected inclusions/exclusions
# - Unused patterns
# - Conflicting patterns

# Step 3: Make changes to filter files
nano .contextinclude
nano .contextignore

# Step 4: Verify changes
context-manager --trace-rules

# Step 5: Compare before/after
diff trace-before.txt trace-after.txt
```

**Documentation:**
- [Rule Tracer: Debugging Scenarios](./phase1-rule-tracer.md#debugging-scenarios)
- [Rule Tracer: Best Practices](./phase1-rule-tracer.md#best-practices)

### Workflow 5: Finding Optimal Token Budget

**Goal:** Determine the best token budget for your workflow.

```bash
# Step 1: Try different budgets
context-manager --target-tokens 150k --save-report
mv token-analysis-report.json report-150k.json

context-manager --target-tokens 100k --save-report
mv token-analysis-report.json report-100k.json

context-manager --target-tokens 75k --save-report
mv token-analysis-report.json report-75k.json

# Step 2: Compare reports
# Look at:
# - Files included/excluded
# - Fit quality (perfect/good/tight)
# - Coverage vs size tradeoff

# Step 3: Try different strategies at optimal budget
context-manager --target-tokens 100k --fit-strategy auto
context-manager --target-tokens 100k --fit-strategy balanced
context-manager --target-tokens 100k --fit-strategy methods-only
```

**Documentation:**
- [Token Budget: Incremental Adjustment](./phase1-token-budget.md#scenario-6-incremental-budget-adjustment)
- [Token Budget: Understanding Fit Reports](./phase1-token-budget.md#understanding-fit-reports)

---

## Quick Reference

### Command Patterns

```bash
# Preset only
context-manager --preset <name>

# Preset + token budget
context-manager --preset <name> --target-tokens <N>

# Preset + token budget + strategy
context-manager --preset <name> --target-tokens <N> --fit-strategy <strategy>

# Preset + tracing
context-manager --preset <name> --trace-rules

# Token budget + tracing
context-manager --target-tokens <N> --trace-rules

# Full workflow
context-manager --preset <name> --target-tokens <N> --fit-strategy <strategy> --trace-rules --save-report
```

### Available Presets

| Preset | Token Budget | Best For |
|--------|--------------|----------|
| `default` | 150k | General development |
| `review` | 100k | Code reviews |
| `llm-explain` | 50k | Quick AI queries |
| `pair-program` | 200k | Pair programming |
| `security-audit` | 80k | Security reviews |
| `documentation` | 100k | API docs |
| `minimal` | 10k | Quick debugging |
| `full` | 500k+ | Complete analysis |

### Fitting Strategies

| Strategy | Reduction | Best For |
|----------|-----------|----------|
| `auto` | Varies | General use |
| `shrink-docs` | 20-40% | Keeping code intact |
| `balanced` | 30-50% | Balanced coverage |
| `methods-only` | 60-80% | Maximum reduction |
| `top-n` | 40-70% | Focused analysis |

### LLM Context Windows

| Model | Context Window | Recommended Budget |
|-------|----------------|-------------------|
| GPT-4 Turbo | 128k | 100-120k |
| Claude Sonnet 4.5 | 200k | 180-190k |
| Claude Opus 4 | 200k | 180-190k |
| Gemini 1.5 Pro | 1M | 900k-950k |
| Gemini 2.0 Flash | 1M | 900k-950k |

---

## Getting Help

### Documentation

- [Main README](../README.md) - Complete feature documentation
- [Preset System README](../lib/presets/README.md) - Technical documentation
- [Token Budget Fitter README](../lib/optimizers/README.md) - Technical documentation
- [Rule Tracer README](../lib/debug/README.md) - Technical documentation

### Command Line Help

```bash
# General help
context-manager --help

# List presets
context-manager --list-presets

# Preset details
context-manager --preset-info <name>

# List LLM models
context-manager --list-llms

# List output formats
context-manager --list-formats
```

### Troubleshooting

- [Preset Troubleshooting](./phase1-presets.md#troubleshooting)
- [Token Budget Troubleshooting](./phase1-token-budget.md#troubleshooting)
- [Rule Tracer Troubleshooting](./phase1-rule-tracer.md#troubleshooting)

---

## Contributing Examples

Have a useful workflow or example? Contributions are welcome!

1. Fork the repository
2. Add your example to the appropriate file
3. Update this index
4. Submit a pull request

---

**Version:** 3.1.0  
**Last Updated:** 2025-11-19
