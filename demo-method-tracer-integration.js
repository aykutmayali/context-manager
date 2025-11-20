#!/usr/bin/env node

/**
 * Demo: Method Filter + RuleTracer Integration
 * Shows how method-level tracing works in practice
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import MethodFilterParser from './lib/parsers/method-filter-parser.js';
import RuleTracer from './lib/debug/rule-tracer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🎯 Method Filter + RuleTracer Integration Demo');
console.log('='.repeat(80));

// Create temporary test files
const tempDir = path.join(__dirname, '.temp-demo');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const includeFile = path.join(tempDir, '.methodinclude');
const ignoreFile = path.join(tempDir, '.methodignore');

// Write sample filter files
fs.writeFileSync(includeFile, `# Include API methods
get*
post*
put*
delete*
*Controller.create
*Controller.update
*Service.*
`);

fs.writeFileSync(ignoreFile, `# Exclude test and private methods
test*
_*
*Mock
*Stub
`);

console.log('\n📝 Filter Configuration:');
console.log('\n.methodinclude:');
console.log(fs.readFileSync(includeFile, 'utf8'));
console.log('.methodignore:');
console.log(fs.readFileSync(ignoreFile, 'utf8'));

// Create tracer and parser
console.log('\n🔧 Initializing RuleTracer and MethodFilterParser...');
const tracer = new RuleTracer();
tracer.enable();

const parser = new MethodFilterParser(includeFile, ignoreFile, tracer);

// Simulate analyzing methods from a codebase
console.log('\n🔍 Analyzing Methods:');
console.log('-'.repeat(80));

const methods = [
    { name: 'getData', file: 'ApiController.js', description: 'Fetch data from API' },
    { name: 'postData', file: 'ApiController.js', description: 'Send data to API' },
    { name: 'putData', file: 'ApiController.js', description: 'Update data via API' },
    { name: 'deleteData', file: 'ApiController.js', description: 'Delete data via API' },
    { name: 'create', file: 'UserController.js', description: 'Create new user' },
    { name: 'update', file: 'UserController.js', description: 'Update user' },
    { name: 'delete', file: 'PostController.js', description: 'Delete post' },
    { name: 'authenticate', file: 'AuthService.js', description: 'Authenticate user' },
    { name: 'authorize', file: 'AuthService.js', description: 'Authorize action' },
    { name: 'validateToken', file: 'TokenService.js', description: 'Validate JWT token' },
    { name: '_privateHelper', file: 'utils.js', description: 'Private utility function' },
    { name: 'testUserCreation', file: 'user.test.js', description: 'Test user creation' },
    { name: 'mockApiCall', file: 'api.mock.js', description: 'Mock API call' },
    { name: 'internalMethod', file: 'internal.js', description: 'Internal method' },
];

methods.forEach(({ name, file, description }) => {
    const included = parser.shouldIncludeMethod(name, file);
    const icon = included ? '✅' : '❌';
    const status = included ? 'INCLUDED' : 'EXCLUDED';
    console.log(`${icon} ${file}:${name}`);
    console.log(`   ${description}`);
    console.log(`   Status: ${status}`);
});

// Get trace results
const trace = tracer.getTrace();

console.log('\n📊 Analysis Summary:');
console.log('-'.repeat(80));
console.log(`Total Methods Analyzed: ${trace.summary.totalMethods}`);
console.log(`✅ Included: ${trace.summary.includedMethods} (${((trace.summary.includedMethods / trace.summary.totalMethods) * 100).toFixed(1)}%)`);
console.log(`❌ Excluded: ${trace.summary.excludedMethods} (${((trace.summary.excludedMethods / trace.summary.totalMethods) * 100).toFixed(1)}%)`);

console.log('\n🔍 Pattern Usage Analysis:');
console.log('-'.repeat(80));

const patterns = trace.patterns.sort((a, b) => b.matchCount - a.matchCount);

console.log('\n✅ Active Patterns (with matches):');
patterns.filter(p => p.matchCount > 0).forEach(pattern => {
    console.log(`\n   ${pattern.pattern} (${pattern.source})`);
    console.log(`   Matches: ${pattern.matchCount}`);
    console.log(`   Examples:`);
    pattern.examples.slice(0, 3).forEach(example => {
        console.log(`     - ${example}`);
    });
});

const unusedPatterns = patterns.filter(p => p.matchCount === 0);
if (unusedPatterns.length > 0) {
    console.log('\n⚠️  Unused Patterns (consider removing):');
    unusedPatterns.forEach(pattern => {
        console.log(`   - ${pattern.pattern} (${pattern.source})`);
    });
}

console.log('\n📋 Method Decision Details:');
console.log('-'.repeat(80));

// Show detailed decisions for a few files
const filesToShow = ['ApiController.js', 'UserController.js', 'utils.js'];

filesToShow.forEach(file => {
    const decisions = tracer.getMethodDecisions(file);
    if (decisions && decisions.size > 0) {
        console.log(`\n${file}:`);
        for (const [method, decision] of decisions.entries()) {
            const icon = decision.included ? '✅' : '❌';
            console.log(`  ${icon} ${method}`);
            console.log(`     Reason: ${decision.reason}`);
            if (decision.rule) {
                console.log(`     Matched Rule: ${decision.rule}`);
                console.log(`     Rule Source: ${decision.ruleSource}`);
            }
            console.log(`     Mode: ${decision.mode}`);
        }
    }
});

console.log('\n💡 Insights:');
console.log('-'.repeat(80));

const inclusionRate = (trace.summary.includedMethods / trace.summary.totalMethods) * 100;
if (inclusionRate > 80) {
    console.log('   ℹ️  High inclusion rate - most methods are being included');
} else if (inclusionRate < 20) {
    console.log('   ℹ️  Low inclusion rate - most methods are being excluded');
} else {
    console.log('   ℹ️  Balanced filtering - good mix of included/excluded methods');
}

if (unusedPatterns.length > 0) {
    console.log(`   ⚠️  ${unusedPatterns.length} unused pattern(s) detected - consider cleaning up`);
}

const activePatterns = patterns.filter(p => p.matchCount > 0);
if (activePatterns.length > 0) {
    const topPattern = activePatterns[0];
    console.log(`   🎯 Most used pattern: "${topPattern.pattern}" with ${topPattern.matchCount} matches`);
}

// Generate full trace report
console.log('\n📄 Full Trace Report:');
console.log('='.repeat(80));
const report = tracer.generateReport();
console.log(report);

// Cleanup
fs.unlinkSync(includeFile);
fs.unlinkSync(ignoreFile);
fs.rmdirSync(tempDir);

console.log('\n✅ Demo completed successfully!');
console.log('='.repeat(80));
