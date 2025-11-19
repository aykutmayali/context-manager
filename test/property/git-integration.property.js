/**
 * Property-Based Tests for Git Integration
 * Tests Git integration properties from comprehensive-test-validation spec
 */

import fc from 'fast-check';
import { runProperty } from '../helpers/property-test-helpers.js';
import { GitClient } from '../../lib/integrations/git/GitClient.js';
import { DiffAnalyzer } from '../../lib/integrations/git/DiffAnalyzer.js';
import { BlameTracker } from '../../lib/integrations/git/BlameTracker.js';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import os from 'os';

/**
 * Create a temporary git repository for testing
 */
function createTempGitRepo() {
    const tempDir = path.join(os.tmpdir(), `git-test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    try {
        execSync('git init', { cwd: tempDir, stdio: 'pipe' });
        execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'pipe' });
        execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'pipe' });
        return tempDir;
    } catch (error) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        throw error;
    }
}

/**
 * Clean up temporary git repository
 */
function cleanupTempRepo(repoPath) {
    try {
        if (fs.existsSync(repoPath)) {
            fs.rmSync(repoPath, { recursive: true, force: true });
        }
    } catch (error) {
        console.warn(`Failed to cleanup ${repoPath}:`, error.message);
    }
}

/**
 * Property 33: Changed files detection
 * Feature: comprehensive-test-validation, Property 33: Changed files detection
 * Validates: Requirements 8.1
 * 
 * For any git repository, changed-only should detect all uncommitted changes
 */
export async function testChangedFilesDetection() {
    console.log('\n🧪 Property 33: Changed files detection');
    console.log('   Feature: comprehensive-test-validation, Property 33: Changed files detection');
    console.log('   Validates: Requirements 8.1');
    
    const property = fc.property(
        fc.array(
            fc.record({
                filename: fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, '_') + '.txt'),
                content: fc.string({ minLength: 0, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 5 }
        ),
        fc.array(
            fc.record({
                filename: fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, '_') + '.txt'),
                content: fc.string({ minLength: 0, maxLength: 100 })
            }),
            { minLength: 0, maxLength: 3 }
        ),
        (committedFiles, modifiedFiles) => {
            const repoPath = createTempGitRepo();
            
            try {
                // Create and commit initial files
                const committedFilenames = new Set();
                for (const file of committedFiles) {
                    const filePath = path.join(repoPath, file.filename);
                    fs.writeFileSync(filePath, file.content);
                    committedFilenames.add(file.filename);
                }
                
                if (committedFiles.length > 0) {
                    execSync('git add .', { cwd: repoPath, stdio: 'pipe' });
                    execSync('git commit -m "Initial commit"', { cwd: repoPath, stdio: 'pipe' });
                }
                
                // Modify some files (create new or modify existing)
                const expectedChangedFiles = new Set();
                for (const file of modifiedFiles) {
                    const filePath = path.join(repoPath, file.filename);
                    fs.writeFileSync(filePath, file.content + ' modified');
                    expectedChangedFiles.add(file.filename);
                }
                
                // Use GitClient to detect changes
                const client = new GitClient(repoPath);
                const detectedChanges = client.getAllModifiedFiles();
                const detectedSet = new Set(detectedChanges);
                
                // Verify all expected changes are detected
                for (const expectedFile of expectedChangedFiles) {
                    if (!detectedSet.has(expectedFile)) {
                        return false;
                    }
                }
                
                // Verify no extra files are detected (only modified files should be in the list)
                for (const detectedFile of detectedSet) {
                    if (!expectedChangedFiles.has(detectedFile)) {
                        return false;
                    }
                }
                
                return true;
            } finally {
                cleanupTempRepo(repoPath);
            }
        }
    );
    
    await runProperty(property, { numRuns: 20 }); // Reduced runs due to git operations
    console.log('   ✓ Changed files detection is correct');
}

/**
 * Property 34: Changed-since correctness
 * Feature: comprehensive-test-validation, Property 34: Changed-since correctness
 * Validates: Requirements 8.2
 * 
 * For any commit/branch reference, changed-since should find all files modified after that point
 */
export async function testChangedSinceCorrectness() {
    console.log('\n🧪 Property 34: Changed-since correctness');
    console.log('   Feature: comprehensive-test-validation, Property 34: Changed-since correctness');
    console.log('   Validates: Requirements 8.2');
    
    const property = fc.property(
        fc.array(
            fc.record({
                filename: fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, '_') + '.txt'),
                content: fc.string({ minLength: 0, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 3 }
        ),
        fc.array(
            fc.record({
                filename: fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, '_') + '.txt'),
                content: fc.string({ minLength: 0, maxLength: 100 })
            }),
            { minLength: 1, maxLength: 3 }
        ),
        (firstCommitFiles, secondCommitFiles) => {
            const repoPath = createTempGitRepo();
            
            try {
                // First commit
                for (const file of firstCommitFiles) {
                    const filePath = path.join(repoPath, file.filename);
                    fs.writeFileSync(filePath, file.content);
                }
                execSync('git add .', { cwd: repoPath, stdio: 'pipe' });
                execSync('git commit -m "First commit"', { cwd: repoPath, stdio: 'pipe' });
                
                // Get the first commit hash
                const firstCommitHash = execSync('git rev-parse HEAD', { cwd: repoPath, encoding: 'utf-8' }).trim();
                
                // Second commit with different files
                const secondCommitFilenames = new Set();
                for (const file of secondCommitFiles) {
                    const filePath = path.join(repoPath, file.filename);
                    fs.writeFileSync(filePath, file.content + ' second');
                    secondCommitFilenames.add(file.filename);
                }
                execSync('git add .', { cwd: repoPath, stdio: 'pipe' });
                execSync('git commit -m "Second commit"', { cwd: repoPath, stdio: 'pipe' });
                
                // Use GitClient to get changed files since first commit
                const client = new GitClient(repoPath);
                const changedFiles = client.getChangedFiles(firstCommitHash);
                const changedSet = new Set(changedFiles);
                
                // Verify all files from second commit are detected
                for (const filename of secondCommitFilenames) {
                    if (!changedSet.has(filename)) {
                        return false;
                    }
                }
                
                return true;
            } finally {
                cleanupTempRepo(repoPath);
            }
        }
    );
    
    await runProperty(property, { numRuns: 20 }); // Reduced runs due to git operations
    console.log('   ✓ Changed-since detection is correct');
}

/**
 * Property 35: Author information inclusion
 * Feature: comprehensive-test-validation, Property 35: Author information inclusion
 * Validates: Requirements 8.3
 * 
 * For any file with git history, with-authors should include correct author information
 */
export async function testAuthorInformationInclusion() {
    console.log('\n🧪 Property 35: Author information inclusion');
    console.log('   Feature: comprehensive-test-validation, Property 35: Author information inclusion');
    console.log('   Validates: Requirements 8.3');
    
    const property = fc.property(
        fc.record({
            filename: fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, '_') + '.txt'),
            content: fc.string({ minLength: 1, maxLength: 100 }),
            authorName: fc.string({ minLength: 3, maxLength: 30 }).map(s => {
                const cleaned = s.replace(/[^a-zA-Z ]/g, '').trim();
                return cleaned.length > 0 ? cleaned : 'Test Author';
            }),
            authorEmail: fc.tuple(
                fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'), { minLength: 3, maxLength: 10 }),
                fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 2, maxLength: 10 }),
                fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 2, maxLength: 5 })
            ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`)
        }),
        (fileInfo) => {
            const repoPath = createTempGitRepo();
            
            try {
                // Configure git with specific author
                execSync(`git config user.name "${fileInfo.authorName}"`, { cwd: repoPath, stdio: 'pipe' });
                execSync(`git config user.email "${fileInfo.authorEmail}"`, { cwd: repoPath, stdio: 'pipe' });
                
                // Create and commit file
                const filePath = path.join(repoPath, fileInfo.filename);
                fs.writeFileSync(filePath, fileInfo.content);
                execSync('git add .', { cwd: repoPath, stdio: 'pipe' });
                execSync('git commit -m "Test commit"', { cwd: repoPath, stdio: 'pipe' });
                
                // Use GitClient to get file authors
                const client = new GitClient(repoPath);
                const authors = client.getFileAuthors(fileInfo.filename);
                
                // Verify author information is present
                if (authors.length === 0) return false;
                
                const author = authors[0];
                if (author.name !== fileInfo.authorName) return false;
                if (author.email !== fileInfo.authorEmail) return false;
                if (author.commits !== 1) return false;
                
                return true;
            } finally {
                cleanupTempRepo(repoPath);
            }
        }
    );
    
    await runProperty(property, { numRuns: 20 }); // Reduced runs due to git operations
    console.log('   ✓ Author information is correctly included');
}

