const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'modules', 'ijazah', 'controller.ts');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix gradesPreview
// Find: if (!map) return false;
// Replace: if (!map) return true; // Fallback to global if not mapped yet
content = content.replace(/if \(!map\) return false;/g, 'if (!map) return true; // Default to global if mapping not set');

// 2. Fix getPreview mapping check
const getPreviewRegex = /const map = mappings\.find\(m => m\.subjectId === subj\.id\);\s*if \(!map\) continue;/g;
content = content.replace(getPreviewRegex, `const map = mappings.find(m => m.subjectId === subj.id);
        const isGlobal = !map || !map.classIds || (map.classIds as string[]).length === 0;
        if (!isGlobal && !(map!.classIds as string[]).includes(classId)) continue;`);

// 3. We also need to fix downloadTemplate in controller.ts
// It had: if (!(map as any)[mappingSemKey]) return false;
// We need to handle if map is undefined
const downloadRegex = /if \(!\(\map as any\)\[mappingSemKey\]\) return false;/g;
content = content.replace(downloadRegex, `if (map && !(map as any)[mappingSemKey]) return false;`);

fs.writeFileSync(filePath, content, 'utf8');
console.log('controller.ts patched for mapping fallbacks!');
