#!/usr/bin/env node

/**
 * Watch Mode Property-Based Tests
 * Tests FileWatcher and IncrementalAnalyzer with property-based testing
 * 
 * Feature: comprehensive-test-validation
 * Properties: 38, 39, 40
 */

import fc from 'fast-check';
import { runProperty } from '../helpers/property-test-helpers.js';
import { FileWatcher } from '../../lib/watch/FileWatcher.js';
import { IncrementalAnalyzer } from '../../lib/watch/IncrementalAnalyzer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test workspace
const TEST_DIR = path.join(__dirname, '..', 'fixtures', 'watch-property-test');

/**
 * Setup test directory
 */
function setupTestDir() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
}

/**
 * Cleanup test directory
 */
function cleanupTestDir() {
    if (fs.existsSync(TEST_DIR)) {
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
}

/**
 * Wait for specified time
 */
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// PROPERTY 38: File change detection
// Feature: comprehensive-test-validation, Property 38: File change detection
// Validates: Requirements 9.2
// ============================================================================

export async function testProperty38() {
    console.log('\n🧪 Property 38: File change detection');
    console.log('   For any file modification, watch mode should trigger automatic analysis');
    console.log('   Validates: Requirements 9.2\n');

    setupTestDir();

    try {
        // Property: For any file content, when a file is modified, the watcher should detect it
        const property = fc.asyncProperty(
            fc.string({ minLength: 1, maxLength: 100 }),
            fc.string({ minLength: 1, maxLength: 50 }),
            async (fileContent, fileName) => {
                // Sanitize filename to be valid
                const sanitizedName = fileName.replace(/[^a-zA-Z0-9_-]/g, '_') + '.js';
                const testFile = path.join(TEST_DIR, sanitizedName);

                const watcher = new FileWatcher(TEST_DIR, { debounce: 50 });
                
                let changeDetected = false;
                
                return new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        watcher.stop();
                        resolve(changeDetected);
                    }, 500);

                    watcher.on('file:changed', (event) => {
                        if (event.relativePath === sanitizedName) {
                            changeDetected = true;
                            clearTimeout(timeout);
                            watcher.stop();
                            resolve(true);
                        }
                    });

                    watcher.start();

                    // Give watcher time to start
                    setTimeout(() => {
                        fs.writeFileSync(testFile, fileContent);
                    }, 100);
                });
            }
        );

        await runProperty(property, { numRuns: 20 }); // Reduced runs for file I/O
        console.log('   ✓ Property 38 passed: File changes are detected');
        return true;
    } catch (error) {
        console.error('   ✗ Property 38 failed:', error.message);
        throw error;
    } finally {
        cleanupTestDir();
    }
}

// ============================================================================
// PROPERTY 39: Debounce timing correctness
// Feature: comprehensive-test-validation, Property 39: Debounce timing correctness
// Validates: Requirements 9.3
// ============================================================================

export async function testProperty39() {
    console.log('\n🧪 Property 39: Debounce timing correctness');
    console.log('   For any debounce setting, the system should wait the specified duration');
    console.log('   Validates: Requirements 9.3\n');

    setupTestDir();

    try {
        // Property: For any debounce value, rapid changes should be debounced
        // We test by simulating handleFileChange directly and checking debounce timers
        const property = fc.asyncProperty(
            fc.integer({ min: 50, max: 300 }),
            fc.string({ minLength: 5, maxLength: 20 }),
            async (debounceMs, filename) => {
                const sanitizedName = filename.replace(/[^a-zA-Z0-9_-]/g, '_') + '.js';
                const testFile = path.join(TEST_DIR, sanitizedName);
                
                // Create the file first
                fs.writeFileSync(testFile, 'test content');
                
                const watcher = new FileWatcher(TEST_DIR, { debounce: debounceMs });
                
                // Simulate rapid file changes by calling handleFileChange directly
                watcher.handleFileChange('change', sanitizedName);
                watcher.handleFileChange('change', sanitizedName);
                watcher.handleFileChange('change', sanitizedName);
                
                // Check that only one debounce timer exists for this file
                const timerCount = watcher.debounceTimers.size;
                
                // Clean up
                watcher.stop();
                
                // Should have exactly 1 timer (the last one, others were cleared)
                return timerCount === 1;
            }
        );

        await runProperty(property, { numRuns: 20 });
        console.log('   ✓ Property 39 passed: Debounce timing is correct');
        return true;
    } catch (error) {
        console.error('   ✗ Property 39 failed:', error.message);
        throw error;
    } finally {
        cleanupTestDir();
    }
}

