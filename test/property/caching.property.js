/**
 * Property-Based Tests for Caching System
 * Tests caching properties from comprehensive-test-validation spec
 */

import fc from 'fast-check';
import { runProperty } from '../helpers/property-test-helpers.js';
import { CacheManager } from '../../lib/cache/CacheManager.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Property 52: Cache storage correctness
 * Feature: comprehensive-test-validation, Property 52: Cache storage correctness
 * Validates: Requirements 16.1
 * 
 * For any analysis result, caching should store and retrieve the same data
 */
export async function testCacheStorageCorrectness() {
    console.log('\n🧪 Property 52: Cache storage correctness');
    console.log('   Feature: comprehensive-test-validation, Property 52: Cache storage correctness');
    console.log('   Validates: Requirements 16.1');
    
    // Test both memory and disk strategies
    for (const strategy of ['memory', 'disk']) {
        console.log(`   Testing ${strategy} cache...`);
        
        const property = fc.property(
            fc.string({ minLength: 1, maxLength: 100 }), // filePath
            fc.record({
                tokens: fc.nat(10000),
                lines: fc.nat(1000),
                methods: fc.array(fc.string(), { maxLength: 10 })
            }), // analysis data
            fc.nat(Date.now()), // modifiedTime
            (filePath, analysisData, modifiedTime) => {
                // Create cache manager with temp directory for disk cache
                const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));
                const cache = new CacheManager({
                    strategy,
                    path: tempDir,
                    ttl: 3600
                });
                
                try {
                    // Store data in cache
                    cache.set(filePath, analysisData, modifiedTime);
                    
                    // Retrieve data from cache
                    const retrieved = cache.get(filePath, modifiedTime);
                    
                    // Verify data matches
                    const matches = retrieved !== null &&
                        retrieved.tokens === analysisData.tokens &&
                        retrieved.lines === analysisData.lines &&
                        JSON.stringify(retrieved.methods) === JSON.stringify(analysisData.methods);
                    
                    // Cleanup
                    cache.clear();
                    if (strategy === 'disk' && fs.existsSync(tempDir)) {
                        fs.rmSync(tempDir, { recursive: true, force: true });
                    }
                    
                    return matches;
                } catch (error) {
                    // Cleanup on error
                    if (strategy === 'disk' && fs.existsSync(tempDir)) {
                        fs.rmSync(tempDir, { recursive: true, force: true });
                    }
                    throw error;
                }
            }
        );
        
        await runProperty(property, { numRuns: 50 });
        console.log(`   ✓ ${strategy} cache storage is correct`);
    }
}

/**
 * Property 53: Cache hit efficiency
 * Feature: comprehensive-test-validation, Property 53: Cache hit efficiency
 * Validates: Requirements 16.2
 * 
 * For any cached result, retrieval should not trigger re-computation
 */
export async function testCacheHitEfficiency() {
    console.log('\n🧪 Property 53: Cache hit efficiency');
    console.log('   Feature: comprehensive-test-validation, Property 53: Cache hit efficiency');
    console.log('   Validates: Requirements 16.2');
    
    const property = fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // filePath
        fc.record({
            tokens: fc.nat(10000),
            lines: fc.nat(1000)
        }), // analysis data
        fc.nat(Date.now()), // modifiedTime
        (filePath, analysisData, modifiedTime) => {
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));
            const cache = new CacheManager({
                strategy: 'memory',
                path: tempDir,
                ttl: 3600
            });
            
            try {
                // Store data in cache
                cache.set(filePath, analysisData, modifiedTime);
                
                // Get initial stats
                const statsBefore = cache.getStats();
                const hitsBefore = statsBefore.hits;
                const missesBefore = statsBefore.misses;
                
                // Retrieve from cache (should be a hit)
                const retrieved = cache.get(filePath, modifiedTime);
                
                // Get stats after retrieval
                const statsAfter = cache.getStats();
                const hitsAfter = statsAfter.hits;
                const missesAfter = statsAfter.misses;
                
                // Verify:
                // 1. Data was retrieved successfully
                // 2. Hits increased by 1
                // 3. Misses did not increase
                const isEfficient = retrieved !== null &&
                    hitsAfter === hitsBefore + 1 &&
                    missesAfter === missesBefore;
                
                // Cleanup
                cache.clear();
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                }
                
                return isEfficient;
            } catch (error) {
                // Cleanup on error
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                }
                throw error;
            }
        }
    );
    
    await runProperty(property, { numRuns: 50 });
    console.log('   ✓ Cache hits do not trigger re-computation');
}

