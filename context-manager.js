#!/usr/bin/env node

/**
 * Context Manager - Main Orchestrator
 * LLM context optimization with method-level filtering and GitIngest support
 */

import fs from 'fs';
import path from 'path';
import TokenCalculator from './lib/analyzers/token-calculator.js';
import GitIngestFormatter from './lib/formatters/gitingest-formatter.js';
import TokenUtils from './lib/utils/token-utils.js';

/**
 * Generate GitIngest digest from token-analysis-report.json
 */
function generateDigestFromReport(reportPath) {
    console.log('📄 Loading token analysis report...');

    if (!fs.existsSync(reportPath)) {
        console.error(`❌ Error: Report file not found: ${reportPath}`);
        process.exit(1);
    }

    try {
        const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

        if (!report.metadata || !report.summary || !report.files) {
            console.error('❌ Error: Invalid report format. Missing required fields.');
            process.exit(1);
        }

        const projectRoot = report.metadata.projectRoot || process.cwd();

        console.log(`✅ Report loaded: ${report.files.length} files`);
        console.log('📄 Generating GitIngest digest from report...\n');

        const formatter = new GitIngestFormatter(
            projectRoot,
            report.summary,
            report.files
        );

        const digestPath = path.join(process.cwd(), 'digest.txt');
        const digestSize = formatter.saveToFile(digestPath);

        console.log(`💾 GitIngest digest saved to: digest.txt`);
        console.log(`📊 Digest size: ${(digestSize / 1024).toFixed(1)} KB`);
        console.log(`✨ Generated from: ${path.basename(reportPath)}`);

    } catch (error) {
        console.error(`❌ Error processing report: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Generate GitIngest digest from llm-context.json
 */
function generateDigestFromContext(contextPath) {
    console.log('📄 Loading LLM context file...');

    if (!fs.existsSync(contextPath)) {
        console.error(`❌ Error: Context file not found: ${contextPath}`);
        process.exit(1);
    }

    try {
        const context = JSON.parse(fs.readFileSync(contextPath, 'utf8'));

        if (!context.project || !context.paths) {
            console.error('❌ Error: Invalid context format. Missing required fields.');
            process.exit(1);
        }

        console.log(`✅ Context loaded: ${context.project.totalFiles} files`);
        console.log('📄 Generating GitIngest digest from context...\n');

        // Extract files from context.paths structure
        const files = [];
        for (const [dirPath, fileNames] of Object.entries(context.paths)) {
            for (const fileName of fileNames) {
                const relativePath = dirPath === '/'
                    ? fileName
                    : `${dirPath}${fileName}`;

                const fullPath = path.join(process.cwd(), relativePath);

                if (fs.existsSync(fullPath)) {
                    const stats = fs.statSync(fullPath);
                    files.push({
                        path: fullPath,
                        relativePath: relativePath,
                        sizeBytes: stats.size,
                        tokens: 0,
                        lines: 0
                    });
                }
            }
        }

        console.log(`📁 Found ${files.length} accessible files`);

        const stats = {
            totalFiles: files.length,
            totalTokens: context.project.totalTokens,
            totalBytes: files.reduce((sum, f) => sum + f.sizeBytes, 0),
            totalLines: 0
        };

        const formatter = new GitIngestFormatter(
            process.cwd(),
            stats,
            files
        );

        const digestPath = path.join(process.cwd(), 'digest.txt');
        const digestSize = formatter.saveToFile(digestPath);

        console.log(`💾 GitIngest digest saved to: digest.txt`);
        console.log(`📊 Digest size: ${(digestSize / 1024).toFixed(1)} KB`);
        console.log(`✨ Generated from: ${path.basename(contextPath)}`);

    } catch (error) {
        console.error(`❌ Error processing context: ${error.message}`);
        process.exit(1);
    }
}

/**
 * Main execution
 */
function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
        printHelp();
        return;
    }

    // Handle --gitingest-from-report
    const reportFlagIndex = args.indexOf('--gitingest-from-report');
    if (reportFlagIndex !== -1) {
        const reportPath = args[reportFlagIndex + 1] || 'token-analysis-report.json';
        generateDigestFromReport(reportPath);
        return;
    }

    // Handle --gitingest-from-context
    const contextFlagIndex = args.indexOf('--gitingest-from-context');
    if (contextFlagIndex !== -1) {
        const contextPath = args[contextFlagIndex + 1] || 'llm-context.json';
        generateDigestFromContext(contextPath);
        return;
    }

    const options = {
        saveReport: args.includes('--save-report') || args.includes('-s'),
        verbose: args.includes('--verbose') || args.includes('-v'),
        contextExport: args.includes('--context-export'),
        contextToClipboard: args.includes('--context-clipboard'),
        methodLevel: args.includes('--method-level') || args.includes('-m'),
        gitingest: args.includes('--gitingest') || args.includes('-g')
    };

    printStartupInfo();

    const calculator = new TokenCalculator(process.cwd(), options);
    calculator.run();
}

function printStartupInfo() {
    console.log('🚀 Context Manager v3.1.0 by Hakkı Sağdıç');
    console.log('='.repeat(50));
    console.log('📋 Available options:');
    console.log('  --save-report, -s     Save detailed JSON report');
    console.log('  --verbose, -v         Show included files and directories');
    console.log('  --context-export      Generate LLM context file list');
    console.log('  --context-clipboard   Copy context to clipboard');
    console.log('  --method-level, -m    Enable method-level analysis');
    console.log('  --gitingest, -g       Generate GitIngest-style digest');
    console.log('  --help, -h            Show this help message');
    console.log();
    console.log('💡 Tip: Use "context-manager --help" for complete documentation');
    console.log('   including Phase 1 features (presets, token budget, rule tracing)');

    if (!TokenUtils.hasExactCounting()) {
        console.log('\n💡 For exact token counts, install tiktoken: npm install tiktoken');
    }
    console.log();
}

function printHelp() {
    console.log('Context Manager v3.1.0 - LLM context optimization with method-level filtering');
    console.log();
    console.log('Usage: context-manager [options]');
    console.log('       node context-manager.js [options]  # Direct usage');
    console.log();
    console.log('Basic Options:');
    console.log('  -s, --save-report                    Save detailed JSON report');
    console.log('  -v, --verbose                        Show all included files');
    console.log('  --context-export                     Generate LLM context file');
    console.log('  --context-clipboard                  Copy context to clipboard');
    console.log('  -m, --method-level                   Enable method-level analysis');
    console.log('  -g, --gitingest                      Generate GitIngest-style digest');
    console.log('  --gitingest-from-report <file>       Generate digest from report JSON');
    console.log('  --gitingest-from-context <file>      Generate digest from context JSON');
    console.log('  -h, --help                           Show this help');
    console.log();
    console.log('Phase 1 Features (v3.1.0):');
    console.log('  Note: These features are available in the full CLI (bin/cli.js)');
    console.log('  Run "context-manager --help" for complete Phase 1 documentation');
    console.log();
    console.log('  --preset <name>                      Use predefined preset configuration');
    console.log('  --list-presets                       List all available presets');
    console.log('  --preset-info <name>                 Show detailed preset information');
    console.log('  --target-tokens <N>                  Fit within token budget (e.g., 100k)');
    console.log('  --fit-strategy <type>                Fitting strategy (auto, balanced, etc.)');
    console.log('  --trace-rules                        Debug filter decisions');
    console.log();
    console.log('Method-level Configuration:');
    console.log('  .methodinclude                       Include only specified methods');
    console.log('  .methodignore                        Exclude specified methods');
    console.log();
    console.log('Examples:');
    console.log('  # Standard workflow');
    console.log('  context-manager                      # Interactive export selection');
    console.log('  context-manager --save-report        # Save JSON report');
    console.log('  context-manager --gitingest          # Generate digest.txt');
    console.log('  context-manager -g -s                # Both digest + report');
    console.log();
    console.log('  # Generate digest from existing JSON files (fast, no re-scan)');
    console.log('  context-manager --gitingest-from-report token-analysis-report.json');
    console.log('  context-manager --gitingest-from-context llm-context.json');
    console.log();
    console.log('  # Two-step workflow');
    console.log('  context-manager -s                   # Step 1: Analyze and save report');
    console.log('  context-manager --gitingest-from-report token-analysis-report.json');
    console.log('                                       # Step 2: Generate digest (instant)');
    console.log();
    console.log('For complete documentation including Phase 1 features:');
    console.log('  https://github.com/hakkisagdic/context-manager');
}

// ESM entry point check
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export {
    TokenCalculator,
    generateDigestFromReport,
    generateDigestFromContext,
    main,
    printHelp,
    printStartupInfo
};