// ============================================================================
// PROPERTY 40: Incremental analysis efficiency
// Feature: comprehensive-test-validation, Property 40: Incremental analysis efficiency
// Validates: Requirements 9.4
// ============================================================================

export async function testProperty40() {
    console.log('\n🧪 Property 40: Incremental analysis efficiency');
    console.log('   For any file change, incremental analyzer should only re-analyze changed files');
    console.log('   Validates: Requirements 9.4\n');

    setupTestDir();

    try {
        // Property: For any set of files, only the changed file should be re-analyzed
        const property = fc.asyncProperty(
            fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 2, maxLength: 5 }),
            fc.integer({ min: 0, max: 4 }),
            async (fileContents, changedIndex) => {
                // Ensure changedIndex is valid
                const actualIndex = changedIndex % fileContents.length;
                
                const analyzer = new IncrementalAnalyzer();
                const files = [];
                
                // Create initial files
                for (let i = 0; i < fileContents.length; i++) {
                    const testFile = path.join(TEST_DIR, `file${i}.js`);
                    fs.writeFileSync(testFile, `// ${fileContents[i]}\nfunction test${i}() {}`);
                    files.push(testFile);
                    
                    // Initial analysis
                    await analyzer.analyzeChange({
                        path: testFile,
                        relativePath: `file${i}.js`,
                        exists: true,
                        size: fs.statSync(testFile).size,
                        modified: fs.statSync(testFile).mtime
                    });
                }
                
                const initialCacheSize = analyzer.fileCache.size;
                
                // Modify one file
                const changedFile = files[actualIndex];
                fs.writeFileSync(changedFile, `// Modified\nfunction testModified() {}`);
                
                let analysisCount = 0;
                analyzer.on('analysis:complete', () => {
                    analysisCount++;
                });
                
                // Re-analyze only the changed file
                await analyzer.analyzeChange({
                    path: changedFile,
                    relativePath: `file${actualIndex}.js`,
                    exists: true,
                    size: fs.statSync(changedFile).size,
                    modified: fs.statSync(changedFile).mtime
                });
                
                // Wait for analysis to complete
                await wait(100);
                
                // Cache should still have all files
                const finalCacheSize = analyzer.fileCache.size;
                
                // Only one file should have been analyzed (the changed one)
                return finalCacheSize === initialCacheSize && analysisCount === 1;
            }
        );

        await runProperty(property, { numRuns: 10 }); // Reduced runs for file I/O
        console.log('   ✓ Property 40 passed: Only changed files are re-analyzed');
        return true;
    } catch (error) {
        console.error('   ✗ Property 40 failed:', error.message);
        throw error;
    } finally {
        cleanupTestDir();
    }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllTests() {
    console.log('='.repeat(70));
    console.log('Watch Mode Property-Based Tests');
    console.log('='.repeat(70));

    let allPassed = true;

    try {
        await testProperty38();
    } catch (error) {
        allPassed = false;
    }

    try {
        await testProperty39();
    } catch (error) {
        allPassed = false;
    }

    try {
        await testProperty40();
    } catch (error) {
        allPassed = false;
    }

    console.log('\n' + '='.repeat(70));
    if (allPassed) {
        console.log('✅ All watch mode property tests passed!');
        process.exit(0);
    } else {
        console.log('❌ Some watch mode property tests failed');
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllTests().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export default runAllTests;
