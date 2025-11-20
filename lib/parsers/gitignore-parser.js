/**
 * GitIgnore Parser
 * Parses .gitignore, .contextignore, and .contextinclude files
 */

import fs from 'fs';

class GitIgnoreParser {
    constructor(gitignorePath, contextIgnorePath, contextIncludePath, tracer = null) {
        this.patterns = [];
        this.contextPatterns = [];
        this.hasIncludeFile = false;
        this._lastIgnoreReason = null;
        this.tracer = tracer;

        this.loadPatterns(gitignorePath, contextIgnorePath, contextIncludePath);
    }

    /**
     * Normalize path separators to forward slashes (gitignore standard)
     * @param {string} filePath - Path to normalize
     * @returns {string} Normalized path with forward slashes
     */
    static normalizePath(filePath) {
        // Convert Windows backslashes to forward slashes
        // Gitignore patterns always use forward slashes, even on Windows
        return filePath.replace(/\\/g, '/');
    }

    loadPatterns(gitignorePath, contextIgnorePath, contextIncludePath) {
        // Load .gitignore
        if (fs.existsSync(gitignorePath)) {
            this.patterns = this.parsePatternFile(gitignorePath);
        }

        // Load context patterns (include takes priority)
        if (contextIncludePath && fs.existsSync(contextIncludePath)) {
            this.contextPatterns = this.parsePatternFile(contextIncludePath);
            this.hasIncludeFile = true;
            console.log(`📅 Context include rules loaded: ${this.contextPatterns.length} patterns`);
        } else if (contextIgnorePath && fs.existsSync(contextIgnorePath)) {
            this.contextPatterns = this.parsePatternFile(contextIgnorePath);
            console.log(`📋 Context ignore rules loaded: ${this.contextPatterns.length} patterns`);
        }
    }

    parsePatternFile(filePath) {
        try {
            // Check if path is actually a file (not a directory)
            const stats = fs.statSync(filePath);
            if (stats.isDirectory()) {
                console.warn(`Warning: ${filePath} is a directory, expected a file`);
                return [];
            }

            return fs.readFileSync(filePath, 'utf8')
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'))
                .map(pattern => this.convertToRegex(pattern));
        } catch (error) {
            // File doesn't exist or can't be read
            return [];
        }
    }

    convertToRegex(pattern) {
        const isDirectory = pattern.endsWith('/');
        const isNegation = pattern.startsWith('!');
        const original = pattern;

        // Git behavior for path anchoring:
        // - Pattern with slash IN THE MIDDLE (not just trailing) → relative to repo root
        // - Pattern without slash (or only trailing slash) → matches at any directory level
        // - Pattern starting with / → explicitly anchored to root
        // Examples:
        //   "node_modules/" → any level (only trailing slash)
        //   "src/temp/" → root-relative (has internal slash)
        //   "/build" → root-relative (leading slash)
        const cleanedPattern = original.replace(/^!/, '').replace(/\/$/, '');
        const hasSlash = cleanedPattern.includes('/');

        pattern = pattern.replace(/^[!/]/, '').replace(/\/$/, '');

        // Use placeholders to prevent ** replacement from being affected by * replacement
        // Handle **/ (zero or more directories) specially
        let regexPattern = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*\*\//g, '\x00GLOBSTAR\x00')   // Placeholder for **/ (zero+ dirs)
            .replace(/\*\*/g, '\x00DOUBLESTAR\x00')   // Placeholder for ** (any depth)
            .replace(/\*/g, '[^/]*')                    // Replace single * first
            .replace(/\?/g, '[^/]')                     // Replace ? with single char match
            .replace(/\x00GLOBSTAR\x00/g, '(?:.*/)?')  // **/ matches zero or more dirs
            .replace(/\x00DOUBLESTAR\x00/g, '.*');     // ** matches anything

        regexPattern = hasSlash
            ? `^${regexPattern}`           // Root-relative (matches only at repo root)
            : `(^|/)${regexPattern}`;      // Matches at any directory level

        // Git behavior: A pattern can match both files and directories
        // If it matches a directory, all contents are ignored
        // Always add optional directory suffix to support both cases
        regexPattern += '(/.*)?$';

        return { regex: new RegExp(regexPattern), isNegation, original, isDirectory };
    }

