#!/usr/bin/env node

/**
 * Phase 1 Integration Tests
 * Tests cross-feature integration between Preset System, Token Budget Fitter, and Rule Tracer
 */

import { PresetManager } from '../lib/presets/preset-manager.js';
import { TokenBudgetFitter } from '../lib/optimizers/token-budget-fitter.js';
import { RuleTracer } from '../lib/debug/rule-tracer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test utilities
let testCount = 0;
let passedCount = 0;
let failedCount = 0;

function test(name, fn) {
    testCount++;
    try {
        fn();
        passedCount++;
        console.log(`✅ ${name}`);
    } catch (error) {
        failedCount++;
        console.error(`❌ ${name}`);
        console.error(`   ${error.message}`);
        if (error.stack) {
            console.error(`   ${error.stack.split('\n').slice(1, 3).join('\n')}`);
        }
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function assertNotNull(value, message) {
    if (value === null || value === undefined) {
        throw new Error(message || 'Value is null or undefined');
    }
}

function assertTrue(condition, message) {
    if (!condition) {
        throw new Error(message || 'Expected true, got false');
    }
}

// Test suite
console.log('🧪 Phase 1 Integration Tests');
console.log('═'.repeat(70));
console.log();

// Test 1: Preset System + Rule Tracer Integration
console.log('📦 Test Suite: Preset System + Rule Tracer Integration');
console.log('-'.repeat(70));

test('RuleTracer can record preset application', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const mockPreset = {
        id: 'test-preset',
        name: 'Test Preset',
        description: 'A test preset',
        icon: '🧪',
        filters: {
            include: ['*.js'],
            exclude: ['node_modules/**']
        },
        options: {
            methodLevel: true
        },
        metadata: {
            bestFor: ['testing']
        }
    };

    tracer.recordPresetApplication(mockPreset);

    const json = tracer.exportJSON();
    assertNotNull(json.preset, 'Preset should be recorded');
    assertEquals(json.preset.id, 'test-preset', 'Preset ID should match');
    assertEquals(json.preset.name, 'Test Preset', 'Preset name should match');
});

test('RuleTracer includes preset info in report', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const mockPreset = {
        id: 'review',
        name: 'Code Review',
        description: 'Optimized for code review',
        icon: '👀',
        filters: {
            include: ['src/**/*.js'],
            exclude: ['test/**']
        },
        options: {},
        metadata: {
            bestFor: ['code review', 'pull requests']
        }
    };

    tracer.recordPresetApplication(mockPreset);
    tracer.recordFileDecision('src/index.js', {
        included: true,
        reason: 'Matched preset include pattern',
        rule: 'src/**/*.js',
        ruleSource: 'preset:review'
    });

    const report = tracer.generateReport();
    assertTrue(report.includes('Applied Preset'), 'Report should mention preset');
    assertTrue(report.includes('Code Review'), 'Report should include preset name');
    assertTrue(report.includes('code review'), 'Report should include best-for info');
});

