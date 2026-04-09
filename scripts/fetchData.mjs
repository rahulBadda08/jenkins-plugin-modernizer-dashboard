import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../src/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'all_plugins.json');

// ── BUILD-TIME DATA INGESTION PIPELINE ──
// This script serves as the infrastructural backbone for the Jenkins Plugin Modernizer.
// Instead of the React frontend lagging and collapsing under 429 live network requests,
// this script autonomously compiles the global Jenkins endpoint matrix at build-time.
// 
// Architecture Strategy:
// By querying the raw git/tree API once, we cleanly bypass the 60req/hr GitHub API limits.
const TREE_API = 'https://api.github.com/repos/jenkins-infra/metadata-plugin-modernizer/git/trees/main?recursive=1';
const BATCH_SIZE = 30; // Highly optimized concurrent worker limits

async function ensureDir(dir) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Status ${res.status}`);
            return await res.json();
        } catch (e) {
            if (i === retries - 1) throw e;
            await new Promise(r => setTimeout(r, 1000 * (i + 1))); // exponential backoff
        }
    }
}

async function run() {
    console.log('Starting Jenkin Plugin Data Ingestion...');
    
    // 1. Fetch entire repository tree (1 API call!)
    console.log(`Fetching repository tree to map all plugin endpoints...`);
    const treeRes = await fetch(TREE_API);
    if (!treeRes.ok) throw new Error(`Failed to fetch tree: ${treeRes.status}`);
    const treeData = await treeRes.json();
    
    // 2. Identify all aggregated_migrations.json files across 400+ folders
    const validPaths = treeData.tree
        .filter(item => item.path.endsWith('reports/aggregated_migrations.json'))
        .map(item => item.path);
        
    console.log(`Found ${validPaths.length} valid plugin report files in the ecosystem.`);
    
    if (validPaths.length === 0) {
        throw new Error('No reports found. Tree API might have changed.');
    }

    const compiledData = [];
    let completed = 0;

    // 3. Batch fetch raw JSON using raw.githubusercontent (No API limits)
    console.log(`Downloading raw JSON data in batches of ${BATCH_SIZE}...`);
    for (let i = 0; i < validPaths.length; i += BATCH_SIZE) {
        const batchPaths = validPaths.slice(i, i + BATCH_SIZE);
        const batchPromises = batchPaths.map(async (filePath) => {
            const pluginName = filePath.split('/')[0];
            const rawUrl = `https://raw.githubusercontent.com/jenkins-infra/metadata-plugin-modernizer/main/${filePath}`;
            
            try {
                const data = await fetchWithRetry(rawUrl);
                // Graceful schema handler
                if (data && data.pluginName && data.migrations) {
                    compiledData.push(data);
                }
            } catch (err) {
                console.error(`\n Failed to fetch ${pluginName}: ${err.message}`);
            }
        });
        
        await Promise.all(batchPromises);
        completed += batchPaths.length;
        process.stdout.write(`\r Progress: ${completed}/${validPaths.length} remote files downloaded...`);
    }
    
    console.log('\n Data download complete!');

    // 4. Save to src/data inside the local React environment
    await ensureDir(DATA_DIR);
    console.log(` Saving compiled JSON bundle to ${OUTPUT_FILE}`);
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(compiledData, null, 2), 'utf8');
    
    console.log(` Ingestion SUCCESS! Extracted ${compiledData.length} fully structured Jenkins plugins.`);
}

run().catch(err => {
    console.error(`\n Fatal Error during ingestion:\n`, err);
    process.exit(1);
});
