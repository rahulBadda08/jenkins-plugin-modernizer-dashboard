import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../src/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'all_plugins.json');
const MANIFEST_FILE = path.join(DATA_DIR, 'manifest.json');

const TMP_OUTPUT_FILE = path.join(DATA_DIR, 'all_plugins.json.tmp');
const TMP_MANIFEST_FILE = path.join(DATA_DIR, 'manifest.json.tmp');
const BACKUP_OUTPUT_FILE = path.join(DATA_DIR, 'all_plugins.json.bak');
const BACKUP_MANIFEST_FILE = path.join(DATA_DIR, 'manifest.json.bak');

const TREE_API = 'https://api.github.com/repos/jenkins-infra/metadata-plugin-modernizer/git/trees/main?recursive=1';
const REPO_IDENTIFIER = 'jenkins-infra/metadata-plugin-modernizer';
const USER_AGENT = 'jenkins-plugin-modernizer-dashboard/1.0 (+https://github.com/rahulBadda08/jenkins-plugin-modernizer-dashboard)';
const BATCH_SIZE = 30;
const MIN_SUCCESS_RATIO = 0.95; // 95% threshold to guard against partial data publishing
const MAX_RETRIES = 3;

function getAuthHeaders() {
    const headers = {
        'User-Agent': USER_AGENT,
        'Accept': 'application/vnd.github.v3+json',
    };
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (token) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
    }
    return headers;
}

function getRawHeaders() {
    const headers = {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
    };
    const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
    if (token) {
        headers['Authorization'] = `Bearer ${token.trim()}`;
    }
    return headers;
}

async function ensureDir(dir) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, headers, maxRetries = MAX_RETRIES) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const res = await fetch(url, { headers });
            
            if (res.ok) {
                return await res.json();
            }

            const status = res.status;
            const rateLimitRemaining = res.headers.get('x-ratelimit-remaining');
            const rateLimitReset = res.headers.get('x-ratelimit-reset');
            const retryAfter = res.headers.get('retry-after');

            // Non-transient client errors: 401, 404 (fail immediately, no retry)
            if (status === 401 || status === 404) {
                const err = new Error(`HTTP ${status} (${res.statusText})`);
                err.isNonTransient = true;
                throw err;
            }

            if (status === 403) {
                const isRateLimited = rateLimitRemaining === '0';
                if (isRateLimited) {
                    const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset, 10) * 1000).toISOString() : 'unknown';
                    const err = new Error(`GitHub API Rate limit exceeded (reset at ${resetTime})`);
                    err.isNonTransient = true;
                    throw err;
                }
                const err = new Error(`HTTP 403 Forbidden`);
                err.isNonTransient = true;
                throw err;
            }

            // Transient errors: 429, 500, 502, 503, 504
            const isTransient = status === 429 || (status >= 500 && status < 600);
            if (!isTransient || attempt === maxRetries - 1) {
                throw new Error(`HTTP ${status} (${res.statusText})`);
            }

            // Exponential backoff with randomized jitter (0 - 500ms)
            const jitterMs = Math.floor(Math.random() * 500);
            let backoffMs = Math.pow(2, attempt) * 1000 + jitterMs;
            if (retryAfter) {
                const parsed = parseInt(retryAfter, 10);
                if (!isNaN(parsed)) backoffMs = parsed * 1000 + jitterMs;
            }
            console.warn(`[WARN] Transient error ${status} on ${url}. Retrying in ${backoffMs}ms with jitter (attempt ${attempt + 1}/${maxRetries})...`);
            await sleep(backoffMs);
        } catch (err) {
            if (err.isNonTransient || attempt === maxRetries - 1) {
                throw err;
            }
            const jitterMs = Math.floor(Math.random() * 500);
            const backoffMs = Math.pow(2, attempt) * 1000 + jitterMs;
            console.warn(`[WARN] Network error fetching ${url}: ${err.message}. Retrying in ${backoffMs}ms with jitter (attempt ${attempt + 1}/${maxRetries})...`);
            await sleep(backoffMs);
        }
    }
}

function validatePluginReport(data, filePath) {
    if (!data || typeof data !== 'object') {
        return { valid: false, reason: 'Report is not an object' };
    }
    if (!data.pluginName || typeof data.pluginName !== 'string') {
        return { valid: false, reason: 'Missing or invalid pluginName' };
    }
    if (!Array.isArray(data.migrations)) {
        return { valid: false, reason: 'Missing or non-array migrations' };
    }
    return { valid: true };
}

async function cleanupTmpFiles() {
    await fs.unlink(TMP_OUTPUT_FILE).catch(() => {});
    await fs.unlink(TMP_MANIFEST_FILE).catch(() => {});
    await fs.unlink(BACKUP_OUTPUT_FILE).catch(() => {});
    await fs.unlink(BACKUP_MANIFEST_FILE).catch(() => {});
}

