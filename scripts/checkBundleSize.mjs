import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const DIST_DIR = path.resolve('dist/assets');

// Performance budget definitions in bytes
const BUDGETS = [
  { pattern: /^index-.*\.js$/, name: 'Application Bundle (JS)', maxRaw: 1800 * 1024, maxGzip: 160 * 1024 },
  { pattern: /^vendor-charts-.*\.js$/, name: 'Vendor ECharts (JS)', maxRaw: 1300 * 1024, maxGzip: 420 * 1024 },
  { pattern: /^vendor-excel-.*\.js$/, name: 'Vendor ExcelJS (JS)', maxRaw: 1100 * 1024, maxGzip: 300 * 1024 },
  { pattern: /^vendor-react-.*\.js$/, name: 'Vendor React Core (JS)', maxRaw: 250 * 1024, maxGzip: 75 * 1024 },
  { pattern: /^index-.*\.css$/, name: 'Stylesheet (CSS)', maxRaw: 100 * 1024, maxGzip: 20 * 1024 }
];

function formatBytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} kB`;
}

export function checkBundleBudgets() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('Error: dist/assets directory not found. Please run "npm run build" first.');
    process.exit(1);
  }

  const files = fs.readdirSync(DIST_DIR);
  let failed = false;

  console.log('\n── Performance Budget & Bundle Size Gate ──');
  console.log(`${'Asset'.padEnd(28)} ${'Size'.padStart(10)} ${'Budget'.padStart(10)} ${'Gzip'.padStart(10)} ${'Gzip Limit'.padStart(10)} Status`);
  console.log(''.padEnd(76, '─'));

  for (const budget of BUDGETS) {
    const file = files.find(f => budget.pattern.test(f));
    if (!file) {
      console.warn(`⚠️ Warning: Pattern ${budget.pattern} not found in dist/assets`);
      continue;
    }

    const filePath = path.join(DIST_DIR, file);
    const content = fs.readFileSync(filePath);
    const rawSize = content.length;
    const gzipSize = zlib.gzipSync(content).length;

    const rawPass = rawSize <= budget.maxRaw;
    const gzipPass = gzipSize <= budget.maxGzip;
    const pass = rawPass && gzipPass;

    if (!pass) failed = true;

    const status = pass ? 'PASS ✅' : 'FAIL ❌';
    console.log(
      `${budget.name.padEnd(28)} ` +
      `${formatBytes(rawSize).padStart(10)} ` +
      `${formatBytes(budget.maxRaw).padStart(10)} ` +
      `${formatBytes(gzipSize).padStart(10)} ` +
      `${formatBytes(budget.maxGzip).padStart(10)} ` +
      ` ${status}`
    );
  }

  console.log(''.padEnd(76, '─'));

  if (failed) {
    console.error('❌ Bundle size exceeds performance budget thresholds!');
    process.exit(1);
  } else {
    console.log('✅ All bundle assets satisfy performance budget thresholds.\n');
  }
}

if (process.argv[1] && process.argv[1].endsWith('checkBundleSize.mjs')) {
  checkBundleBudgets();
}