test('PresetManager can pass tracer to applyPreset', () => {
    const tempDir = fs.mkdtempSync(path.join(__dirname, 'test-preset-tracer-'));
    
    try {
        const presetsPath = path.join(tempDir, 'presets.json');
        fs.writeFileSync(presetsPath, JSON.stringify({
            presets: [{
                id: 'minimal',
                name: 'Minimal',
                description: 'Minimal preset',
                filters: {
                    include: ['*.js']
                },
                options: {}
            }]
        }));

        const manager = new PresetManager(presetsPath);
        const tracer = new RuleTracer();
        tracer.enable();

        const applied = manager.applyPreset('minimal', tempDir, tracer);
        
        assertNotNull(applied, 'Preset should be applied');
        
        const json = tracer.exportJSON();
        assertNotNull(json.preset, 'Tracer should have preset info');
        assertEquals(json.preset.id, 'minimal', 'Preset ID should match');

        // Cleanup
        manager.cleanup(applied);
    } finally {
        // Cleanup temp directory
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

console.log();

// Test 2: Token Budget Fitter + Rule Tracer Integration
console.log('📦 Test Suite: Token Budget Fitter + Rule Tracer Integration');
console.log('-'.repeat(70));

test('TokenBudgetFitter can record fitting decisions in tracer', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const mockFiles = [
        { relativePath: 'src/index.js', tokens: 1000, importance: 80 },
        { relativePath: 'src/utils.js', tokens: 500, importance: 60 },
        { relativePath: 'test/test.js', tokens: 800, importance: 20 },
        { relativePath: 'docs/README.md', tokens: 300, importance: 10 }
    ];

    const fitter = new TokenBudgetFitter(1600, 'top-n');
    const result = fitter.fitToWindow(mockFiles, { ruleTracer: tracer });

    assertNotNull(result, 'Fit result should exist');
    assertTrue(result.files.length > 0, 'Should have included files');
    assertTrue(result.excluded.length > 0, 'Should have excluded files');

    const json = tracer.exportJSON();
    assertTrue(json.fittingDecisions.length > 0, 'Should have fitting decisions');
    
    // Check for strategy decision
    const strategyDecision = json.fittingDecisions.find(d => d.type === 'strategy');
    assertNotNull(strategyDecision, 'Should have strategy decision');
    assertEquals(strategyDecision.strategy, 'top-n', 'Strategy should match');
});

test('RuleTracer includes fitting info in report', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const mockFiles = [
        { relativePath: 'src/main.js', tokens: 2000, importance: 90, isEntryPoint: true },
        { relativePath: 'src/helper.js', tokens: 1000, importance: 50 },
        { relativePath: 'test/test.js', tokens: 1500, importance: 30 }
    ];

    const fitter = new TokenBudgetFitter(2500, 'balanced');
    fitter.fitToWindow(mockFiles, { ruleTracer: tracer });

    const report = tracer.generateReport();
    assertTrue(report.includes('Token Budget Fitting'), 'Report should mention fitting');
    assertTrue(report.includes('Strategy:'), 'Report should show strategy');
    assertTrue(report.includes('Reduction:'), 'Report should show reduction');
});

test('Fitting decisions show importance scores', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const mockFiles = [
        { relativePath: 'important.js', tokens: 1000, importance: 95 },
        { relativePath: 'less-important.js', tokens: 800, importance: 30 }
    ];

    const fitter = new TokenBudgetFitter(1200, 'top-n');
    fitter.fitToWindow(mockFiles, { ruleTracer: tracer });

    const json = tracer.exportJSON();
    const fileDecisions = json.fittingDecisions.filter(d => 
        d.type === 'file-included' || d.type === 'file-excluded'
    );

    assertTrue(fileDecisions.length > 0, 'Should have file decisions');
    assertTrue(fileDecisions.every(d => d.importance !== undefined), 
        'All file decisions should have importance scores');
});

test('Exclusion reasons are recorded', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    const mockFiles = [
        { relativePath: 'src/core.js', tokens: 1000, importance: 80 },
        { relativePath: 'test/test.js', tokens: 500, importance: 25 },
        { relativePath: 'docs/README.md', tokens: 300, importance: 15, extension: '.md' }
    ];

    const fitter = new TokenBudgetFitter(1100, 'top-n');
    fitter.fitToWindow(mockFiles, { ruleTracer: tracer });

    const json = tracer.exportJSON();
    const excluded = json.fittingDecisions.filter(d => d.type === 'file-excluded');

    assertTrue(excluded.length > 0, 'Should have excluded files');
    assertTrue(excluded.every(d => d.reason), 'All excluded files should have reasons');
});

console.log();

// Test 3: Full Integration (Preset + Token Budget + Tracer)
console.log('📦 Test Suite: Full Integration (All Three Features)');
console.log('-'.repeat(70));

