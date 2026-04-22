
const fs = require('fs');
const content = fs.readFileSync('src/Dashboard.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('button')) {
        console.log(`${i + 1}: ${line}`);
    }
});
