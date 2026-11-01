import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_DATA_DIR = path.resolve(__dirname, '../src/data');

export function normalizeEol(content) {
    return typeof content === 'string' ? content.replace(/\r\n/g, '\n') : '';
}

export function computeDatasetHash(content) {
    return crypto.createHash('sha256').update(normalizeEol(content), 'utf8').digest('hex');
}

export function normalizePluginKey(name) {
    return typeof name === 'string' ? name.trim().toLowerCase() : '';
}

/**
 * Validates the published all_plugins.json dataset and its manifest.json.
 * @param {Object} options
 * @param {string} [options.dataDir]
 * @param {string} [options.outputFile]
 * @param {string} [options.manifestFile]
 * @returns {Promise<{ success: boolean, count: number, sha256: string, manifest: object }>}
 */
export async function verifyDatasetFiles(options = {}) {
    const dataDir = options.dataDir || DEFAULT_DATA_DIR;
    const outputFile = options.outputFile || path.join(dataDir, 'all_plugins.json');
    const manifestFile = options.manifestFile || path.join(dataDir, 'manifest.json');

    // 1. Verify files exist
    try {
        await fs.access(outputFile);
    } catch {
        throw new Error(`Dataset file not found at: ${outputFile}`);
    }

    try {
        await fs.access(manifestFile);
    } catch {
        throw new Error(`Manifest file not found at: ${manifestFile}`);
    }

    // 2. Read and validate manifest
    const manifestRaw = await fs.readFile(manifestFile, 'utf8');
    let manifest;
    try {
        manifest = JSON.parse(manifestRaw);
    } catch (e) {
        throw new Error(`Failed to parse manifest JSON at ${manifestFile}: ${e.message}`);
    }

    if (!manifest.datasetSha256 || !/^[a-f0-9]{64}$/i.test(manifest.datasetSha256)) {
        throw new Error(`Invalid or missing datasetSha256 in manifest: "${manifest.datasetSha256}"`);
    }

    if (typeof manifest.successfulCount !== 'number' || manifest.successfulCount < 0) {
        throw new Error(`Invalid or missing successfulCount in manifest: ${manifest.successfulCount}`);
    }

    if (typeof manifest.successRatio === 'number' && manifest.successRatio < 0.95) {
        throw new Error(`Manifest successRatio ${(manifest.successRatio * 100).toFixed(2)}% is below 95% threshold`);
    }

    // 3. Read dataset and verify cryptographic hash
    const datasetRaw = await fs.readFile(outputFile, 'utf8');
    const computedHash = computeDatasetHash(datasetRaw);

    if (computedHash.toLowerCase() !== manifest.datasetSha256.toLowerCase()) {
        throw new Error(
            `Checksum mismatch! Computed SHA-256: ${computedHash}, Manifest expected: ${manifest.datasetSha256}`
        );
    }

    // 4. Parse dataset and check structural integrity
    let plugins;
    try {
        plugins = JSON.parse(datasetRaw);
    } catch (e) {
        throw new Error(`Dataset file at ${outputFile} is not valid JSON: ${e.message}`);
    }

    if (!Array.isArray(plugins)) {
        throw new Error(`Dataset root is not an array`);
    }

    if (plugins.length === 0) {
        throw new Error(`Dataset array is unexpectedly empty`);
    }

    if (plugins.length !== manifest.successfulCount) {
        throw new Error(
            `Plugin count mismatch! Dataset contains ${plugins.length} plugins, but manifest states ${manifest.successfulCount}`
        );
    }

    // 5. Check plugin uniqueness and structure
    const seenKeys = new Set();
    for (let i = 0; i < plugins.length; i++) {
        const item = plugins[i];
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            throw new Error(`Plugin at index ${i} is not a valid object`);
        }
        if (typeof item.pluginName !== 'string' || !item.pluginName.trim()) {
            throw new Error(`Plugin at index ${i} has missing or empty pluginName`);
        }
        const key = normalizePluginKey(item.pluginName);
        if (seenKeys.has(key)) {
            throw new Error(`Duplicate pluginName found in dataset: "${item.pluginName}" (index ${i})`);
        }
        seenKeys.add(key);

        if (!Array.isArray(item.migrations)) {
            throw new Error(`Plugin "${item.pluginName}" has non-array migrations property`);
        }
    }

    return {
        success: true,
        count: plugins.length,
        sha256: computedHash,
        manifest,
    };
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
    verifyDatasetFiles()
        .then(result => {
            console.log('\n── Dataset Integrity Verification ──');
            console.log(`Plugin Count:     ${result.count}`);
            console.log(`Dataset SHA-256:  ${result.sha256}`);
            console.log(`Manifest SHA-256: ${result.manifest.datasetSha256}`);
            console.log(`Success Ratio:    ${((result.manifest.successRatio || 1) * 100).toFixed(2)}%`);
            console.log(`Status:           VERIFIED PASSED ✅\n`);
            process.exit(0);
        })
        .catch(err => {
            console.error('\n── Dataset Integrity Verification FAILED ❌ ──');
            console.error(`Error: ${err.message}\n`);
            process.exit(1);
        });
}
