const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, isApp) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('http://localhost:5000/api')) return;

    // Regex to match 'http://localhost:5000/api...', "http://localhost:5000/api...", or `http://localhost:5000/api...`
    const regex = /['"`]http:\/\/localhost:5000\/api(.*?)['"`]/g;
    
    // Replace with `${API_URL}...`
    let newContent = content.replace(regex, (match, p1) => {
        return `\`\${API_URL}${p1}\``;
    });

    // Insert import at the top
    const importPath = isApp ? './config' : '../config';
    const importStmt = `import { API_URL } from '${importPath}';\n`;
    
    // add import after the last import, or at top
    if (!newContent.includes(importStmt.trim())) {
        const lines = newContent.split('\n');
        let lastImportIdx = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import ')) {
                lastImportIdx = i;
            }
        }
        if (lastImportIdx !== -1) {
            lines.splice(lastImportIdx + 1, 0, importStmt.trim());
        } else {
            lines.unshift(importStmt.trim());
        }
        newContent = lines.join('\n');
    }

    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated ${filePath}`);
}

const srcDir = path.join(__dirname, '..', 'src');
const compDir = path.join(srcDir, 'components');

const appFile = path.join(srcDir, 'App.jsx');
replaceInFile(appFile, true);

fs.readdirSync(compDir).forEach(file => {
    if (file.endsWith('.jsx')) {
        replaceInFile(path.join(compDir, file), false);
    }
});