/**
 * Property 54: Cache invalidation correctness
 * Feature: comprehensive-test-validation, Property 54: Cache invalidation correctness
 * Validates: Requirements 16.3
 * 
 * For any cache invalidation, old results should be removed
 */
export async function testCacheInvalidationCorrectness() {
    console.log('\n🧪 Property 54: Cache invalidation correctness');
    console.log('   Feature: comprehensive-test-validation, Property 54: Cache invalidation correctness');
    console.log('   Validates: Requirements 16.3');
    
    // Test invalidation by file modification
    const modificationProperty = fc.property(
        fc.string({ minLength: 1, maxLength: 100 }), // filePath
        fc.record({
            tokens: fc.nat(10000),
            lines: fc.nat(1000)
        }), // analysis data
        fc.nat(1000000, Date.now() - 10000), // initial modifiedTime
        (filePath, analysisData, initialModifiedTime) => {
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));
            const cache = new CacheManager({
                strategy: 'memory',
                path: tempDir,
                ttl: 3600
            });
            
            try {
                // Store data in cache with initial modified time
                cache.set(filePath, analysisData, initialModifiedTime);
                
                // Verify it's cached
                const cached = cache.get(filePath, initialModifiedTime);
                if (cached === null) {
                    throw new Error('Failed to cache data initially');
                }
                
                // Simulate file modification (newer timestamp)
                const newerModifiedTime = initialModifiedTime + 1000;
                
                // Try to get with newer modified time (should miss due to invalidation)
                const afterModification = cache.get(filePath, newerModifiedTime);
                
                // Verify cache was invalidated
                const wasInvalidated = afterModification === null;
                
                // Cleanup
                cache.clear();
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                }
                
                return wasInvalidated;
            } catch (error) {
                // Cleanup on error
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                }
                throw error;
            }
        }
    );
    
    await runProperty(modificationProperty, { numRuns: 50 });
    console.log('   ✓ Cache invalidates on file modification');
    
    // Test explicit clear
    const clearProperty = fc.property(
        fc.array(
            fc.record({
                filePath: fc.string({ minLength: 1, maxLength: 100 }),
                data: fc.record({
                    tokens: fc.nat(10000)
                }),
                modifiedTime: fc.nat(Date.now())
            }),
            { minLength: 1, maxLength: 10 }
        ),
        (entries) => {
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));
            const cache = new CacheManager({
                strategy: 'memory',
                path: tempDir,
                ttl: 3600
            });
            
            try {
                // Store multiple entries
                for (const entry of entries) {
                    cache.set(entry.filePath, entry.data, entry.modifiedTime);
                }
                
                // Clear cache
                cache.clear();
                
                // Verify all entries are gone
                let allCleared = true;
                for (const entry of entries) {
                    const retrieved = cache.get(entry.filePath, entry.modifiedTime);
                    if (retrieved !== null) {
                        allCleared = false;
                        break;
                    }
                }
                
                // Cleanup
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                }
                
                return allCleared;
            } catch (error) {
                // Cleanup on error
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                }
                throw error;
            }
        }
    );
    
    await runProperty(clearProperty, { numRuns: 50 });
    console.log('   ✓ Cache clear removes all entries');
}

/**
 * Property 55: Parallel processing correctness
 * Feature: comprehensive-test-validation, Property 55: Parallel processing correctness
 * Validates: Requirements 16.4
 * 
 * For any set of files, parallel processing should produce the same results as sequential processing
 * This tests that the cache is safe for concurrent access and produces consistent results
 */
