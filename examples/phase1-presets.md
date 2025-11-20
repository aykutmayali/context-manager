# Phase 1 Preset System - Examples

This document provides comprehensive examples for using the Preset System in Context Manager v3.1.0.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Preset Scenarios](#preset-scenarios)
- [Custom Presets](#custom-presets)
- [Troubleshooting](#troubleshooting)

---

## Basic Usage

### Listing Available Presets

```bash
# List all presets with descriptions
context-manager --list-presets
```

**Output:**
```
📋 Available Presets (v3.1.0):

═══════════════════════════════════════════════════════════════════════════════
⚙️  Default (default)
   Standard analysis with balanced settings for general development

👀  Code Review (review)
   Optimized for code reviews and pull requests - filters tests and docs

💡  LLM Explain (llm-explain)
   Ultra-compact context for quick LLM explanations and queries

👥  Pair Programming (pair-program)
   Interactive development with full details and comprehensive coverage

🔒  Security Audit (security-audit)
   Security-focused analysis - auth, crypto, API endpoints, validation

📚  Documentation (documentation)
   Public APIs and documentation generation - exports, types, interfaces

🎯  Minimal (minimal)
   Entry points only for quick debugging and focused analysis

📦  Full (full)
   Complete codebase analysis including tests, docs, and all files

═══════════════════════════════════════════════════════════════════════════════
```

### Viewing Preset Details

```bash
# Get detailed information about a specific preset
context-manager --preset-info review
```

**Output:**
```
👀  Code Review (review)
═══════════════════════════════════════════════════════════════════════════════

Optimized for code reviews and pull requests - filters tests and docs

📋 Filters:
  Include patterns:
    - src/**/*.js
    - src/**/*.ts
    - lib/**/*.js
    - lib/**/*.ts
    - app/**/*.js
    ... and 5 more
  Exclude patterns:
    - **/*.test.js
    - **/*.spec.js
    - **/*.test.ts
    - **/*.spec.ts
    - **/test/**
    ... and 8 more

⚙️  Options:
  methodLevel: true
  gitingest: true
  targetTokens: 100000
  fitStrategy: balanced

✨ Best for:
  • Pull request reviews
  • Code architecture understanding
  • Identifying potential issues
  • Understanding code changes

═══════════════════════════════════════════════════════════════════════════════

Usage: context-manager --preset review
```

### Applying a Preset

```bash
# Apply the review preset
context-manager --preset review
```

**What happens:**
1. Preset configuration is loaded
2. Temporary filter files are created:
   - `.contextinclude-review`
   - `.contextignore-review`
   - `.methodinclude-review`
   - `.methodignore-review`
3. Analysis runs with preset settings
4. Temporary files are cleaned up after completion

---

## Preset Scenarios

### Scenario 1: Code Review

**Goal:** Review a pull request focusing on core logic, excluding tests and documentation.

```bash
# Basic code review
context-manager --preset review

# Code review with tracing to see what's included
context-manager --preset review --trace-rules

# Code review with custom token budget
context-manager --preset review --target-tokens 80k

# Code review with report and clipboard export
context-manager --preset review --save-report --context-clipboard
```

**What's included:**
- Source files in `src/`, `lib/`, `app/`
- JavaScript and TypeScript files
- Configuration files
- Core business logic

**What's excluded:**
- Test files (`*.test.js`, `*.spec.ts`)
- Documentation (`*.md`, `docs/`)
- Build artifacts
- Node modules
- Example code

### Scenario 2: LLM Explanation

**Goal:** Generate ultra-compact context for quick AI queries.

```bash
# Ultra-compact LLM context
context-manager --preset llm-explain

# With aggressive token reduction
context-manager --preset llm-explain --target-tokens 30k --fit-strategy methods-only

# Copy directly to clipboard for pasting into ChatGPT/Claude
context-manager --preset llm-explain --context-clipboard

# With GitIngest format for single-file digest
context-manager --preset llm-explain --gitingest
```

**What's included:**
- Core source files only
- Entry points (index.js, main.py, app.js)
- Main business logic
- Key utility functions

**What's excluded:**
- Tests
- Documentation
- Examples
- Build files
- Configuration files

### Scenario 3: Security Audit

**Goal:** Focus on security-critical code for vulnerability assessment.

```bash
# Security-focused analysis
context-manager --preset security-audit

# Security audit with detailed tracing
context-manager --preset security-audit --trace-rules

# Security audit with report for documentation
context-manager --preset security-audit --save-report

# Security audit with custom token budget
context-manager --preset security-audit --target-tokens 100k
```

**What's included:**
- Authentication modules (`**/auth/**`, `**/login/**`)
- Security utilities (`**/security/**`, `**/crypto/**`)
- API endpoints and routes
- Validation logic
- Token handling
- Database queries

**What's excluded:**
- UI components
- Styling files
- Documentation
- Test files
- Example code

### Scenario 4: Documentation Generation

**Goal:** Generate API documentation focusing on public interfaces.

```bash
# Documentation-focused analysis
context-manager --preset documentation

# With method-level analysis for detailed API docs
context-manager --preset documentation --method-level

# Generate markdown output for docs
context-manager --preset documentation --output markdown

# Save report for processing
context-manager --preset documentation --save-report
```

**What's included:**
- Public API files
- Type definitions
- Interface declarations
- Exported functions
- JSDoc comments
- README files

**What's excluded:**
- Internal implementation details
- Private methods
- Test files
- Build scripts

### Scenario 5: Minimal Debugging

**Goal:** Quick debugging with minimal token usage.

```bash
# Minimal analysis for quick debugging
context-manager --preset minimal

# Minimal with specific token budget
context-manager --preset minimal --target-tokens 5k

# Minimal with tracing to see what's included
context-manager --preset minimal --trace-rules

# Minimal with clipboard export for quick AI query
context-manager --preset minimal --context-clipboard
```

**What's included:**
- Entry points only (index.js, main.py, app.js, server.js)
- Core configuration files
- Main application file

**What's excluded:**
- Everything else

### Scenario 6: Pair Programming

**Goal:** Comprehensive context for interactive development sessions.

```bash
# Full context for pair programming
context-manager --preset pair-program

# With live dashboard
context-manager --preset pair-program --dashboard

# With detailed reporting
context-manager --preset pair-program --save-report --verbose

# With custom token budget
context-manager --preset pair-program --target-tokens 200k
```

**What's included:**
- All source files
- Tests (for understanding behavior)
- Documentation
- Configuration files
- Examples

**What's excluded:**
- Node modules
- Build artifacts
- Git files

### Scenario 7: Full Analysis

**Goal:** Complete codebase analysis including everything.

```bash
# Complete analysis
context-manager --preset full

# Full analysis with method-level details
context-manager --preset full --method-level

# Full analysis with chunking for large repos
context-manager --preset full --chunk

# Full analysis with all exports
context-manager --preset full --save-report --context-export --gitingest
```

**What's included:**
- Everything in the repository
- All source files
- All tests
- All documentation
- All configuration
- All examples

**What's excluded:**
- Only node_modules and build artifacts

---

## Custom Presets

### Creating a Custom Preset

Edit `lib/presets/presets.json` to add your custom preset:

```json
{
  "id": "react-components",
  "name": "React Components",
  "description": "Focus on React components and hooks",
  "icon": "⚛️",
  "filters": {
    "include": [
      "src/components/**/*.jsx",
      "src/components/**/*.tsx",
      "src/hooks/**/*.js",
      "src/hooks/**/*.ts"
    ],
    "exclude": [
      "**/*.test.jsx",
      "**/*.test.tsx",
      "**/*.stories.jsx",
      "**/*.stories.tsx"
    ],
    "methodInclude": [
      "use*",
      "handle*",
      "render*"
    ],
    "methodExclude": [
      "test*",
      "mock*"
    ]
  },
  "options": {
    "methodLevel": true,
    "gitingest": false,
    "targetTokens": 75000,
    "fitStrategy": "balanced"
  },
  "metadata": {
    "bestFor": [
      "React component analysis",
      "Hook debugging",
      "Component architecture review"
    ]
  }
}
```

### Using Your Custom Preset

```bash
# List presets to verify it's available
context-manager --list-presets

# View details
context-manager --preset-info react-components

# Use it
context-manager --preset react-components
```

### Example Custom Presets

#### API Endpoints Only

```json
{
  "id": "api-only",
  "name": "API Endpoints",
  "description": "Focus on API routes and handlers",
  "icon": "🌐",
  "filters": {
    "include": [
      "src/api/**/*.js",
      "src/routes/**/*.js",
      "src/controllers/**/*.js",
      "src/handlers/**/*.js"
    ],
    "exclude": [
      "**/*.test.js"
    ]
  },
  "options": {
    "methodLevel": true,
    "targetTokens": 50000,
    "fitStrategy": "balanced"
  }
}
```

#### Database Layer

```json
{
  "id": "database",
  "name": "Database Layer",
  "description": "Focus on database models and queries",
  "icon": "🗄️",
  "filters": {
    "include": [
      "src/models/**/*.js",
      "src/db/**/*.js",
      "src/repositories/**/*.js",
      "src/migrations/**/*.js"
    ],
    "exclude": [
      "**/*.test.js",
      "**/seeds/**"
    ]
  },
  "options": {
    "methodLevel": true,
    "targetTokens": 60000,
    "fitStrategy": "balanced"
  }
}
```

---

## Troubleshooting

### Preset Not Found

**Problem:**
```
❌ Preset "my-preset" not found
```

**Solution:**
1. Check preset ID matches exactly (case-sensitive)
2. List available presets: `context-manager --list-presets`
3. Verify preset exists in `lib/presets/presets.json`

### Preset Not Including Expected Files

**Problem:** Preset is not including files you expect.

**Solution:**
```bash
# Use tracing to see what's happening
context-manager --preset review --trace-rules

# Check the preset configuration
context-manager --preset-info review

# Verify your files match the include patterns
```

### Preset Token Budget Too Small

**Problem:** Preset's token budget is too restrictive.

**Solution:**
```bash
# Override the preset's token budget
context-manager --preset review --target-tokens 150k

# Or use a different fitting strategy
context-manager --preset review --fit-strategy balanced
```

### Temporary Files Not Cleaned Up

**Problem:** Temporary preset files remain after analysis.

**Solution:**
```bash
# Manually remove temporary files
rm .contextinclude-*
rm .contextignore-*
rm .methodinclude-*
rm .methodignore-*

# Or remove all context files
rm .context* .method*
```

### Preset Conflicts with Existing Filters

**Problem:** Preset conflicts with your existing filter files.

**Solution:**
Presets create temporary files with preset name suffix and don't modify your existing filters. After analysis, temporary files are removed and your original filters remain unchanged.

```bash
# Your files remain untouched:
.contextinclude    # Your original file
.contextignore     # Your original file

# Preset creates temporary files:
.contextinclude-review    # Temporary (cleaned up after)
.contextignore-review     # Temporary (cleaned up after)
```

---

## Best Practices

### 1. Start with a Similar Preset

Don't create presets from scratch. Start with the closest match:

```bash
# For code review workflows, start with 'review'
# For security work, start with 'security-audit'
# For quick queries, start with 'llm-explain'
```

### 2. Use Tracing to Understand Presets

Always use `--trace-rules` when learning a new preset:

```bash
context-manager --preset review --trace-rules
```

### 3. Combine Presets with Token Budgets

Presets have default token budgets, but you can override:

```bash
# Preset default: 100k tokens
context-manager --preset review

# Custom budget: 80k tokens
context-manager --preset review --target-tokens 80k
```

### 4. Save Preset Outputs for Comparison

Compare different presets to find the best fit:

```bash
# Try different presets
context-manager --preset review --save-report
mv token-analysis-report.json review-report.json

context-manager --preset llm-explain --save-report
mv token-analysis-report.json llm-explain-report.json

# Compare the reports
```

### 5. Document Your Custom Presets

Add clear descriptions and best-for use cases to custom presets:

```json
{
  "description": "Clear, concise description of what this preset does",
  "metadata": {
    "bestFor": [
      "Specific use case 1",
      "Specific use case 2"
    ]
  }
}
```

---

## Related Documentation

- [Main README](../README.md) - Complete feature documentation
- [Preset System README](../lib/presets/README.md) - Technical documentation
- [Token Budget Examples](./phase1-token-budget.md) - Token fitting examples
- [Rule Tracer Examples](./phase1-rule-tracer.md) - Debugging examples

---

**Version:** 3.1.0  
**Last Updated:** 2025-11-19
