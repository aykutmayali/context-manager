/**
 * End-to-End Test for Method Filter + RuleTracer Integration
 * Demonstrates complete workflow with real-world scenarios
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import MethodFilterParser from '../lib/parsers/method-filter-parser.js';
import RuleTracer from '../lib/debug/rule-tracer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\n🔍 Method Filter + RuleTracer E2E Integration Test');
console.log('='.repeat(80));

// Setup test directory
const testDir = path.join(__dirname, 'fixtures', 'method-tracer-e2e');
if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
}

try {
    // Scenario 1: API Controller with include patterns
    console.log('\n📋 Scenario 1: API Controller Method Filtering');
    console.log('-'.repeat(80));

    const includeFile = path.join(testDir, '.methodinclude');
    fs.writeFileSync(includeFile, `# API Controller patterns
get*
post*
put*
delete*
*Controller.create
*Controller.update
*Controller.delete
UserService.*
`);

    const tracer = new RuleTracer();
    tracer.enable();

    const parser = new MethodFilterParser(includeFile, null, tracer);

    // Simulate analyzing a REST API codebase
    const methods = [
        { name: 'getData', file: 'ApiController.js' },
        { name: 'postData', file: 'ApiController.js' },
        { name: 'putData', file: 'ApiController.js' },
        { name: 'deleteData', file: 'ApiController.js' },
        { name: 'create', file: 'UserController.js' },
        { name: 'update', file: 'UserController.js' },
        { name: 'delete', file: 'PostController.js' },
        { name: 'authenticate', file: 'UserService.js' },
        { name: 'authorize', file: 'UserService.js' },
        { name: '_privateHelper', file: 'utils.js' },
        { name: 'internalMethod', file: 'internal.js' },
    ];

    console.log('\n🔍 Analyzing methods...');
    methods.forEach(({ name, file }) => {
        const included = parser.shouldIncludeMethod(name, file);
        const icon = included ? '✅' : '❌';
        console.log(`${icon} ${file}:${name}`);
    });

    // Generate trace report
    const trace = tracer.getTrace();
    console.log('\n📊 Analysis Summary:');
    console.log(`   Total Methods: ${trace.summary.totalMethods}`);
    console.log(`   ✅ Included: ${trace.summary.includedMethods}`);
    console.log(`   ❌ Excluded: ${trace.summary.excludedMethods}`);

    console.log('\n🔍 Pattern Usage:');
    trace.patterns.slice(0, 5).forEach(pattern => {
        const status = pattern.matchCount > 0 ? '✓' : '⚠️';
        console.log(`${status} ${pattern.pattern} (${pattern.source})`);
        console.log(`   Matches: ${pattern.matchCount}`);
        if (pattern.examples.length > 0) {
            console.log(`   Examples: ${pattern.examples.slice(0, 3).join(', ')}`);
        }
    });

    // Scenario 2: Test file exclusion
    console.log('\n\n📋 Scenario 2: Test File Method Exclusion');
    console.log('-'.repeat(80));

    const ignoreFile = path.join(testDir, '.methodignore');
    fs.writeFileSync(ignoreFile, `# Exclude test and private methods
test*
_*
*Test
*Mock
setup*
teardown*
`);

    const tracer2 = new RuleTracer();
    tracer2.enable();

    const parser2 = new MethodFilterParser(null, ignoreFile, tracer2);

    const testMethods = [
        { name: 'testUserCreation', file: 'user.test.js' },
        { name: 'testUserDeletion', file: 'user.test.js' },
        { name: '_privateHelper', file: 'utils.js' },
        { name: 'createUser', file: 'user.js' },
        { name: 'deleteUser', file: 'user.js' },
        { name: 'setupDatabase', file: 'setup.js' },
        { name: 'teardownDatabase', file: 'teardown.js' },
        { name: 'mockApiCall', file: 'api.mock.js' },
    ];

    console.log('\n🔍 Analyzing methods...');
    testMethods.forEach(({ name, file }) => {
        const included = parser2.shouldIncludeMethod(name, file);
        const icon = included ? '✅' : '❌';
        console.log(`${icon} ${file}:${name}`);
    });

    const trace2 = tracer2.getTrace();
    console.log('\n📊 Analysis Summary:');
    console.log(`   Total Methods: ${trace2.summary.totalMethods}`);
    console.log(`   ✅ Included: ${trace2.summary.includedMethods}`);
    console.log(`   ❌ Excluded: ${trace2.summary.excludedMethods}`);

    // Scenario 3: Identify unused patterns
    console.log('\n\n📋 Scenario 3: Unused Pattern Detection');
    console.log('-'.repeat(80));

    const includeFile2 = path.join(testDir, '.methodinclude2');
    fs.writeFileSync(includeFile2, `# Comprehensive patterns (some unused)
get*
set*
post*
put*
patch*
delete*
create*
update*
remove*
find*
search*
`);

    const tracer3 = new RuleTracer();
    tracer3.enable();

    const parser3 = new MethodFilterParser(includeFile2, null, tracer3);

    // Only use some patterns
    const limitedMethods = [
        { name: 'getData', file: 'api.js' },
        { name: 'setData', file: 'api.js' },
        { name: 'findUser', file: 'user.js' },
        { name: 'searchPosts', file: 'post.js' },
    ];

    limitedMethods.forEach(({ name, file }) => {
        parser3.shouldIncludeMethod(name, file);
    });

    const trace3 = tracer3.getTrace();
    const unusedPatterns = trace3.patterns.filter(p => p.matchCount === 0);

    console.log('\n⚠️  Unused Patterns:');
    unusedPatterns.forEach(pattern => {
        console.log(`   - ${pattern.pattern} (${pattern.source})`);
    });

    console.log('\n✓ Used Patterns:');
    trace3.patterns.filter(p => p.matchCount > 0).forEach(pattern => {
        console.log(`   - ${pattern.pattern}: ${pattern.matchCount} matches`);
    });

    // Scenario 4: Full trace report
    console.log('\n\n📋 Scenario 4: Complete Trace Report');
    console.log('-'.repeat(80));

    const report = tracer.generateReport();
    console.log(report);

    // Cleanup
    fs.unlinkSync(includeFile);
    fs.unlinkSync(ignoreFile);
    fs.unlinkSync(includeFile2);
    fs.rmSync(testDir, { recursive: true, force: true });

    console.log('\n' + '='.repeat(80));
    console.log('✅ All E2E scenarios completed successfully!');
    console.log('='.repeat(80));

} catch (error) {
    console.error('\n❌ E2E test failed:', error.message);
    console.error(error.stack);
    
    // Cleanup on error
    if (fs.existsSync(testDir)) {
        fs.rmSync(testDir, { recursive: true, force: true });
    }
    
    process.exit(1);
}
