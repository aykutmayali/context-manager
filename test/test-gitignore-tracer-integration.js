/**
 * GitIgnoreParser + RuleTracer Integration Tests
 * Tests for task 4.3: Integrate with file scanning
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import GitIgnoreParser from '../lib/parsers/gitignore-parser.js';
import RuleTracer from '../lib/debug/rule-tracer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test fixtures directory
const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'gitignore-tracer-integration');
const TEST_PROJECT_DIR = path.join(FIXTURES_DIR, 'test-project');

// Test counter
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        testsPassed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        testsFailed++;
    }
}

// Setup test fixtures
function setupTestFixtures() {
    // Create directories
    if (!fs.existsSync(FIXTURES_DIR)) {
        fs.mkdirSync(FIXTURES_DIR, { recursive: true });
    }
    if (!fs.existsSync(TEST_PROJECT_DIR)) {
        fs.mkdirSync(TEST_PROJECT_DIR, { recursive: true });
    }

    // Create .gitignore
    fs.writeFileSync(path.join(TEST_PROJECT_DIR, '.gitignore'), `node_modules/
*.log
build/
.env
`);

    // Create .contextignore
    fs.writeFileSync(path.join(TEST_PROJECT_DIR, '.contextignore'), `test/
docs/
*.md
`);

    // Create .contextinclude
    fs.writeFileSync(path.join(TEST_PROJECT_DIR, '.contextinclude'), `src/**/*.js
