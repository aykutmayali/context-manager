import { CacheManager } from './lib/cache/CacheManager.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const entries = [
    {filePath: " ", data: {tokens: 0, lines: 0, methods: []}, modifiedTime: 0},
    {filePath: "!", data: {tokens: 0, lines: 0, methods: []}, modifiedTime: 0}
];

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));

const seqCache = new CacheManager({
    strategy: 'memory',
    path: tempDir,
    ttl: 3600
});

console.log('Setting entries sequentially...');
for (const entry of entries) {
    seqCache.set(entry.filePath, entry.data, entry.modifiedTime);
    console.log(`Set ${JSON.stringify(entry.filePath)}`);
}

console.log('\nGetting entries sequentially...');
for (const entry of entries) {
    const retrieved = seqCache.get(entry.filePath, entry.modifiedTime);
    console.log(`Get ${JSON.stringify(entry.filePath)}: ${JSON.stringify(retrieved)}`);
}

console.log('\nCache stats:', seqCache.getStats());

// Cleanup
seqCache.clear();
if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
}
