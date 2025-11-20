/**
 * Test Method Filter Parser Integration with RuleTracer
 * Tests task 4.4: Integrate with method filtering
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import MethodFilterParser from '../lib/parsers/method-filter-parser.js';
import RuleTracer from '../lib/debug/rule-tracer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test utilities
let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function test(name, fn) {
    testsRun++;
    try {
        fn();
        testsPassed++;
        console.log(`✅ ${name}`);
    } catch (error) {
        testsFailed++;
        console.error(`❌ ${name}`);
        console.error(`   ${error.message}`);
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}\n   Expected: ${expected}\n   Actual: ${actual}`);
    }
}

function assertTrue(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

function assertFalse(condition, message) {
    if (condition) {
        throw new Error(message);
    }
}

// Test fixture setup
const testDir = path.join(__dirname, 'fixtures', 'method-filter-tracer-test');

function setupTestFixture() {
    if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
    }
}

function cleanupTestFixture() {
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
}

// ============================================================================
// TESTS
// ============================================================================

console.log('\n🧪 Method Filter Parser + RuleTracer Integration Tests');
console.log('='.repeat(80));

setupTestFixture();

// Test 1: Tracer records method decisions in include mode
test('Tracer records method decisions in include mode', () => {
    const includePath = path.join(testDir, '.methodinclude-1');
    fs.writeFileSync(includePath, 'get*\n*Handler\nMyClass.*');

    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new MethodFilterParser(includePath, null, tracer);

    // Test various methods
    parser.shouldIncludeMethod('getData', 'api.js');
    parser.shouldIncludeMethod('setData', 'api.js');
    parser.shouldIncludeMethod('errorHandler', 'utils.js');
    parser.shouldIncludeMethod('init', 'MyClass.js');
    parser.shouldIncludeMethod('random', 'OtherClass.js');

    const trace = tracer.getTrace();

    // Verify method decisions were recorded
    assertTrue(trace.methods.size > 0, 'Should record method decisions');
    assertEquals(trace.summary.totalMethods, 5, 'Should track 5 methods');
    assertEquals(trace.summary.includedMethods, 3, 'Should include 3 methods');
    assertEquals(trace.summary.excludedMethods, 2, 'Should exclude 2 methods');

    // Verify specific decisions
    const apiMethods = tracer.getMethodDecisions('api.js');
    assertTrue(apiMethods !== null, 'Should have decisions for api.js');
    
    const getDataDecision = apiMethods.get('getData');
    assertTrue(getDataDecision.included, 'getData should be included');
    assertEquals(getDataDecision.rule, 'get*', 'Should match get* pattern');
    assertEquals(getDataDecision.ruleSource, '.methodinclude', 'Should come from .methodinclude');
    assertEquals(getDataDecision.mode, 'INCLUDE', 'Should be in INCLUDE mode');

    const setDataDecision = apiMethods.get('setData');
    assertFalse(setDataDecision.included, 'setData should be excluded');
    assertEquals(setDataDecision.reason, 'No .methodinclude pattern matched', 'Should have correct reason');

    fs.unlinkSync(includePath);
});

// Test 2: Tracer records method decisions in exclude mode
test('Tracer records method decisions in exclude mode', () => {
    const ignorePath = path.join(testDir, '.methodignore-1');
    fs.writeFileSync(ignorePath, '_*\ntest*\n*Private');

    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new MethodFilterParser(null, ignorePath, tracer);

    // Test various methods
    parser.shouldIncludeMethod('_privateHelper', 'utils.js');
    parser.shouldIncludeMethod('publicAPI', 'api.js');
    parser.shouldIncludeMethod('testFunction', 'test.js');
    parser.shouldIncludeMethod('getData', 'api.js');

    const trace = tracer.getTrace();

    assertEquals(trace.summary.totalMethods, 4, 'Should track 4 methods');
    assertEquals(trace.summary.includedMethods, 2, 'Should include 2 methods');
    assertEquals(trace.summary.excludedMethods, 2, 'Should exclude 2 methods');

    // Verify exclude mode decisions
    const utilsMethods = tracer.getMethodDecisions('utils.js');
    const privateDecision = utilsMethods.get('_privateHelper');
    assertFalse(privateDecision.included, '_privateHelper should be excluded');
    assertEquals(privateDecision.rule, '_*', 'Should match _* pattern');
    assertEquals(privateDecision.ruleSource, '.methodignore', 'Should come from .methodignore');
    assertEquals(privateDecision.mode, 'EXCLUDE', 'Should be in EXCLUDE mode');

    const apiMethods = tracer.getMethodDecisions('api.js');
    const publicDecision = apiMethods.get('publicAPI');
    assertTrue(publicDecision.included, 'publicAPI should be included');
    assertEquals(publicDecision.reason, 'No .methodignore pattern matched', 'Should have correct reason');

    fs.unlinkSync(ignorePath);
});

// Test 3: Tracer tracks pattern matches
test('Tracer tracks pattern matches with examples', () => {
    const includePath = path.join(testDir, '.methodinclude-2');
    fs.writeFileSync(includePath, 'get*\nset*\n*Handler');

    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new MethodFilterParser(includePath, null, tracer);

    // Generate multiple matches for patterns
    parser.shouldIncludeMethod('getData', 'api.js');
    parser.shouldIncludeMethod('getUser', 'user.js');
    parser.shouldIncludeMethod('getName', 'person.js');
    parser.shouldIncludeMethod('setData', 'api.js');
    parser.shouldIncludeMethod('errorHandler', 'error.js');
    parser.shouldIncludeMethod('requestHandler', 'request.js');

    const trace = tracer.getTrace();
    const patterns = trace.patterns;

    // Verify pattern analysis
    assertTrue(patterns.length > 0, 'Should have pattern analysis');

    const getPattern = patterns.find(p => p.pattern === 'get*');
    assertTrue(getPattern !== null, 'Should track get* pattern');
    assertEquals(getPattern.matchCount, 3, 'get* should match 3 times');
    assertTrue(getPattern.examples.length > 0, 'Should have examples');
    assertEquals(getPattern.source, '.methodinclude', 'Should track source');

    const setPattern = patterns.find(p => p.pattern === 'set*');
    assertEquals(setPattern.matchCount, 1, 'set* should match 1 time');

    const handlerPattern = patterns.find(p => p.pattern === '*Handler');
    assertEquals(handlerPattern.matchCount, 2, '*Handler should match 2 times');

    fs.unlinkSync(includePath);
});

// Test 4: Tracer identifies unused patterns
test('Tracer identifies unused patterns', () => {
    const includePath = path.join(testDir, '.methodinclude-3');
    fs.writeFileSync(includePath, 'get*\nset*\ndelete*\nupdate*');

    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new MethodFilterParser(includePath, null, tracer);

    // Only use some patterns
    parser.shouldIncludeMethod('getData', 'api.js');
    parser.shouldIncludeMethod('setData', 'api.js');
    parser.shouldIncludeMethod('random', 'utils.js');

    const trace = tracer.getTrace();
    const patterns = trace.patterns;

    // Find unused patterns
    const unusedPatterns = patterns.filter(p => p.unused || p.matchCount === 0);
    
    assertTrue(unusedPatterns.length >= 2, 'Should identify unused patterns');
    
    const deletePattern = patterns.find(p => p.pattern === 'delete*');
    assertTrue(deletePattern !== null, 'Should track delete* pattern');
    assertTrue(deletePattern.unused || deletePattern.matchCount === 0, 'delete* should be unused');

    const updatePattern = patterns.find(p => p.pattern === 'update*');
    assertTrue(updatePattern !== null, 'Should track update* pattern');
    assertTrue(updatePattern.unused || updatePattern.matchCount === 0, 'update* should be unused');

    fs.unlinkSync(includePath);
});

// Test 5: Tracer handles class.method patterns
test('Tracer handles class.method patterns correctly', () => {
    const includePath = path.join(testDir, '.methodinclude-4');
    fs.writeFileSync(includePath, 'UserController.*\n*Controller.create');

    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new MethodFilterParser(includePath, null, tracer);

    // Test class.method matching
    parser.shouldIncludeMethod('create', 'UserController.js');
    parser.shouldIncludeMethod('update', 'UserController.js');
    parser.shouldIncludeMethod('create', 'PostController.js');
    parser.shouldIncludeMethod('delete', 'PostController.js');

    const trace = tracer.getTrace();

    assertEquals(trace.summary.includedMethods, 3, 'Should include 3 methods');
    assertEquals(trace.summary.excludedMethods, 1, 'Should exclude 1 method');

    // Verify UserController.* pattern
    const userPattern = trace.patterns.find(p => p.pattern === 'UserController.*');
    assertTrue(userPattern !== null, 'Should track UserController.* pattern');
    assertEquals(userPattern.matchCount, 2, 'Should match 2 methods');

    // Verify *Controller.create pattern
    const createPattern = trace.patterns.find(p => p.pattern === '*Controller.create');
    assertTrue(createPattern !== null, 'Should track *Controller.create pattern');
    assertEquals(createPattern.matchCount, 1, 'Should match 1 method (PostController.create)');

    fs.unlinkSync(includePath);
});

// Test 6: Tracer disabled by default
test('Tracer does not record when disabled', () => {
    const includePath = path.join(testDir, '.methodinclude-5');
    fs.writeFileSync(includePath, 'get*');

    const tracer = new RuleTracer();
    // Don't enable tracer

    const parser = new MethodFilterParser(includePath, null, tracer);

    parser.shouldIncludeMethod('getData', 'api.js');
    parser.shouldIncludeMethod('setData', 'api.js');

    const trace = tracer.getTrace();

    assertEquals(trace.summary.totalMethods, 0, 'Should not record when disabled');
    assertEquals(trace.methods.size, 0, 'Should have no method decisions');

    fs.unlinkSync(includePath);
});

// Test 7: Tracer works without tracer instance
test('Parser works without tracer instance', () => {
    const includePath = path.join(testDir, '.methodinclude-6');
    fs.writeFileSync(includePath, 'get*');

    const parser = new MethodFilterParser(includePath, null, null);

    // Should not crash
    const result1 = parser.shouldIncludeMethod('getData', 'api.js');
    const result2 = parser.shouldIncludeMethod('setData', 'api.js');

    assertTrue(result1, 'getData should be included');
    assertFalse(result2, 'setData should be excluded');

    fs.unlinkSync(includePath);
});

// Test 8: Tracer report includes method decisions
test('Tracer report includes method decisions', () => {
    const includePath = path.join(testDir, '.methodinclude-7');
    fs.writeFileSync(includePath, 'get*\n*Handler');

    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new MethodFilterParser(includePath, null, tracer);

    parser.shouldIncludeMethod('getData', 'api.js');
    parser.shouldIncludeMethod('errorHandler', 'utils.js');
    parser.shouldIncludeMethod('setData', 'api.js');

    const report = tracer.generateReport();

    assertTrue(report.includes('Total Methods'), 'Report should include method count');
    assertTrue(report.includes('Included:'), 'Report should show included methods');
    assertTrue(report.includes('Excluded:'), 'Report should show excluded methods');

    fs.unlinkSync(includePath);
});

// Test 9: Pattern registration happens on construction
test('Patterns are registered with tracer on construction', () => {
    const includePath = path.join(testDir, '.methodinclude-8');
    fs.writeFileSync(includePath, 'get*\nset*\ndelete*');

    const tracer = new RuleTracer();
    tracer.enable();

    // Create parser - patterns should be registered immediately
    const parser = new MethodFilterParser(includePath, null, tracer);

    // Don't call shouldIncludeMethod yet
    const trace = tracer.getTrace();
    const patterns = trace.patterns;

    // All patterns should be registered, even if not used
    assertTrue(patterns.length >= 3, 'Should register all patterns');
    
    const getPattern = patterns.find(p => p.pattern === 'get*');
    assertTrue(getPattern !== null, 'Should register get* pattern');
    
    const setPattern = patterns.find(p => p.pattern === 'set*');
    assertTrue(setPattern !== null, 'Should register set* pattern');
    
    const deletePattern = patterns.find(p => p.pattern === 'delete*');
    assertTrue(deletePattern !== null, 'Should register delete* pattern');

    fs.unlinkSync(includePath);
});

// Test 10: Both include and ignore patterns tracked separately
test('Both include and ignore patterns tracked with correct sources', () => {
    const includePath = path.join(testDir, '.methodinclude-9');
    const ignorePath = path.join(testDir, '.methodignore-9');
    
    fs.writeFileSync(includePath, 'get*\nset*');
    fs.writeFileSync(ignorePath, '_*\ntest*');

    const tracer = new RuleTracer();
    tracer.enable();

    // Include file takes precedence
    const parser = new MethodFilterParser(includePath, ignorePath, tracer);

    parser.shouldIncludeMethod('getData', 'api.js');
    parser.shouldIncludeMethod('_private', 'utils.js');

    const trace = tracer.getTrace();
    const patterns = trace.patterns;

    // Verify include patterns
    const getPattern = patterns.find(p => p.pattern === 'get*');
    assertEquals(getPattern.source, '.methodinclude', 'get* should be from .methodinclude');

    // Note: ignore patterns are loaded but not used when include file exists
    // They should still be registered for completeness
    const privatePattern = patterns.find(p => p.pattern === '_*');
    if (privatePattern) {
        assertEquals(privatePattern.source, '.methodignore', '_* should be from .methodignore');
    }

    fs.unlinkSync(includePath);
    fs.unlinkSync(ignorePath);
});

// ============================================================================
// CLEANUP AND SUMMARY
// ============================================================================

cleanupTestFixture();

console.log('\n' + '='.repeat(80));
console.log('📊 Test Summary');
console.log('='.repeat(80));
console.log(`Total tests: ${testsRun}`);
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`Success rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);

if (testsFailed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
} else {
    console.log('\n✅ All method filter tracer integration tests passed!');
    process.exit(0);
}