test('All three features work together', () => {
    const tempDir = fs.mkdtempSync(path.join(__dirname, 'test-full-integration-'));
    
    try {
        // Setup preset
        const presetsPath = path.join(tempDir, 'presets.json');
        fs.writeFileSync(presetsPath, JSON.stringify({
            presets: [{
                id: 'test-full',
                name: 'Full Test',
                description: 'Full integration test',
                filters: {
                    include: ['src/**/*.js'],
                    exclude: ['test/**']
                },
                options: {
                    targetTokens: 5000,
                    fitStrategy: 'balanced'
                }
            }]
        }));

        // Initialize components
        const manager = new PresetManager(presetsPath);
        const tracer = new RuleTracer();
        tracer.enable();

        // Apply preset with tracer
        const applied = manager.applyPreset('test-full', tempDir, tracer);
        assertNotNull(applied, 'Preset should be applied');

        // Simulate token budget fitting with tracer
        const mockFiles = [
            { relativePath: 'src/index.js', tokens: 2000, importance: 90 },
            { relativePath: 'src/utils.js', tokens: 1500, importance: 70 },
            { relativePath: 'src/helper.js', tokens: 1200, importance: 60 },
            { relativePath: 'src/config.js', tokens: 800, importance: 50 }
        ];

        const fitter = new TokenBudgetFitter(4000, 'balanced');
        const result = fitter.fitToWindow(mockFiles, { ruleTracer: tracer });

        assertNotNull(result, 'Fit result should exist');

        // Verify tracer has all information
        const json = tracer.exportJSON();
        assertNotNull(json.preset, 'Should have preset info');
        assertTrue(json.fittingDecisions.length > 0, 'Should have fitting decisions');

        // Generate report
        const report = tracer.generateReport();
        assertTrue(report.includes('Applied Preset'), 'Report should show preset');
        assertTrue(report.includes('Token Budget Fitting'), 'Report should show fitting');
        assertTrue(report.includes('Full Test'), 'Report should show preset name');

        // Cleanup
        manager.cleanup(applied);
    } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
});

test('Tracer can be cleared and reused', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    // First use
    tracer.recordPresetApplication({
        id: 'first',
        name: 'First',
        description: 'First preset',
        filters: {},
        options: {}
    });

    tracer.recordFittingDecision({
        type: 'strategy',
        strategy: 'balanced',
        targetTokens: 1000,
        actualTokens: 900,
        reduction: 100,
        reductionPercent: 10
    });

    let json = tracer.exportJSON();
    assertNotNull(json.preset, 'Should have first preset');
    assertTrue(json.fittingDecisions.length > 0, 'Should have first fitting decisions');

    // Clear
    tracer.clear();

    // Second use
    tracer.recordPresetApplication({
        id: 'second',
        name: 'Second',
        description: 'Second preset',
        filters: {},
        options: {}
    });

    json = tracer.exportJSON();
    assertEquals(json.preset.id, 'second', 'Should have second preset');
    assertEquals(json.fittingDecisions.length, 0, 'Fitting decisions should be cleared');
});

test('Tracer export includes all integration data', () => {
    const tracer = new RuleTracer();
    tracer.enable();

    // Add preset
    tracer.recordPresetApplication({
        id: 'export-test',
        name: 'Export Test',
        description: 'Test export',
        filters: { include: ['*.js'] },
        options: {},
        metadata: { bestFor: ['testing'] }
    });

    // Add file decisions
    tracer.recordFileDecision('file1.js', {
        included: true,
        reason: 'Matched pattern',
        rule: '*.js'
    });

    // Add fitting decisions
    tracer.recordFittingDecision({
        type: 'strategy',
        strategy: 'top-n',
        targetTokens: 1000,
        actualTokens: 950,
        reduction: 50,
        reductionPercent: 5
    });

    const json = tracer.exportJSON();

    // Verify all data is present
    assertNotNull(json.summary, 'Should have summary');
    assertNotNull(json.preset, 'Should have preset');
    assertNotNull(json.fittingDecisions, 'Should have fitting decisions');
    assertNotNull(json.files, 'Should have files');
    assertNotNull(json.patterns, 'Should have patterns');

    assertEquals(json.preset.id, 'export-test', 'Preset should match');
    assertTrue(json.files.length > 0, 'Should have file decisions');
    assertTrue(json.fittingDecisions.length > 0, 'Should have fitting decisions');
});

console.log();

// Summary
console.log('═'.repeat(70));
console.log('📊 TEST SUMMARY');
console.log('═'.repeat(70));
console.log(`Total tests: ${testCount}`);
console.log(`✅ Passed: ${passedCount}`);
console.log(`❌ Failed: ${failedCount}`);
console.log(`Success rate: ${((passedCount / testCount) * 100).toFixed(1)}%`);
console.log('═'.repeat(70));

if (failedCount > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
} else {
    console.log('\n✅ All integration tests passed!');
    process.exit(0);
}
