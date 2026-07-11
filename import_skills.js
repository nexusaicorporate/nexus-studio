const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const libraryDir = path.join(__dirname, 'temp-gen-media-skills', 'library');
const outputFilePath = path.join(__dirname, 'public', 'data', 'templates.json');

let existingTemplates = [];
try {
  const data = fs.readFileSync(outputFilePath, 'utf8');
  let parsed = JSON.parse(data);
  existingTemplates = Array.isArray(parsed) ? parsed : (parsed.config || []);
  if (!Array.isArray(existingTemplates)) existingTemplates = [];
} catch (e) {
  existingTemplates = [];
}

const categories = fs.readdirSync(libraryDir);
let newTemplates = [];

for (const cat of categories) {
  const catPath = path.join(libraryDir, cat);
  if (!fs.statSync(catPath).isDirectory()) continue;
  
  const skills = fs.readdirSync(catPath);
  for (const skill of skills) {
    const skillPath = path.join(catPath, skill);
    if (!fs.statSync(skillPath).isDirectory()) continue;
    
    const skillFile = path.join(skillPath, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    
    let content = fs.readFileSync(skillFile, 'utf8');
    content = content.replace(/muapi\.ai/g, 'localhost:3001');
    content = content.replace(/muapi image edit/g, 'lmrouter image generate');
    content = content.replace(/muapi/g, 'lmrouter');

    let name = skill.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    newTemplates.push({
      id: crypto.randomUUID(),
      name: { en: name, cn: name },
      content: { en: content, cn: content },
      imageUrl: '',
      author: 'Generative Media Skills',
      tags: [cat]
    });
  }
}

const allTemplates = [...existingTemplates, ...newTemplates];
fs.writeFileSync(outputFilePath, JSON.stringify(allTemplates, null, 2));
console.log('Imported ' + newTemplates.length + ' recipes.');