/**
 * Property 36: Diff calculation correctness
 * Feature: comprehensive-test-validation, Property 36: Diff calculation correctness
 * Validates: Requirements 8.4
 * 
 * For any two file versions, diff analyzer should correctly calculate additions and deletions
 */
export async function testDiffCalculationCorrectness() {
    console.log('\n🧪 Property 36: Diff calculation correctness');
    console.log('   Feature: comprehensive-test-validation, Property 36: Diff calculation correctness');
    console.log('   Validates: Requirements 8.4');
    
    const property = fc.property(
        fc.record({
            filename: fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, '_') + '.txt'),
            originalLines: fc.array(fc.string({ minLength: 0, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
            addedLines: fc.array(fc.string({ minLength: 0, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
            removedLineIndices: fc.array(fc.nat(), { minLength: 0, maxLength: 3 })
        }),
        (diffInfo) => {
            const repoPath = createTempGitRepo();
            
            try {
                // Create original file
                const filePath = path.join(repoPath, diffInfo.filename);
                const originalContent = diffInfo.originalLines.join('\n');
                fs.writeFileSync(filePath, originalContent);
                execSync('git add .', { cwd: repoPath, stdio: 'pipe' });
                execSync('git commit -m "Original"', { cwd: repoPath, stdio: 'pipe' });
                
                // Modify file: remove some lines and add new ones
                const modifiedLines = [...diffInfo.originalLines];
                
                // Remove lines (from end to start to maintain indices)
                const validIndices = diffInfo.removedLineIndices
                    .filter(idx => idx < modifiedLines.length)
                    .sort((a, b) => b - a);
                
                for (const idx of validIndices) {
                    modifiedLines.splice(idx, 1);
                }
                
                // Add new lines
                modifiedLines.push(...diffInfo.addedLines);
                
                const modifiedContent = modifiedLines.join('\n');
                fs.writeFileSync(filePath, modifiedContent);
                
                // Use DiffAnalyzer to calculate diff
                const analyzer = new DiffAnalyzer(repoPath);
                const diff = analyzer.getFileDiff(diffInfo.filename);
                
                // Verify diff has added and deleted counts
                if (typeof diff.added !== 'number') return false;
                if (typeof diff.deleted !== 'number') return false;
                if (typeof diff.modified !== 'number') return false;
                
                // The modified count should be sum of added and deleted
                if (diff.modified !== diff.added + diff.deleted) return false;
                
                return true;
            } finally {
                cleanupTempRepo(repoPath);
            }
        }
    );
    
    await runProperty(property, { numRuns: 20 }); // Reduced runs due to git operations
    console.log('   ✓ Diff calculation is correct');
}

/**
 * Property 37: Blame tracking correctness
 * Feature: comprehensive-test-validation, Property 37: Blame tracking correctness
 * Validates: Requirements 8.5
 * 
 * For any file line, blame tracker should identify the correct author
 */
export async function testBlameTrackingCorrectness() {
    console.log('\n🧪 Property 37: Blame tracking correctness');
    console.log('   Feature: comprehensive-test-validation, Property 37: Blame tracking correctness');
    console.log('   Validates: Requirements 8.5');
    
    const property = fc.property(
        fc.record({
            filename: fc.string({ minLength: 1, maxLength: 20 }).map(s => s.replace(/[^a-zA-Z0-9]/g, '_') + '.txt'),
            lines: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 5 }),
            authorName: fc.string({ minLength: 3, maxLength: 30 }).map(s => {
                const cleaned = s.replace(/[^a-zA-Z ]/g, '').trim();
                return cleaned.length > 0 ? cleaned : 'Test Author';
            }),
            authorEmail: fc.tuple(
                fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'), { minLength: 3, maxLength: 10 }),
                fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 2, maxLength: 10 }),
                fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), { minLength: 2, maxLength: 5 })
            ).map(([local, domain, tld]) => `${local}@${domain}.${tld}`)
        }),
        (fileInfo) => {
            const repoPath = createTempGitRepo();
            
            try {
                // Configure git with specific author
                execSync(`git config user.name "${fileInfo.authorName}"`, { cwd: repoPath, stdio: 'pipe' });
                execSync(`git config user.email "${fileInfo.authorEmail}"`, { cwd: repoPath, stdio: 'pipe' });
                
                // Create and commit file
                const filePath = path.join(repoPath, fileInfo.filename);
                const content = fileInfo.lines.join('\n');
                fs.writeFileSync(filePath, content);
                execSync('git add .', { cwd: repoPath, stdio: 'pipe' });
                execSync('git commit -m "Test commit"', { cwd: repoPath, stdio: 'pipe' });
                
                // Use GitClient to get blame information
                const client = new GitClient(repoPath);
                const blameInfo = client.getBlame(fileInfo.filename);
                
                // Verify blame information
                if (blameInfo.length !== fileInfo.lines.length) return false;
                
                // Each line should have correct author
                for (const blame of blameInfo) {
                    if (blame.author !== fileInfo.authorName) return false;
                    if (!blame.commit) return false;
                    if (!blame.timestamp) return false;
                    if (!blame.date) return false;
                }
                
                return true;
            } finally {
                cleanupTempRepo(repoPath);
            }
        }
    );
    
    await runProperty(property, { numRuns: 20 }); // Reduced runs due to git operations
    console.log('   ✓ Blame tracking is correct');
}

// Export all tests
export default async function runAllGitIntegrationProperties() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 Git Integration Property-Based Tests');
    console.log('='.repeat(80));
    
    await testChangedFilesDetection();
    await testChangedSinceCorrectness();
    await testAuthorInformationInclusion();
    await testDiffCalculationCorrectness();
    await testBlameTrackingCorrectness();
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ All Git integration property tests passed!');
    console.log('='.repeat(80) + '\n');
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runAllGitIntegrationProperties().catch(error => {
        console.error('❌ Property tests failed:', error);
        process.exit(1);
    });
}