async function run() {
    console.log('Starting Jenkins Plugin Ecosystem Data Ingestion...');
    await ensureDir(DATA_DIR);

    // 1. Fetch entire repository tree
    console.log('Fetching repository tree to map all plugin endpoints...');
    const treeHeaders = getAuthHeaders();
    let treeData;
    try {
        treeData = await fetchWithRetry(TREE_API, treeHeaders);
    } catch (err) {
        throw new Error(`Failed to fetch tree from ${TREE_API}: ${err.message}`);
    }

    if (!treeData || !Array.isArray(treeData.tree)) {
        throw new Error('Invalid response from GitHub Tree API (missing tree array)');
    }

    const treeSha = treeData.sha || 'unknown';

    // 2. Identify and sort all aggregated_migrations.json files deterministically
    const validPaths = treeData.tree
        .filter(item => item.path && item.path.endsWith('reports/aggregated_migrations.json'))
        .map(item => item.path)
        .sort((a, b) => a.localeCompare(b));

    const discoveredCount = validPaths.length;
    console.log(`Found ${discoveredCount} plugin report files in the ecosystem.`);

    if (discoveredCount === 0) {
        throw new Error('No reports found. Tree API structure may have changed.');
    }

    const compiledData = [];
    const failedPaths = [];
    const invalidReports = [];
    let completed = 0;

    // 3. Batch fetch raw JSON using raw.githubusercontent
    console.log(`Downloading raw JSON data in batches of ${BATCH_SIZE}...`);
    const rawHeaders = getRawHeaders();

    for (let i = 0; i < validPaths.length; i += BATCH_SIZE) {
        const batchPaths = validPaths.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batchPaths.map(async (filePath) => {
                const rawUrl = `https://raw.githubusercontent.com/${REPO_IDENTIFIER}/main/${filePath}`;
                try {
                    const data = await fetchWithRetry(rawUrl, rawHeaders);
                    const validation = validatePluginReport(data, filePath);
                    if (validation.valid) {
                        return { status: 'success', data };
                    } else {
                        return { status: 'invalid', filePath, reason: validation.reason };
                    }
                } catch (err) {
                    return { status: 'failed', filePath, error: err.message };
                }
            })
        );

        for (const res of batchResults) {
            if (res.status === 'success') {
                compiledData.push(res.data);
            } else if (res.status === 'invalid') {
                invalidReports.push({ path: res.filePath, reason: res.reason });
            } else if (res.status === 'failed') {
                failedPaths.push({ path: res.filePath, error: res.error });
            }
        }

        completed += batchPaths.length;
        process.stdout.write(`\r Progress: ${completed}/${discoveredCount} remote files downloaded...`);
    }

    console.log('\nData download complete!');

    // 4. Deterministic sorting by pluginName
    compiledData.sort((a, b) => a.pluginName.localeCompare(b.pluginName));

    const successfulCount = compiledData.length;
    const failedCount = failedPaths.length;
    const invalidCount = invalidReports.length;
    const successRatio = discoveredCount > 0 ? successfulCount / discoveredCount : 0;

    console.log(`\n── Ingestion Telemetry Summary ──`);
    console.log(`Discovered:  ${discoveredCount}`);
    console.log(`Successful:  ${successfulCount}`);
    console.log(`Failed:      ${failedCount}`);
    console.log(`Invalid:     ${invalidCount}`);
    console.log(`Success Rate: ${(successRatio * 100).toFixed(2)}% (Target: >= ${(MIN_SUCCESS_RATIO * 100)}%)`);

    // 5. Enforce success threshold
    if (successRatio < MIN_SUCCESS_RATIO) {
        await cleanupTmpFiles();
        throw new Error(
            `Ingestion aborted: Success ratio ${(successRatio * 100).toFixed(2)}% is below safe threshold ${(MIN_SUCCESS_RATIO * 100)}%. Existing dataset preserved.`
        );
    }

    // 6. Generate Data Manifest
    const manifest = {
        sourceRepository: REPO_IDENTIFIER,
        sourceTreeSha: treeSha,
        generatedAt: new Date().toISOString(),
        discoveredCount,
        successfulCount,
        failedCount,
        invalidCount,
        successRatio: parseFloat(successRatio.toFixed(4)),
        failures: failedPaths.slice(0, 50),
        invalids: invalidReports.slice(0, 50),
    };

    // 7. Atomic synchronized publication with rollback
    let hasOutputBackup = false;
    let hasManifestBackup = false;

    try {
        console.log(`Staging compiled dataset (${successfulCount} plugins)...`);
        await fs.writeFile(TMP_OUTPUT_FILE, JSON.stringify(compiledData, null, 2) + '\n', 'utf8');
        await fs.writeFile(TMP_MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

        // Backup existing files if present
        try {
            await fs.copyFile(OUTPUT_FILE, BACKUP_OUTPUT_FILE);
            hasOutputBackup = true;
        } catch {}
        try {
            await fs.copyFile(MANIFEST_FILE, BACKUP_MANIFEST_FILE);
            hasManifestBackup = true;
        } catch {}

        // Synchronously rename staged files
        await fs.rename(TMP_OUTPUT_FILE, OUTPUT_FILE);
        await fs.rename(TMP_MANIFEST_FILE, MANIFEST_FILE);

        // Remove temporary backups on clean execution
        if (hasOutputBackup) await fs.unlink(BACKUP_OUTPUT_FILE).catch(() => {});
        if (hasManifestBackup) await fs.unlink(BACKUP_MANIFEST_FILE).catch(() => {});

        console.log(`Successfully published atomic dataset to ${OUTPUT_FILE}`);
        console.log(`Successfully published data manifest to ${MANIFEST_FILE}`);
    } catch (err) {
        console.error(`Publication failed: ${err.message}. Initiating rollback to previous state...`);
        if (hasOutputBackup) await fs.copyFile(BACKUP_OUTPUT_FILE, OUTPUT_FILE).catch(() => {});
        if (hasManifestBackup) await fs.copyFile(BACKUP_MANIFEST_FILE, MANIFEST_FILE).catch(() => {});
        await cleanupTmpFiles();
        throw new Error(`Failed to commit atomic files (rolled back): ${err.message}`);
    }

    console.log(`Ingestion SUCCESS! Extracted ${successfulCount} validated Jenkins plugins.`);
}

run().catch(err => {
    console.error(`\n[FATAL] Data Ingestion Error:`, err.message || err);
    process.exit(1);
});
