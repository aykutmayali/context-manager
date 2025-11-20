#!/usr/bin/env node

/**
 * Demo: Phase 1 Integration
 * Demonstrates how Preset System, Token Budget Fitter, and Rule Tracer work together
 */

import { PresetManager } from './lib/presets/preset-manager.js';
import { TokenBudgetFitter } from './lib/optimizers/token-budget-fitter.js';
import { RuleTracer } from './lib/debug/rule-tracer.js';

console.log('🎯 Phase 1 Integration Demo');
console.log('═'.repeat(80));
console.log();

// Step 1: Initialize components
console.log('📦 Step 1: Initialize Components');
console.log('-'.repeat(80));

const tracer = new RuleTracer();
tracer.enable();
console.log('✅ RuleTracer initialized and enabled');

const manager = new PresetManager();
console.log('✅ PresetManager initialized');

console.log();

// Step 2: Apply a preset with tracer
console.log('📦 Step 2: Apply Preset with Tracer');
console.log('-'.repeat(80));

const presetInfo = manager.getPresetInfo('review');
console.log(`Applying preset: ${presetInfo.icon} ${presetInfo.name}`);
console.log(`Description: ${presetInfo.description}`);

// Note: We'll simulate this without actually creating files
tracer.recordPresetApplication(presetInfo);
console.log('✅ Preset application recorded in tracer');

console.log();

// Step 3: Simulate file scanning with decisions
console.log('📦 Step 3: Record File Decisions');
console.log('-'.repeat(80));

const fileDecisions = [
    { file: 'src/index.js', included: true, reason: 'Entry point', rule: 'src/**/*.js' },
    { file: 'src/utils.js', included: true, reason: 'Matched include pattern', rule: 'src/**/*.js' },
    { file: 'test/test.js', included: false, reason: 'Matched exclude pattern', rule: 'test/**' },
    { file: 'docs/README.md', included: false, reason: 'Documentation file', rule: 'docs/**' }
];

for (const decision of fileDecisions) {
    tracer.recordFileDecision(decision.file, {
        included: decision.included,
        reason: decision.reason,
        rule: decision.rule,
        ruleSource: 'preset:review'
    });
}

console.log(`✅ Recorded ${fileDecisions.length} file decisions`);
console.log();

// Step 4: Apply token budget fitting with tracer
console.log('📦 Step 4: Apply Token Budget Fitting with Tracer');
console.log('-'.repeat(80));

const mockFiles = [
    { relativePath: 'src/index.js', tokens: 2500, importance: 95, isEntryPoint: true },
    { relativePath: 'src/utils.js', tokens: 1800, importance: 75 },
    { relativePath: 'src/api/routes.js', tokens: 2200, importance: 80 },
    { relativePath: 'src/api/handlers.js', tokens: 1900, importance: 70 },
    { relativePath: 'src/config.js', tokens: 800, importance: 60 },
    { relativePath: 'src/helpers/format.js', tokens: 600, importance: 50 },
    { relativePath: 'src/helpers/validate.js', tokens: 700, importance: 55 }
];

const targetTokens = 7000;
const strategy = 'balanced';

console.log(`Target: ${targetTokens} tokens`);
console.log(`Strategy: ${strategy}`);
console.log(`Files to fit: ${mockFiles.length}`);
console.log(`Total tokens: ${mockFiles.reduce((sum, f) => sum + f.tokens, 0)}`);

const fitter = new TokenBudgetFitter(targetTokens, strategy);
const result = fitter.fitToWindow(mockFiles, { 
    ruleTracer: tracer,
    preserveEntryPoints: true 
});

console.log(`✅ Fit complete: ${result.files.length} files included, ${result.excluded.length} excluded`);
console.log(`   Actual tokens: ${result.totalTokens}`);
console.log(`   Reduction: ${result.reduction} tokens (${result.reductionPercent.toFixed(1)}%)`);

console.log();

// Step 5: Generate comprehensive trace report
console.log('📦 Step 5: Generate Comprehensive Trace Report');
console.log('-'.repeat(80));

const report = tracer.generateReport();
console.log(report);

// Step 6: Export trace data as JSON
console.log('📦 Step 6: Export Trace Data');
console.log('-'.repeat(80));

const json = tracer.exportJSON();
console.log('Exported trace data includes:');
console.log(`  • Preset: ${json.preset ? json.preset.name : 'none'}`);
console.log(`  • File decisions: ${json.files.length}`);
console.log(`  • Fitting decisions: ${json.fittingDecisions.length}`);
console.log(`  • Pattern analysis: ${json.patterns.length} patterns`);
console.log(`  • Summary: ${json.summary.includedFiles}/${json.summary.totalFiles} files included`);

console.log();
console.log('═'.repeat(80));
console.log('✅ Demo complete! All three features working together seamlessly.');
console.log('═'.repeat(80));