lib/**/*.js
*.json
`);
}

// Cleanup test fixtures
function cleanupTestFixtures() {
    if (fs.existsSync(FIXTURES_DIR)) {
        fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
    }
}

console.log('🧪 Testing GitIgnoreParser + RuleTracer Integration...\n');
console.log('Setting up test fixtures...\n');
setupTestFixtures();

// ============================================================================
// TRACER INTEGRATION TESTS
// ============================================================================
console.log('\n🔍 Tracer Integration Tests');
console.log('-'.repeat(70));

test('GitIgnoreParser - Records file decisions when tracer enabled', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        path.join(TEST_PROJECT_DIR, '.contextignore'),
        null,
        tracer
    );

    // Test a file that should be ignored
    parser.isIgnored(null, 'node_modules/package.json');
    
    // Check that decision was recorded
    const decision = tracer.getFileDecision('node_modules/package.json');
    if (!decision) throw new Error('Decision should be recorded');
    if (decision.included !== false) throw new Error('Should be excluded');
    if (!decision.rule) throw new Error('Should have rule');
    if (!decision.ruleSource) throw new Error('Should have rule source');
});

test('GitIgnoreParser - Records rule source correctly for gitignore', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        null,
        null,
        tracer
    );

    parser.isIgnored(null, 'node_modules/package.json');
    
    const decision = tracer.getFileDecision('node_modules/package.json');
    if (decision.ruleSource !== '.gitignore') {
        throw new Error(`Expected .gitignore, got ${decision.ruleSource}`);
    }
});

test('GitIgnoreParser - Records rule source correctly for contextignore', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        path.join(TEST_PROJECT_DIR, '.contextignore'),
        null,
        tracer
    );

    parser.isIgnored(null, 'test/sample.js');
    
    const decision = tracer.getFileDecision('test/sample.js');
    if (decision.ruleSource !== '.contextignore') {
        throw new Error(`Expected .contextignore, got ${decision.ruleSource}`);
    }
});

test('GitIgnoreParser - Records rule source correctly for contextinclude', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        null,
        path.join(TEST_PROJECT_DIR, '.contextinclude'),
        tracer
    );

    parser.isIgnored(null, 'src/index.js');
    
    const decision = tracer.getFileDecision('src/index.js');
    if (decision.ruleSource !== '.contextinclude') {
        throw new Error(`Expected .contextinclude, got ${decision.ruleSource}`);
    }
});

test('GitIgnoreParser - Records priority correctly', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        path.join(TEST_PROJECT_DIR, '.contextignore'),
        null,
        tracer
    );

    // gitignore should have priority 1
    parser.isIgnored(null, 'node_modules/package.json');
    let decision = tracer.getFileDecision('node_modules/package.json');
    if (decision.priority !== 1) {
        throw new Error(`Expected priority 1 for gitignore, got ${decision.priority}`);
    }

    // contextignore should have priority 3
    parser.isIgnored(null, 'test/sample.js');
    decision = tracer.getFileDecision('test/sample.js');
    if (decision.priority !== 3) {
        throw new Error(`Expected priority 3 for contextignore, got ${decision.priority}`);
    }
});

test('GitIgnoreParser - Records mode correctly (EXCLUDE)', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        path.join(TEST_PROJECT_DIR, '.contextignore'),
        null,
        tracer
    );

    parser.isIgnored(null, 'node_modules/package.json');
    
    const decision = tracer.getFileDecision('node_modules/package.json');
    if (decision.mode !== 'EXCLUDE') {
        throw new Error(`Expected EXCLUDE mode, got ${decision.mode}`);
    }
});

test('GitIgnoreParser - Records mode correctly (INCLUDE)', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        null,
        path.join(TEST_PROJECT_DIR, '.contextinclude'),
        tracer
    );

    parser.isIgnored(null, 'src/index.js');
    
    const decision = tracer.getFileDecision('src/index.js');
    if (decision.mode !== 'INCLUDE') {
        throw new Error(`Expected INCLUDE mode, got ${decision.mode}`);
    }
});

test('GitIgnoreParser - Captures matched patterns', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        null,
        null,
        tracer
    );

    parser.isIgnored(null, 'debug.log');
    
    const decision = tracer.getFileDecision('debug.log');
    if (!decision.rule) throw new Error('Should have matched rule');
    if (!decision.rule.includes('*.log')) {
        throw new Error(`Expected *.log pattern, got ${decision.rule}`);
    }
});

test('GitIgnoreParser - Records reason for inclusion', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        null,
        path.join(TEST_PROJECT_DIR, '.contextinclude'),
        tracer
    );

    parser.isIgnored(null, 'src/app.js');
    
    const decision = tracer.getFileDecision('src/app.js');
    if (decision.included !== true) throw new Error('Should be included');
    if (!decision.reason) throw new Error('Should have reason');
    if (!decision.reason.includes('Matched')) {
        throw new Error(`Expected inclusion reason, got: ${decision.reason}`);
    }
});

test('GitIgnoreParser - Records reason for exclusion', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        null,
        path.join(TEST_PROJECT_DIR, '.contextinclude'),
        tracer
    );

    parser.isIgnored(null, 'test/sample.js');
    
    const decision = tracer.getFileDecision('test/sample.js');
    if (decision.included !== false) throw new Error('Should be excluded');
    if (!decision.reason) throw new Error('Should have reason');
});

test('GitIgnoreParser - Does not record when tracer disabled', () => {
    const tracer = new RuleTracer();
    // tracer is disabled by default

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        null,
        null,
        tracer
    );

    parser.isIgnored(null, 'node_modules/package.json');
    
    const decision = tracer.getFileDecision('node_modules/package.json');
    if (decision !== null) {
        throw new Error('Should not record when disabled');
    }
});

test('GitIgnoreParser - Handles null tracer gracefully', () => {
    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        null,
        null,
        null
    );

    // Should not throw
    const ignored = parser.isIgnored(null, 'node_modules/package.json');
    if (!ignored) throw new Error('Should be ignored');
});

test('GitIgnoreParser - Tracer tracks pattern usage', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        null,
        null,
        tracer
    );

    // Test multiple files with same pattern
    parser.isIgnored(null, 'debug.log');
    parser.isIgnored(null, 'error.log');
    parser.isIgnored(null, 'access.log');
    
    const trace = tracer.getTrace();
    const logPattern = trace.patterns.find(p => p.pattern.includes('*.log'));
    
    if (!logPattern) throw new Error('Should track *.log pattern');
    if (logPattern.matchCount < 3) {
        throw new Error(`Expected at least 3 matches, got ${logPattern.matchCount}`);
    }
});

test('GitIgnoreParser - Tracer provides pattern examples', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        null,
        null,
        tracer
    );

    parser.isIgnored(null, 'debug.log');
    parser.isIgnored(null, 'error.log');
    
    const trace = tracer.getTrace();
    const logPattern = trace.patterns.find(p => p.pattern.includes('*.log'));
    
    if (!logPattern) throw new Error('Should track *.log pattern');
    if (logPattern.examples.length === 0) {
        throw new Error('Should have examples');
    }
    if (!logPattern.examples.some(e => e.includes('.log'))) {
        throw new Error('Examples should include .log files');
    }
});

test('GitIgnoreParser - Priority: gitignore > contextinclude', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        null,
        path.join(TEST_PROJECT_DIR, '.contextinclude'),
        tracer
    );

    // node_modules is in gitignore, should be excluded even if contextinclude has *.json
    parser.isIgnored(null, 'node_modules/package.json');
    
    const decision = tracer.getFileDecision('node_modules/package.json');
    if (decision.included !== false) throw new Error('Should be excluded by gitignore');
    if (decision.priority !== 1) throw new Error('Should have priority 1 (gitignore)');
    if (decision.ruleSource !== '.gitignore') {
        throw new Error('Should be from .gitignore');
    }
});

test('GitIgnoreParser - Generates trace report', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        null,
        null,
        tracer
    );

    parser.isIgnored(null, 'node_modules/package.json');
    parser.isIgnored(null, 'src/index.js');
    parser.isIgnored(null, 'debug.log');
    
    const report = tracer.generateReport();
    if (!report) throw new Error('Should generate report');
    if (!report.includes('RULE TRACE REPORT')) {
        throw new Error('Report should have header');
    }
    if (!report.includes('Summary')) {
        throw new Error('Report should have summary');
    }
});

// ============================================================================
// INTEGRATION WITH SCANNER
// ============================================================================
console.log('\n🔗 Scanner Integration Tests');
console.log('-'.repeat(70));

test('GitIgnoreParser - Works with Scanner pattern', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    // Simulate Scanner usage
    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        path.join(TEST_PROJECT_DIR, '.contextignore'),
        null,
        tracer
    );

    // Scanner calls isIgnored with null filePath
    const files = [
        'src/index.js',
        'test/sample.js',
        'node_modules/package.json',
        'README.md'
    ];

    for (const file of files) {
        parser.isIgnored(null, file);
    }

    const trace = tracer.getTrace();
    if (trace.summary.totalFiles !== files.length) {
        throw new Error(`Expected ${files.length} files, got ${trace.summary.totalFiles}`);
    }
});

test('GitIgnoreParser - Tracer summary matches decisions', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new GitIgnoreParser(
        path.join(TEST_PROJECT_DIR, '.gitignore'),
        null,
        null,
        tracer
    );

    const files = [
        'src/index.js',      // not ignored
        'node_modules/pkg',  // ignored
        'debug.log',         // ignored
        'lib/utils.js'       // not ignored
    ];

    for (const file of files) {
        parser.isIgnored(null, file);
    }

    const trace = tracer.getTrace();
    
    // Count manually
    let expectedIncluded = 0;
    let expectedExcluded = 0;
    
    for (const file of files) {
        const decision = tracer.getFileDecision(file);
        if (decision.included) {
            expectedIncluded++;
        } else {
            expectedExcluded++;
        }
    }

    if (trace.summary.includedFiles !== expectedIncluded) {
        throw new Error(`Expected ${expectedIncluded} included, got ${trace.summary.includedFiles}`);
    }
    if (trace.summary.excludedFiles !== expectedExcluded) {
        throw new Error(`Expected ${expectedExcluded} excluded, got ${trace.summary.excludedFiles}`);
    }
});

// ============================================================================
// CLEANUP
// ============================================================================
console.log('\nCleaning up test fixtures...\n');
cleanupTestFixtures();

// ============================================================================
// RESULTS
// ============================================================================
console.log('='.repeat(70));
console.log('📊 TEST RESULTS');
console.log('='.repeat(70));
console.log(`Total Tests: ${testsPassed + testsFailed}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
console.log('');

if (testsFailed === 0) {
    console.log('🎉 All GitIgnoreParser + RuleTracer integration tests passed!\n');
    process.exit(0);
} else {
    console.log('❌ Some tests failed. Please review the errors above.\n');
    process.exit(1);
}