    isIgnored(filePath, relativePath) {
        // Normalize path separators to forward slashes (gitignore standard)
        const normalizedPath = GitIgnoreParser.normalizePath(relativePath);

        let ignored = false;
        let matchedRule = null;
        let ruleSource = null;
        let mode = null;
        let priority = 0;

        // Priority levels:
        // 1. .gitignore (highest priority - always respected)
        // 2. .contextinclude (include mode)
        // 3. .contextignore (exclude mode)

        // Check .gitignore first (priority 1)
        const gitignoreResult = this.testPatternsWithMatch(this.patterns, normalizedPath);
        if (gitignoreResult.matched) {
            ignored = true;
            matchedRule = gitignoreResult.pattern;
            ruleSource = '.gitignore';
            mode = 'EXCLUDE';
            priority = 1;

            // Record gitignore exclusion with tracer
            if (this.tracer && this.tracer.isEnabled()) {
                this.tracer.recordFileDecision(relativePath, {
                    included: false,
                    reason: 'Matched .gitignore pattern',
                    rule: matchedRule,
                    ruleSource: ruleSource,
                    mode: mode,
                    priority: priority
                });
            }

            return true; // Keep gitignore exclusions
        }

        // Check context patterns (priority 2 or 3)
        if (this.hasIncludeFile) {
            // Include mode - only include files that match patterns
            mode = 'INCLUDE';
            ruleSource = '.contextinclude';
            priority = 2;

            // Check if filePath is provided before stat check
            if (filePath) {
                try {
                    const stat = fs.statSync(filePath);
                    if (stat.isDirectory()) {
                        // For directories, check if we should traverse
                        const shouldTraverse = this.contextPatterns.some(p =>
                            p.original.startsWith(normalizedPath) ||
                            p.original.includes('**') ||
                            normalizedPath === ''
                        );
                        ignored = !shouldTraverse;

                        if (!shouldTraverse) {
                            matchedRule = 'No matching include pattern for directory traversal';
                        }
                    } else {
                        // For files, check if included
                        const includeResult = this.testPatternsWithNegationAndMatch(this.contextPatterns, normalizedPath);
                        ignored = !includeResult.included;
                        matchedRule = includeResult.pattern;
                    }
                } catch (error) {
                    // If stat fails, treat as file and check patterns
                    const includeResult = this.testPatternsWithNegationAndMatch(this.contextPatterns, normalizedPath);
                    ignored = !includeResult.included;
                    matchedRule = includeResult.pattern;
                }
            } else {
                // No filePath provided, just check patterns
                const includeResult = this.testPatternsWithNegationAndMatch(this.contextPatterns, normalizedPath);
                ignored = !includeResult.included;
                matchedRule = includeResult.pattern;
            }

            if (ignored) {
                this._lastIgnoreReason = 'context-include';
            }
        } else if (this.contextPatterns.length > 0) {
            // Exclude mode - exclude files that match patterns
            mode = 'EXCLUDE';
            ruleSource = '.contextignore';
            priority = 3;

            const excludeResult = this.testPatternsWithMatch(this.contextPatterns, normalizedPath);
            ignored = excludeResult.matched;
            matchedRule = excludeResult.pattern;

            if (ignored) {
                this._lastIgnoreReason = 'context';
            }
        }

        // Record decision with tracer
        if (this.tracer && this.tracer.isEnabled()) {
            const reason = this.buildDecisionReason(ignored, mode, matchedRule);

            this.tracer.recordFileDecision(relativePath, {
                included: !ignored,
                reason: reason,
                rule: matchedRule,
                ruleSource: ruleSource,
                mode: mode || 'EXCLUDE',
                priority: priority
            });
        }

        return ignored;
    }

    /**
     * Build a human-readable reason for the decision
     * @param {boolean} ignored - Whether the file was ignored
     * @param {string} mode - The mode (INCLUDE or EXCLUDE)
     * @param {string} matchedRule - The matched rule pattern
     * @returns {string} Human-readable reason
     */
    buildDecisionReason(ignored, mode, matchedRule) {
        if (mode === 'INCLUDE') {
            if (ignored) {
                return matchedRule 
                    ? `Not matched by .contextinclude pattern` 
                    : 'No .contextinclude pattern matched';
            } else {
                return matchedRule 
                    ? `Matched .contextinclude pattern: ${matchedRule}` 
                    : 'Included by .contextinclude';
            }
        } else {
            if (ignored) {
                return matchedRule 
                    ? `Matched exclusion pattern: ${matchedRule}` 
                    : 'Matched exclusion pattern';
            } else {
                return 'No exclusion pattern matched';
            }
        }
    }

    /**
     * Test patterns and return match information
     * @param {Array} patterns - Patterns to test
     * @param {string} relativePath - Path to test
     * @returns {Object} Match result with pattern
     */
    testPatternsWithMatch(patterns, relativePath) {
        for (const pattern of patterns) {
            if (pattern.regex.test(relativePath)) {
                if (!pattern.isNegation) {
                    return { matched: true, pattern: pattern.original };
                }
            }
        }
        return { matched: false, pattern: null };
    }

    /**
     * Test patterns with negation support and return match information
     * @param {Array} patterns - Patterns to test
     * @param {string} relativePath - Path to test
     * @returns {Object} Include result with pattern
     */
    testPatternsWithNegationAndMatch(patterns, relativePath) {
        let included = false;
        let matchedPattern = null;

        for (const pattern of patterns) {
            if (pattern.regex.test(relativePath)) {
                included = !pattern.isNegation;
                matchedPattern = pattern.original;
                
                // Negation patterns take precedence
                if (pattern.isNegation) {
                    break;
                }
            }
        }

        return { included, pattern: matchedPattern };
    }

    testPatterns(patterns, relativePath, reason) {
        let ignored = false;
        for (const pattern of patterns) {
            if (pattern.regex.test(relativePath)) {
                ignored = !pattern.isNegation;
                if (ignored) this._lastIgnoreReason = reason;
            }
        }
        return ignored;
    }

    testPatternsWithNegation(patterns, relativePath) {
        let included = false;
        for (const pattern of patterns) {
            if (pattern.regex.test(relativePath)) {
                included = pattern.isNegation ? false : true;
                if (pattern.isNegation) break;
            }
        }
        return included;
    }
}

export default GitIgnoreParser;
