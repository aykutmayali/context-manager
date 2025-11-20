# Phase 1 Rule Tracer - Examples

This document provides comprehensive examples for using the Rule Tracer in Context Manager v3.1.0.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Understanding Trace Reports](#understanding-trace-reports)
- [Debugging Scenarios](#debugging-scenarios)
- [Pattern Analysis](#pattern-analysis)
- [Troubleshooting](#troubleshooting)

---

## Basic Usage

### Enabling Rule Tracing

```bash
# Basic rule tracing
context-manager --trace-rules

# With preset
context-manager --preset review --trace-rules

# With token budget
context-manager --target-tokens 100k --trace-rules

# With all options
context-manager --preset review --target-tokens 80k --trace-rules --save-report
```

### What Gets Traced

The Rule Tracer records:
- **File decisions**: Why each file was included or excluded
- **Method decisions**: Why each method was included or excluded (with `--method-level`)
- **Pattern matches**: Which patterns matched which files
- **Rule sources**: Where each rule came from (.gitignore, .contextignore, etc.)
- **Unused patterns**: Patterns that never matched anything

---

## Understanding Trace Reports

### Complete Trace Report Example

```bash
$ context-manager --trace-rules
```

**Output:**

```
📊 Rule Trace Report
═══════════════════════════════════════════════════════════════════════════════

📁 File Decisions:
═══════════════════════════════════════════════════════════════════════════════

✅ src/server.js
   Reason: Matched include pattern
   Rule: src/**/*.js
   Source: .contextinclude
   Priority: 10
   Mode: INCLUDE

✅ src/utils/helper.js
   Reason: Matched include pattern
   Rule: src/**/*.js
   Source: .contextinclude
   Priority: 10
   Mode: INCLUDE

✅ lib/core/analyzer.js
   Reason: Matched include pattern
   Rule: lib/**/*.js
   Source: .contextinclude
   Priority: 10
   Mode: INCLUDE

❌ test/server.test.js
   Reason: Matched exclude pattern
   Rule: **/*.test.js
   Source: .contextignore
   Priority: 20
   Mode: EXCLUDE

❌ node_modules/express/index.js
   Reason: Matched exclude pattern
   Rule: node_modules/**
   Source: .gitignore
   Priority: 30
   Mode: EXCLUDE

❌ docs/README.md
   Reason: Matched exclude pattern
   Rule: **/*.md
   Source: .contextignore
   Priority: 20
   Mode: EXCLUDE

═══════════════════════════════════════════════════════════════════════════════

📊 Pattern Analysis:
═══════════════════════════════════════════════════════════════════════════════

Pattern: src/**/*.js
  Source: .contextinclude
  Matches: 45 files
  Examples:
    - src/server.js
    - src/utils/helper.js
    - src/api/routes.js
    - src/handlers/auth.js
    - src/models/user.js

Pattern: lib/**/*.js
  Source: .contextinclude
  Matches: 28 files
  Examples:
    - lib/core/analyzer.js
    - lib/utils/token-utils.js
    - lib/formatters/toon-formatter.js

Pattern: **/*.test.js
  Source: .contextignore
  Matches: 23 files
  Examples:
    - test/server.test.js
    - src/utils/helper.test.js
    - lib/core/analyzer.test.js

Pattern: node_modules/**
  Source: .gitignore
  Matches: 12,456 files
  Examples:
    - node_modules/express/index.js
    - node_modules/react/index.js
    - node_modules/lodash/lodash.js

Pattern: **/*.md
  Source: .contextignore
  Matches: 15 files
  Examples:
    - docs/README.md
    - CHANGELOG.md
    - CONTRIBUTING.md

⚠️  Unused Patterns (2):
  - legacy/** (never matched)
  - old/** (never matched)

═══════════════════════════════════════════════════════════════════════════════

📈 Summary:
═══════════════════════════════════════════════════════════════════════════════

Files Processed: 12,567
  ✅ Included: 73 (0.6%)
  ❌ Excluded: 12,494 (99.4%)

Patterns Used: 8
  Active: 6
  Unused: 2

Decision Sources:
  .gitignore: 12,456 files (99.1%)
  .contextignore: 38 files (0.3%)
  .contextinclude: 73 files (0.6%)

Mode: INCLUDE (using .contextinclude)
```

### Report Sections Explained

#### 1. File Decisions

Shows each file and why it was included or excluded:

- **✅ Included**: File matched an include pattern
- **❌ Excluded**: File matched an exclude pattern
- **Reason**: Human-readable explanation
- **Rule**: The specific pattern that matched
- **Source**: Which file the rule came from
- **Priority**: Rule priority (higher = more important)
- **Mode**: Current filtering mode (INCLUDE or EXCLUDE)

#### 2. Pattern Analysis

Shows how each pattern performed:

- **Pattern**: The glob pattern
- **Source**: Where it's defined
- **Matches**: Number of files matched
- **Examples**: Sample files that matched (up to 5)

#### 3. Unused Patterns

Patterns that never matched any files:

```
⚠️  Unused Patterns (2):
  - legacy/** (never matched)
  - old/** (never matched)
```

**Why this matters:**
- Unused patterns may be typos
- May indicate deleted directories
- Can be removed to clean up config

#### 4. Summary Statistics

Overall statistics:

- **Files Processed**: Total files scanned
- **Included/Excluded**: Breakdown with percentages
- **Patterns Used**: Active vs unused patterns
- **Decision Sources**: Which files made decisions
- **Mode**: Current filtering mode

---

## Debugging Scenarios

### Scenario 1: File Not Being Included

**Problem:** Expected file `src/api/auth.js` is not in the output.

**Debug Process:**

```bash
# Step 1: Enable tracing
context-manager --trace-rules
```

**Look for the file in trace output:**

```
❌ src/api/auth.js
   Reason: Matched exclude pattern
   Rule: **/auth/**
   Source: .contextignore
   Priority: 20
   Mode: EXCLUDE
```

**Solution:** The file is being excluded by `**/auth/**` pattern. Options:

1. **Remove the pattern:**
```bash
# Edit .contextignore
# Remove or comment out: **/auth/**
```

2. **Add specific include:**
```bash
# Add to .contextinclude
src/api/auth.js
```

3. **Use negation:**
```bash
# In .contextinclude
src/api/**/*.js
!src/api/auth-old.js  # Exclude only old version
```

### Scenario 2: Too Many Files Included

**Problem:** Getting 500 files when you only want 50.

**Debug Process:**

```bash
# Step 1: Enable tracing
context-manager --trace-rules
```

**Look at pattern analysis:**

```
Pattern: src/**/*.js
  Source: .contextinclude
  Matches: 450 files
```

**Solution:** Pattern is too broad. Make it more specific:

```bash
# Instead of:
src/**/*.js

# Use:
src/core/**/*.js
src/api/**/*.js
src/utils/**/*.js
```

### Scenario 3: Pattern Not Matching

**Problem:** Pattern `src/components/**/*.jsx` not matching any files.

**Debug Process:**

```bash
# Step 1: Enable tracing
context-manager --trace-rules
```

**Look for unused patterns:**

```
⚠️  Unused Patterns (1):
  - src/components/**/*.jsx (never matched)
```

**Common causes:**

1. **Wrong file extension:**
```bash
# Check actual file extensions
ls src/components/

# If files are .js not .jsx:
src/components/**/*.js  # Use this instead
```

2. **Wrong path:**
```bash
# Check actual directory structure
ls -la

# If it's actually:
components/**/*.jsx  # Not src/components
```

3. **Case sensitivity:**
```bash
# Pattern is case-sensitive
src/Components/**/*.jsx  # Won't match src/components
```

### Scenario 4: Conflicting Patterns

**Problem:** File matches both include and exclude patterns.

**Debug Process:**

```bash
context-manager --trace-rules
```

**Look for the file:**

```
❌ src/utils/test-helper.js
   Reason: Matched exclude pattern (higher priority)
   Rule: **/*test*.js
   Source: .contextignore
   Priority: 20
   Mode: EXCLUDE
   
   Note: Also matched include pattern:
   Rule: src/utils/**/*.js
   Source: .contextinclude
   Priority: 10
```

**Solution:** Exclude patterns have higher priority. Options:

1. **Make include pattern more specific:**
```bash
# In .contextinclude
src/utils/**/*.js
!src/utils/*test*.js  # Explicitly exclude test helpers
```

2. **Remove exclude pattern:**
```bash
# In .contextignore
# Remove: **/*test*.js
# Add more specific: **/*.test.js
```

3. **Use negation in include:**
```bash
# In .contextinclude
src/utils/**/*.js
!src/utils/test-*.js
```

### Scenario 5: Understanding Priority

**Problem:** Not sure which pattern takes precedence.

**Priority Order (highest to lowest):**

1. **Priority 30**: .gitignore patterns (always respected)
2. **Priority 20**: .contextignore patterns
3. **Priority 10**: .contextinclude patterns

**Example:**

```
File: src/test/helper.js

Matches:
1. src/**/*.js (.contextinclude, priority 10) → INCLUDE
2. **/test/** (.contextignore, priority 20) → EXCLUDE
3. node_modules/** (.gitignore, priority 30) → N/A

Result: EXCLUDED (priority 20 wins over priority 10)
```

**Debug with tracing:**

```bash
context-manager --trace-rules
```

**Output shows priority:**

```
❌ src/test/helper.js
   Reason: Matched exclude pattern (higher priority)
   Rule: **/test/**
   Source: .contextignore
   Priority: 20
```

### Scenario 6: Method-Level Tracing

**Problem:** Methods not being included as expected.

**Debug Process:**

```bash
# Enable method-level tracing
context-manager --method-level --trace-rules
```

**Output includes method decisions:**

```
🔧 Method Decisions:
═══════════════════════════════════════════════════════════════════════════════

File: src/server.js

  ✅ handleRequest (line 45)
     Reason: Matched include pattern
     Rule: handle*
     Source: .methodinclude
     Priority: 10

  ✅ processData (line 78)
     Reason: Matched include pattern
     Rule: process*
     Source: .methodinclude
     Priority: 10

  ❌ debugLog (line 120)
     Reason: Matched exclude pattern
     Rule: debug*
     Source: .methodignore
     Priority: 20

  ❌ _privateHelper (line 145)
     Reason: Matched exclude pattern
     Rule: _*
     Source: .methodignore
     Priority: 20
```

---

## Pattern Analysis

### Understanding Pattern Matches

#### High Match Count

```
Pattern: src/**/*.js
  Matches: 450 files
```

**Interpretation:** Very broad pattern, matches many files.

**Actions:**
- If intentional: Good
- If too many: Make more specific
- Consider: Breaking into multiple patterns

#### Low Match Count

```
Pattern: src/legacy/**/*.js
  Matches: 2 files
```

**Interpretation:** Very specific pattern, few matches.

**Actions:**
- If intentional: Good
- If unexpected: Check if directory exists
- Consider: Combining with similar patterns

#### Zero Matches (Unused)

```
⚠️  Unused Patterns (1):
  - src/old/**/*.js (never matched)
```

**Interpretation:** Pattern never matched anything.

**Actions:**
- Check for typos
- Verify directory exists
- Remove if no longer needed

### Pattern Examples

The tracer shows up to 5 example matches per pattern:

```
Pattern: src/**/*.js
  Examples:
    - src/server.js
    - src/utils/helper.js
    - src/api/routes.js
    - src/handlers/auth.js
    - src/models/user.js
```

**Use examples to:**
- Verify pattern is matching correctly
- Understand what the pattern captures
- Identify unexpected matches

---

## Troubleshooting

### Problem: Trace Report Too Long

**Symptom:** Trace report is thousands of lines.

**Solutions:**

1. **Focus on specific files:**
```bash
# Use grep to filter
context-manager --trace-rules | grep "src/api"
```

2. **Save to file:**
```bash
# Save trace to file for analysis
context-manager --trace-rules > trace-report.txt
```

3. **Use with token budget:**
```bash
# Reduce file count first
context-manager --target-tokens 50k --trace-rules
```

### Problem: Can't Find Specific File in Trace

**Solution:**

```bash
# Save trace and search
context-manager --trace-rules > trace.txt
grep "myfile.js" trace.txt
```

### Problem: Trace Shows Wrong Source

**Symptom:** Trace says pattern is from .contextignore but you don't have that file.

**Explanation:** Context Manager checks multiple locations:

1. `.contextignore` (project root)
2. `.context-manager/.contextignore`
3. Preset temporary files (`.contextignore-<preset>`)

**Solution:**

```bash
# Check all locations
ls -la .contextignore
ls -la .context-manager/.contextignore
ls -la .contextignore-*
```

### Problem: Unused Patterns Warning

**Symptom:** Trace shows unused patterns.

**Solutions:**

1. **Check for typos:**
```bash
# Wrong:
src/componets/**/*.js  # Typo: componets

# Right:
src/components/**/*.js
```

2. **Verify directory exists:**
```bash
ls -la src/legacy  # Does this exist?
```

3. **Remove if not needed:**
```bash
# Edit .contextinclude or .contextignore
# Remove unused patterns
```

### Problem: Mode Confusion

**Symptom:** Not sure if you're in INCLUDE or EXCLUDE mode.

**Check trace summary:**

```
Mode: INCLUDE (using .contextinclude)
```

**Rules:**
- If `.contextinclude` exists → INCLUDE mode
- If only `.contextignore` exists → EXCLUDE mode
- `.contextinclude` takes priority over `.contextignore`

---

## Best Practices

### 1. Always Use Tracing When Debugging

```bash
context-manager --trace-rules
```

### 2. Check Unused Patterns Regularly

Unused patterns may indicate:
- Typos in patterns
- Deleted directories
- Outdated configuration

```bash
# Look for unused patterns in trace output
context-manager --trace-rules | grep "Unused"
```

### 3. Save Traces for Comparison

```bash
# Before changes
context-manager --trace-rules > trace-before.txt

# Make changes to filters
nano .contextinclude

# After changes
context-manager --trace-rules > trace-after.txt

# Compare
diff trace-before.txt trace-after.txt
```

### 4. Use Tracing with Presets

Understand what presets are doing:

```bash
context-manager --preset review --trace-rules
context-manager --preset security-audit --trace-rules
```

### 5. Combine with Token Budget

See why files were excluded during fitting:

```bash
context-manager --target-tokens 100k --trace-rules
```

### 6. Method-Level Tracing

Debug method filtering:

```bash
context-manager --method-level --trace-rules
```

### 7. Document Your Patterns

Add comments to filter files:

```bash
# .contextinclude

# Core source files
src/**/*.js
lib/**/*.js

# Configuration
config/**/*.js

# Exclude tests (even from includes)
!**/*.test.js
!**/*.spec.js
```

---

## Advanced Usage

### Combining All Features

```bash
# Ultimate debugging workflow
context-manager \
  --preset review \
  --target-tokens 80k \
  --fit-strategy balanced \
  --trace-rules \
  --save-report \
  --verbose
```

**This shows:**
- Which preset patterns are active
- Why files were included/excluded
- How token budget fitting affected selection
- Complete file list
- Detailed report saved to JSON

### Programmatic Access

```javascript
// Enable tracing programmatically
const { RuleTracer } = require('context-manager');

const tracer = new RuleTracer();
tracer.enable();

// Record decisions
tracer.recordFileDecision('src/server.js', {
  included: true,
  reason: 'Matched include pattern',
  rule: 'src/**/*.js',
  ruleSource: '.contextinclude',
  priority: 10
});

// Generate report
const report = tracer.generateReport();
console.log(report);
```

---

## Related Documentation

- [Main README](../README.md) - Complete feature documentation
- [Rule Tracer README](../lib/debug/README.md) - Technical documentation
- [Preset Examples](./phase1-presets.md) - Preset system examples
- [Token Budget Examples](./phase1-token-budget.md) - Token fitting examples

---

**Version:** 3.1.0  
**Last Updated:** 2025-11-19