export async function testParallelProcessingCorrectness() {
    console.log('\n🧪 Property 55: Parallel processing correctness');
    console.log('   Feature: comprehensive-test-validation, Property 55: Parallel processing correctness');
    console.log('   Validates: Requirements 16.4');
    
    // Generator for realistic file paths
    const filePathArbitrary = fc.stringOf(
        fc.constantFrom(
            'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
            'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
            '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
            '-', '_', '.', '/'
        ),
        { minLength: 3, maxLength: 50 }
    );
    
    const property = fc.property(
        fc.uniqueArray(
            fc.record({
                filePath: filePathArbitrary,
                data: fc.record({
                    tokens: fc.nat(10000),
                    lines: fc.nat(1000),
                    methods: fc.array(fc.string(), { maxLength: 5 })
                }),
                // Use realistic modification times (> 0, as 0 is not a valid file timestamp)
                modifiedTime: fc.integer({ min: 1, max: Date.now() })
            }),
            { 
                minLength: 2, 
                maxLength: 10,
                selector: (entry) => entry.filePath // Ensure unique file paths
            }
        ),
        async (entries) => {
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));
            
            try {
                // Test 1: Sequential cache operations
                const seqCache = new CacheManager({
                    strategy: 'memory',
                    path: tempDir,
                    ttl: 3600
                });
                
                const sequentialResults = new Map();
                for (const entry of entries) {
                    seqCache.set(entry.filePath, entry.data, entry.modifiedTime);
                }
                // Small delay to ensure cache writes complete
                await new Promise(resolve => setTimeout(resolve, 10));
                for (const entry of entries) {
                    const retrieved = seqCache.get(entry.filePath, entry.modifiedTime);
                    sequentialResults.set(entry.filePath, retrieved);
                }
                
                // Test 2: Parallel cache operations (simulated with Promise.all)
                const parCache = new CacheManager({
                    strategy: 'memory',
                    path: tempDir + '-par',
                    ttl: 3600
                });
                
                // Set all entries in parallel
                await Promise.all(entries.map(entry => 
                    Promise.resolve(parCache.set(entry.filePath, entry.data, entry.modifiedTime))
                ));
                
                // Small delay to ensure cache writes complete
                await new Promise(resolve => setTimeout(resolve, 10));
                
                // Get all entries in parallel
                const parallelGets = await Promise.all(entries.map(entry =>
                    Promise.resolve({
                        filePath: entry.filePath,
                        retrieved: parCache.get(entry.filePath, entry.modifiedTime)
                    })
                ));
                
                const parallelResults = new Map(
                    parallelGets.map(r => [r.filePath, r.retrieved])
                );
                
                // Compare results - all entries should be retrievable in both cases
                let resultsMatch = true;
                for (const entry of entries) {
                    const seqResult = sequentialResults.get(entry.filePath);
                    const parResult = parallelResults.get(entry.filePath);
                    
                    // Both should have successfully cached and retrieved the data
                    if (!seqResult || !parResult) {
                        // Debug: Log which result is missing
                        if (!seqResult && !parResult) {
                            console.error(`DEBUG: Both results missing for ${entry.filePath}`);
                        } else if (!seqResult) {
                            console.error(`DEBUG: Sequential result missing for ${entry.filePath}`);
                        } else {
                            console.error(`DEBUG: Parallel result missing for ${entry.filePath}`);
                        }
                        resultsMatch = false;
                        break;
                    }
                    
                    // Data should match
                    if (JSON.stringify(seqResult) !== JSON.stringify(parResult)) {
                        console.error(`DEBUG: Data mismatch for ${entry.filePath}`);
                        console.error(`  Sequential:`, JSON.stringify(seqResult));
                        console.error(`  Parallel:`, JSON.stringify(parResult));
                        resultsMatch = false;
                        break;
                    }
                }
                
                // Cleanup
                seqCache.clear();
                parCache.clear();
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                }
                if (fs.existsSync(tempDir + '-par')) {
                    fs.rmSync(tempDir + '-par', { recursive: true, force: true });
                }
                
                return resultsMatch;
            } catch (error) {
                // Cleanup on error
                if (fs.existsSync(tempDir)) {
                    fs.rmSync(tempDir, { recursive: true, force: true });
                }
                if (fs.existsSync(tempDir + '-par')) {
                    fs.rmSync(tempDir + '-par', { recursive: true, force: true });
                }
                throw error;
            }
        }
    );
    
    await runProperty(property, { numRuns: 30 });
    console.log('   ✓ Parallel processing produces same results as sequential');
}

// Export all tests
export default async function runAllCachingProperties() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 Caching System Property-Based Tests');
    console.log('='.repeat(80));
    
    await testCacheStorageCorrectness();
    await testCacheHitEfficiency();
    await testCacheInvalidationCorrectness();
    await testParallelProcessingCorrectness();
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ All caching property tests passed!');
    console.log('='.repeat(80) + '\n');
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllCachingProperties().catch(error => {
        console.error('❌ Property tests failed:', error);
        process.exit(1);
    });
}
