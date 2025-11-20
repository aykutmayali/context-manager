/**
 * Method Filter Parser
 * Parses .methodinclude and .methodignore files for method-level filtering
 */

import fs from 'fs';

class MethodFilterParser {
    constructor(methodIncludePath, methodIgnorePath, tracer = null) {
        this.includePatterns = [];
        this.ignorePatterns = [];
        this.hasIncludeFile = false;
        this.tracer = tracer;

        if (methodIncludePath && fs.existsSync(methodIncludePath)) {
            this.includePatterns = this.parseMethodFile(methodIncludePath);
            this.hasIncludeFile = true;
            console.log(`🔧 Method include rules loaded: ${this.includePatterns.length} patterns`);
        }

        if (methodIgnorePath && fs.existsSync(methodIgnorePath)) {
            this.ignorePatterns = this.parseMethodFile(methodIgnorePath);
            console.log(`🚫 Method ignore rules loaded: ${this.ignorePatterns.length} patterns`);
        }

        // Register all patterns with tracer for unused pattern detection
        this.registerPatternsWithTracer();
    }

    registerPatternsWithTracer() {
        if (!this.tracer || !this.tracer.isEnabled()) {
            return;
        }

        // Register include patterns
        for (const pattern of this.includePatterns) {
            // Initialize pattern in tracer by recording a match with empty example
            // This ensures the pattern appears in analysis even if never matched
            if (this.tracer.patternMatches && !this.tracer.patternMatches.has(pattern.pattern)) {
                this.tracer.patternMatches.set(pattern.pattern, []);
                this.tracer.patternSources.set(pattern.pattern, '.methodinclude');
            }
        }

        // Register ignore patterns
        for (const pattern of this.ignorePatterns) {
            if (this.tracer.patternMatches && !this.tracer.patternMatches.has(pattern.pattern)) {
                this.tracer.patternMatches.set(pattern.pattern, []);
                this.tracer.patternSources.set(pattern.pattern, '.methodignore');
            }
        }
    }

    parseMethodFile(filePath) {
        return fs.readFileSync(filePath, 'utf8')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .map(pattern => ({
                pattern: pattern,
                regex: new RegExp(pattern.replace(/\*/g, '.*'), 'i')
            }));
    }

    shouldIncludeMethod(methodName, fileName) {
        let included = false;
        let matchedRule = null;
        let ruleSource = null;

        // Extract class/module name from fileName (remove extension)
        const className = fileName.replace(/\.[^/.]+$/, '');
        const fullMethodName = `${className}.${methodName}`;

        if (this.hasIncludeFile) {
            for (const pattern of this.includePatterns) {
                if (pattern.regex.test(methodName) || pattern.regex.test(fullMethodName)) {
                    included = true;
                    matchedRule = pattern.pattern;
                    ruleSource = '.methodinclude';
                    break;
                }
            }
        } else {
            included = true; // Default to included
            for (const pattern of this.ignorePatterns) {
                if (pattern.regex.test(methodName) || pattern.regex.test(fullMethodName)) {
                    included = false;
                    matchedRule = pattern.pattern;
                    ruleSource = '.methodignore';
                    break;
                }
            }
        }

        // Record decision with tracer
        if (this.tracer && this.tracer.isEnabled()) {
            let reason;
            if (this.hasIncludeFile) {
                // Include mode: only included if pattern matches
                reason = included 
                    ? 'Matched .methodinclude pattern' 
                    : 'No .methodinclude pattern matched';
            } else {
                // Exclude mode: included unless pattern matches
                reason = included 
                    ? 'No .methodignore pattern matched' 
                    : 'Matched .methodignore pattern';
            }

            this.tracer.recordMethodDecision(fileName, methodName, {
                included: included,
                reason: reason,
                rule: matchedRule,
                ruleSource: ruleSource,
                mode: this.hasIncludeFile ? 'INCLUDE' : 'EXCLUDE'
            });
        }

        return included;
    }
}

export default MethodFilterParser;
