#!/usr/bin/env node

/**
 * Demo: RuleTracer Integration with File Scanning
 * 
 * This script demonstrates how the RuleTracer integrates with
 * GitIgnoreParser to track file inclusion/exclusion decisions.
 */

import { Scanner } from './lib/core/Scanner.js';
import RuleTracer from './lib/debug/rule-tracer.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 RuleTracer Integration Demo\n');
console.log('='.repeat(70));
console.log('\nThis demo shows how RuleTracer tracks file decisions during scanning.\n');

// Create and enable tracer
console.log('1️⃣  Creating and enabling RuleTracer...');
const tracer = new RuleTracer();
tracer.enable();
console.log('   ✅ Tracer enabled\n');

// Create scanner with tracer
console.log('2️⃣  Creating Scanner with RuleTracer...');
const projectRoot = path.join(__dirname, 'lib', 'parsers');
const scanner = new Scanner(projectRoot, {
    ruleTracer: tracer,
    maxDepth: 2
});
console.log(`   ✅ Scanner created for: ${projectRoot}\n`);

// Scan files
console.log('3️⃣  Scanning files...');
const files = scanner.scan();
console.log(`   ✅ Scanned ${files.length} files\n`);

// Get trace results
console.log('4️⃣  Analyzing trace results...');
const trace = tracer.getTrace();
console.log(`   📊 Total decisions: ${trace.summary.totalFiles}`);
console.log(`   ✅ Included: ${trace.summary.includedFiles}`);
console.log(`   ❌ Excluded: ${trace.summary.excludedFiles}\n`);

// Show some example decisions
console.log('5️⃣  Example file decisions:\n');
let count = 0;
for (const [file, decision] of trace.files.entries()) {
    if (count >= 5) break;
    
    const icon = decision.included ? '✅' : '❌';
    const status = decision.included ? 'INCLUDED' : 'EXCLUDED';
    
    console.log(`   ${icon} ${file}`);
    console.log(`      Status: ${status}`);
    console.log(`      Reason: ${decision.reason}`);
    if (decision.rule) {
        console.log(`      Rule: ${decision.rule}`);
    }
    if (decision.ruleSource) {
        console.log(`      Source: ${decision.ruleSource}`);
    }
    console.log(`      Priority: ${decision.priority}`);
    console.log(`      Mode: ${decision.mode}\n`);
    
    count++;
}

// Show pattern analysis
console.log('6️⃣  Pattern analysis:\n');
if (trace.patterns.length > 0) {
    for (const pattern of trace.patterns.slice(0, 3)) {
        console.log(`   📋 Pattern: ${pattern.pattern}`);
        console.log(`      Source: ${pattern.source}`);
        console.log(`      Matches: ${pattern.matchCount}`);
        if (pattern.examples.length > 0) {
            console.log(`      Examples: ${pattern.examples.slice(0, 2).join(', ')}`);
        }
        console.log('');
    }
} else {
    console.log('   No patterns matched\n');
}

// Generate summary
console.log('7️⃣  Summary:\n');
console.log(tracer.generateSummary());
console.log('');

console.log('='.repeat(70));
console.log('\n✅ Demo complete!\n');
console.log('Key Features Demonstrated:');
console.log('  • RuleTracer integration with Scanner');
console.log('  • Decision tracking for all files');
console.log('  • Rule source and priority tracking');
console.log('  • Pattern usage analysis');
console.log('  • Comprehensive reporting\n');
