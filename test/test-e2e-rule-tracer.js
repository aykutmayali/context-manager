/**
 * End-to-End Rule Tracer Integration Test
 * Tests the complete flow: CLI -> Scanner -> GitIgnoreParser -> RuleTracer
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Scanner } from '../lib/core/Scanner.js';
import RuleTracer from '../lib/debug/rule-tracer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test fixtures directory
const FIXTURES_DIR = path.join(__dirname, 'fixtures', 'e2e-rule-tracer');
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

    // Create subdirectories
    fs.mkdirSync(path.join(TEST_PROJECT_DIR, 'src'), { recursive: true });
    fs.mkdirSync(path.join(TEST_PROJECT_DIR, 'lib'), { recursive: true });
    fs.mkdirSync(path.join(TEST_PROJECT_DIR, 'test'), { recursive: true });
    fs.mkdirSync(path.join(TEST_PROJECT_DIR, 'node_modules'), { recursive: true });

    // Create .gitignore
    fs.writeFileSync(path.join(TEST_PROJECT_DIR, '.gitignore'), `node_modules/
*.log
.env
`);

    // Create .contextignore
    fs.writeFileSync(path.join(TEST_PROJECT_DIR, '.contextignore'), `test/
*.md
`);

    // Create test files
    fs.writeFileSync(path.join(TEST_PROJECT_DIR, 'src', 'index.js'), 'console.log("index");');
    fs.writeFileSync(path.join(TEST_PROJECT_DIR, 'src', 'app.js'), 'console.log("app");');
    fs.writeFileSync(path.join(TEST_PROJECT_DIR, 'lib', 'utils.js'), 'console.log("utils");');
    fs.writeFileSync(path.join(TEST_PROJECT_DIR, 'test', 'sample.test.js'), 'console.log("test");');
    fs.writeFileSync(path.join(TEST_PROJECT_DIR, 'node_modules', 'package.json'), '{}');
    fs.writeFileSync(path.join(TEST_PROJECT_DIR, 'debug.log'), 'log content');
    fs.writeFileSync(path.join(TEST_PROJECT_DIR, 'README.md'), '# README');
}

// Cleanup test fixtures
function cleanupTestFixtures() {
    if (fs.existsSync(FIXTURES_DIR)) {
        fs.rmSync(FIXTURES_DIR, { recursive: true, force: true });
    }
}

console.log('🧪 Testing End-to-End Rule Tracer Integration...\n');
console.log('Setting up test fixtures...\n');
setupTestFixtures();

// ============================================================================
// END-TO-END TESTS
// ============================================================================
console.log('\n🔗 End-to-End Integration Tests');
console.log('-'.repeat(70));

test('E2E - Scanner with RuleTracer integration', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const scanner = new Scanner(TEST_PROJECT_DIR, {
        ruleTracer: tracer
    });

    const files = scanner.scan();

    // Verify files were scanned
    if (files.length === 0) {
        throw new Error('Should scan some files');
    }

    // Verify tracer recorded decisions
    const trace = tracer.getTrace();
    if (trace.summary.totalFiles === 0) {
        throw new Error('Tracer should have recorded decisions');
    }

    console.log(`   📊 Scanned ${files.length} files, traced ${trace.summary.totalFiles} decisions`);
});

test('E2E - Tracer records gitignore exclusions', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const scanner = new Scanner(TEST_PROJECT_DIR, {
        ruleTracer: tracer
    });

    scanner.scan();

    // Check that node_modules directory was excluded
    const nodeModulesDecision = tracer.getFileDecision('node_modules');
    if (!nodeModulesDecision) {
        throw new Error('Should have decision for node_modules directory');
    }
    if (nodeModulesDecision.included !== false) {
        throw new Error('node_modules should be excluded');
    }
    if (nodeModulesDecision.ruleSource !== '.gitignore') {
        throw new Error('Should be excluded by .gitignore');
    }
});

test('E2E - Tracer records contextignore exclusions', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const scanner = new Scanner(TEST_PROJECT_DIR, {
        ruleTracer: tracer
    });

    scanner.scan();

    // Check that test/ directory was excluded
    const testDecision = tracer.getFileDecision('test');
    if (!testDecision) {
        throw new Error('Should have decision for test directory');
    }
    if (testDecision.included !== false) {
        throw new Error('test/ should be excluded');
    }
    if (testDecision.ruleSource !== '.contextignore') {
        throw new Error('Should be excluded by .contextignore');
    }
});

test('E2E - Tracer records inclusions', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const scanner = new Scanner(TEST_PROJECT_DIR, {
        ruleTracer: tracer
    });

    scanner.scan();

    // Check that src/index.js was included
    const srcDecision = tracer.getFileDecision('src/index.js');
    if (!srcDecision) {
        throw new Error('Should have decision for src/index.js');
    }
    if (srcDecision.included !== true) {
        throw new Error('src/index.js should be included');
    }
});

test('E2E - Tracer generates comprehensive report', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const scanner = new Scanner(TEST_PROJECT_DIR, {
        ruleTracer: tracer
    });

    scanner.scan();

    const report = tracer.generateReport();
    
    if (!report.includes('RULE TRACE REPORT')) {
        throw new Error('Report should have header');
    }
    if (!report.includes('Summary')) {
        throw new Error('Report should have summary');
    }
    if (!report.includes('File Decisions')) {
        throw new Error('Report should have file decisions');
    }
    if (!report.includes('Pattern Analysis')) {
        throw new Error('Report should have pattern analysis');
    }

    console.log(`   📄 Generated report with ${report.split('\n').length} lines`);
});

test('E2E - Tracer pattern analysis shows usage', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const scanner = new Scanner(TEST_PROJECT_DIR, {
        ruleTracer: tracer
    });

    scanner.scan();

    const trace = tracer.getTrace();
    
    // Should have patterns from gitignore and contextignore
    if (trace.patterns.length === 0) {
        throw new Error('Should have pattern analysis');
    }

    // Find node_modules pattern
    const nodeModulesPattern = trace.patterns.find(p => 
        p.pattern.includes('node_modules')
    );
    
    if (!nodeModulesPattern) {
        throw new Error('Should track node_modules pattern');
    }
    if (nodeModulesPattern.matchCount === 0) {
        throw new Error('node_modules pattern should have matches');
    }

    console.log(`   🔍 Analyzed ${trace.patterns.length} patterns`);
});

test('E2E - Tracer summary matches scan results', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const scanner = new Scanner(TEST_PROJECT_DIR, {
        ruleTracer: tracer
    });

    const files = scanner.scan();
    const trace = tracer.getTrace();

    // Tracer records decisions for all files AND directories checked
    // Scanner only returns files that passed the filter
    // So trace.summary.totalFiles >= files.length
    if (trace.summary.totalFiles < files.length) {
        throw new Error(`Trace should have at least ${files.length} decisions, got ${trace.summary.totalFiles}`);
    }

    // Should have some excluded files/directories
    if (trace.summary.excludedFiles === 0) {
        throw new Error('Should have some excluded files');
    }

    // All scanned files should be in the included count
    if (trace.summary.includedFiles < files.length) {
        throw new Error(`Should have at least ${files.length} included, got ${trace.summary.includedFiles}`);
    }

    console.log(`   ✅ ${trace.summary.includedFiles} included, ${trace.summary.excludedFiles} excluded (${trace.summary.totalFiles} total decisions)`);
});

test('E2E - Scanner works without tracer', () => {
    // Should work normally without tracer
    const scanner = new Scanner(TEST_PROJECT_DIR);
    const files = scanner.scan();

    if (files.length === 0) {
        throw new Error('Should scan files without tracer');
    }
});

test('E2E - Tracer disabled by default', () => {
    const tracer = new RuleTracer();

    const scanner = new Scanner(TEST_PROJECT_DIR, {
        ruleTracer: tracer
    });

    scanner.scan();

    // Should not record when disabled
    const trace = tracer.getTrace();
    if (trace.summary.totalFiles !== 0) {
        throw new Error('Should not record when disabled');
    }
});

test('E2E - Tracer can be enabled after creation', () => {
    const tracer = new RuleTracer();

    const scanner = new Scanner(TEST_PROJECT_DIR, {
        ruleTracer: tracer
    });

    // Enable after creation
    tracer.enable();
    scanner.scan();

    const trace = tracer.getTrace();
    if (trace.summary.totalFiles === 0) {
        throw new Error('Should record after enabling');
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
    console.log('🎉 All end-to-end rule tracer tests passed!\n');
    process.exit(0);
} else {
    console.log('❌ Some tests failed. Please review the errors above.\n');
    process.exit(1);
}
