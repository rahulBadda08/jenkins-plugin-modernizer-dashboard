import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
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

export function getAuthHeaders() {
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

export function getRawHeaders() {
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

export async function fetchWithRetry(url, headers, maxRetries = MAX_RETRIES, options = {}) {
    const { allowAuthFallback = true, onAuthFallback } = options;
    let currentHeaders = { ...headers };

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            const res = await fetch(url, { headers: currentHeaders });

            if (res.ok) {
                return await res.json();
            }

            const status = res.status;
            const rateLimitRemaining = res.headers.get('x-ratelimit-remaining');
            const rateLimitReset = res.headers.get('x-ratelimit-reset');
            const retryAfter = res.headers.get('retry-after');

            // Handle 401 Unauthorized
            if (status === 401) {
                if (currentHeaders.Authorization && allowAuthFallback) {
                    delete currentHeaders.Authorization;
                    delete currentHeaders.authorization;
                    if (typeof onAuthFallback === 'function') {
                        onAuthFallback();
                    }
                    // Attempt immediate unauthenticated retry for public repository assets
                    const unauthRes = await fetch(url, { headers: currentHeaders });
                    if (unauthRes.ok) {
                        return await unauthRes.json();
                    }
                }
                const err = new Error('HTTP 401 Unauthorized (Invalid or expired GitHub credentials; token contents suppressed)');
                err.isNonTransient = true;
                throw err;
            }

            // Handle 404 Not Found
            if (status === 404) {
                const err = new Error(`HTTP 404 Not Found (Remote resource does not exist at ${url})`);
                err.isNonTransient = true;
                throw err;
            }

            // Handle 403 Forbidden / Rate limit
            if (status === 403) {
                const isRateLimited = rateLimitRemaining === '0';
                if (isRateLimited) {
                    const resetTime = rateLimitReset ? new Date(parseInt(rateLimitReset, 10) * 1000).toISOString() : 'unknown';
                    const err = new Error(`GitHub API Rate limit exceeded (reset at ${resetTime})`);
                    err.isNonTransient = true;
                    throw err;
                }
                if (currentHeaders.Authorization && allowAuthFallback) {
                    delete currentHeaders.Authorization;
                    delete currentHeaders.authorization;
                    if (typeof onAuthFallback === 'function') {
                        onAuthFallback();
                    }
                    const unauthRes = await fetch(url, { headers: currentHeaders });
                    if (unauthRes.ok) {
                        return await unauthRes.json();
                    }
                }
                const err = new Error('HTTP 403 Forbidden (Access denied or insufficient scope)');
                err.isNonTransient = true;
                throw err;
            }

            // Transient errors: 429, 500, 502, 503, 504
            const isTransient = status === 429 || (status >= 500 && status < 600);
            if (!isTransient || attempt === maxRetries - 1) {
                throw new Error(`HTTP ${status} (${res.statusText || 'Server Error'})`);
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

export function normalizeMigrationStatus(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return 'unknown';
    const lower = raw.trim().toLowerCase();
    if (lower === 'success' || lower === 'pass') return 'success';
    if (lower === 'failure' || lower === 'fail') return 'fail';
    if (lower === 'pending') return 'pending';
    if (lower === 'running') return 'running';
    if (lower === 'aborted') return 'aborted';
    return 'unknown';
}

export function normalizePRStatus(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return '';
    const lower = raw.trim().toLowerCase();
    if (['merged', 'open', 'closed', 'draft'].includes(lower)) return lower;
    return '';
}

export function validateMigrationRecord(migration, index = 0) {
    if (!migration || typeof migration !== 'object' || Array.isArray(migration)) {
        return { valid: false, reason: `Migration at index ${index} is not an object` };
    }

    const migrationName = typeof migration.migrationName === 'string' && migration.migrationName.trim()
        ? migration.migrationName.trim()
        : 'Unknown Migration';

    const migrationStatus = normalizeMigrationStatus(migration.migrationStatus);
    const pullRequestStatus = normalizePRStatus(migration.pullRequestStatus);

    const additions = Number.isFinite(migration.additions)
        ? Math.max(0, Math.floor(migration.additions))
        : 0;
    const deletions = Number.isFinite(migration.deletions)
        ? Math.max(0, Math.floor(migration.deletions))
        : 0;
    const changedFiles = Number.isFinite(migration.changedFiles)
        ? Math.max(0, Math.floor(migration.changedFiles))
        : 0;

    const tags = Array.isArray(migration.tags)
        ? migration.tags.filter(t => typeof t === 'string' && t.trim().length > 0)
        : [];

    let pullRequestUrl = '';
    if (typeof migration.pullRequestUrl === 'string') {
        const trimmedUrl = migration.pullRequestUrl.trim();
        if (trimmedUrl) {
            if (!/^https?:\/\//i.test(trimmedUrl)) {
                return { valid: false, reason: `Migration at index ${index} has invalid PR URL: "${trimmedUrl}"` };
            }
            pullRequestUrl = trimmedUrl;
        }
    }

    const timestamp = typeof migration.timestamp === 'string' ? migration.timestamp.trim() : '';

    let checkRuns = undefined;
    if (migration.checkRuns && typeof migration.checkRuns === 'object' && !Array.isArray(migration.checkRuns)) {
        checkRuns = {};
        for (const [k, v] of Object.entries(migration.checkRuns)) {
            checkRuns[k] = typeof v === 'string' ? v : null;
        }
    }

    const cleaned = {
        ...migration,
        migrationName,
        migrationStatus,
        pullRequestStatus,
        pullRequestUrl,
        additions,
        deletions,
        changedFiles,
        tags,
        timestamp,
    };

    if (checkRuns !== undefined) {
        cleaned.checkRuns = checkRuns;
    }

    return { valid: true, migration: cleaned };
}

export function validatePluginReport(data, filePath, seenPluginNames = new Set()) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
        return { valid: false, reason: 'Report is not an object' };
    }
    if (typeof data.pluginName !== 'string' || !data.pluginName.trim()) {
        return { valid: false, reason: 'Missing or invalid pluginName' };
    }
    const pluginName = data.pluginName.trim();
    if (seenPluginNames.has(pluginName)) {
        return { valid: false, reason: `Duplicate pluginName detected: "${pluginName}"` };
    }
    if (!Array.isArray(data.migrations)) {
        return { valid: false, reason: 'Missing or non-array migrations' };
    }

    let invalidMigrationsCount = 0;
    const cleanedMigrations = [];

    for (let i = 0; i < data.migrations.length; i++) {
        const mRes = validateMigrationRecord(data.migrations[i], i);
        if (mRes.valid) {
            cleanedMigrations.push(mRes.migration);
        } else {
            invalidMigrationsCount++;
        }
    }

    seenPluginNames.add(pluginName);

    const cleanedPlugin = {
        ...data,
        pluginName,
        pluginRepository: typeof data.pluginRepository === 'string' ? data.pluginRepository.trim() : '',
        migrations: cleanedMigrations,
    };

    return {
        valid: true,
        plugin: cleanedPlugin,
        invalidMigrationsCount,
        totalMigrationsCount: data.migrations.length,
    };
}

export function computeDatasetHash(content) {
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

async function cleanupTmpFiles() {
    await fs.unlink(TMP_OUTPUT_FILE).catch(() => {});
    await fs.unlink(TMP_MANIFEST_FILE).catch(() => {});
    await fs.unlink(BACKUP_OUTPUT_FILE).catch(() => {});
    await fs.unlink(BACKUP_MANIFEST_FILE).catch(() => {});
}

export async function run() {
    console.log('Starting Jenkins Plugin Ecosystem Data Ingestion...');
    await ensureDir(DATA_DIR);

    // 1. Fetch entire repository tree
    console.log('Fetching repository tree to map all plugin endpoints...');
    const treeHeaders = getAuthHeaders();
    let treeData;
    try {
        treeData = await fetchWithRetry(TREE_API, treeHeaders, MAX_RETRIES, {
            allowAuthFallback: true,
            onAuthFallback: () => {
                console.warn('[WARN] GitHub API rejected provided token. Falling back to unauthenticated public access for repository tree.');
            }
        });
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
    const seenPluginNames = new Set();
    let totalInvalidMigrations = 0;
    let completed = 0;
    let authDropped = false;

    // 3. Batch fetch raw JSON using raw.githubusercontent
    console.log(`Downloading raw JSON data in batches of ${BATCH_SIZE}...`);
    const rawHeaders = getRawHeaders();

    for (let i = 0; i < validPaths.length; i += BATCH_SIZE) {
        const batchPaths = validPaths.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
            batchPaths.map(async (filePath) => {
                const rawUrl = `https://raw.githubusercontent.com/${REPO_IDENTIFIER}/main/${filePath}`;
                try {
                    const currentHeaders = authDropped ? { ...rawHeaders, Authorization: undefined } : rawHeaders;
                    const data = await fetchWithRetry(rawUrl, currentHeaders, MAX_RETRIES, {
                        allowAuthFallback: true,
                        onAuthFallback: () => {
                            if (!authDropped) {
                                authDropped = true;
                                console.warn('\n[WARN] Raw downloads rejected credentials (HTTP 401/403). Falling back to unauthenticated public access.');
                            }
                        }
                    });
                    return { status: 'fetched', data, filePath };
                } catch (err) {
                    return { status: 'failed', filePath, error: err.message };
                }
            })
        );

        for (const res of batchResults) {
            if (res.status === 'fetched') {
                const validation = validatePluginReport(res.data, res.filePath, seenPluginNames);
                if (validation.valid) {
                    compiledData.push(validation.plugin);
                    totalInvalidMigrations += validation.invalidMigrationsCount;
                } else {
                    invalidReports.push({ path: res.filePath, reason: validation.reason });
                }
            } else if (res.status === 'failed') {
                failedPaths.push({ path: res.filePath, error: res.error });
            }
        }

        completed += batchPaths.length;
        process.stdout.write(`\r Progress: ${completed}/${discoveredCount} remote files processed...`);
    }

    console.log('\nData download complete!');

    // 4. Deterministic sorting by pluginName
    compiledData.sort((a, b) => a.pluginName.localeCompare(b.pluginName));

    const successfulCount = compiledData.length;
    const failedCount = failedPaths.length;
    const invalidCount = invalidReports.length;
    const successRatio = discoveredCount > 0 ? successfulCount / discoveredCount : 0;

    console.log(`\n── Ingestion Telemetry Summary ──`);
    console.log(`Discovered:          ${discoveredCount}`);
    console.log(`Successful:          ${successfulCount}`);
    console.log(`Failed:              ${failedCount}`);
    console.log(`Invalid Reports:     ${invalidCount}`);
    console.log(`Invalid Migrations:  ${totalInvalidMigrations}`);
    console.log(`Success Rate:        ${(successRatio * 100).toFixed(2)}% (Target: >= ${(MIN_SUCCESS_RATIO * 100)}%)`);

    // 5. Enforce success threshold
    if (successRatio < MIN_SUCCESS_RATIO) {
        await cleanupTmpFiles();
        throw new Error(
            `Ingestion aborted: Success ratio ${(successRatio * 100).toFixed(2)}% is below safe threshold ${(MIN_SUCCESS_RATIO * 100)}%. Existing dataset preserved.`
        );
    }

    // 6. Generate Data Manifest with cryptographic SHA256 checksum
    const datasetContent = JSON.stringify(compiledData, null, 2) + '\n';
    const datasetSha256 = computeDatasetHash(datasetContent);

    const manifest = {
        sourceRepository: REPO_IDENTIFIER,
        sourceTreeSha: treeSha,
        datasetSha256,
        generatedAt: new Date().toISOString(),
        discoveredCount,
        successfulCount,
        failedCount,
        invalidCount,
        invalidMigrationsCount: totalInvalidMigrations,
        successRatio: parseFloat(successRatio.toFixed(4)),
        failures: failedPaths.slice(0, 50),
        invalids: invalidReports.slice(0, 50),
    };

    // 7. Atomic synchronized publication with rollback
    let hasOutputBackup = false;
    let hasManifestBackup = false;

    try {
        console.log(`Staging compiled dataset (${successfulCount} plugins, sha256: ${datasetSha256.slice(0, 12)}...)...`);
        await fs.writeFile(TMP_OUTPUT_FILE, datasetContent, 'utf8');
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

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
    run().catch(err => {
        console.error(`\n[FATAL] Data Ingestion Error:`, err.message || err);
        process.exit(1);
    });
}
