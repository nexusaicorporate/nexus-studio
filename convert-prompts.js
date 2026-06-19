const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dir = path.join(__dirname, 'temp-prompts');
const files = fs.readdirSync(dir);
const prompts = [];

function generateId() {
  return crypto.randomUUID();
}

for (const file of files) {
  if (!file.endsWith('.md') || file.toLowerCase() === 'readme.md') continue;
  
  const content = fs.readFileSync(path.join(dir, file), 'utf8');
  if (!content.trim()) continue;
  
  // Format title from filename
  let title = file.replace(/\.md$/, '')
                  .replace(/[_-]/g, ' ')
                  .replace(/([a-z])([A-Z])/g, '$1 $2')
                  .trim();
  
  // Capitalize first letters
  title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  prompts.push({
    id: generateId(),
    title: title,
    category: "Imported",
    subcategory: "MD Repo",
    body: content,
    tags: [],
    modes: ["T2T"],
    nsfw: false,
    mediaType: "text",
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

fs.writeFileSync(path.join(__dirname, 'public', 'imported_prompts.json'), JSON.stringify(prompts, null, 2));
console.log(`Converted ${prompts.length} files to public/imported_prompts.json`);
