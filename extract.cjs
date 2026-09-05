const fs = require('fs');
if (!fs.existsSync('js')) fs.mkdirSync('js');
const html = fs.readFileSync('admin.html', 'utf8');
const scriptMatch = html.match(/<script type="module">[\r\n]+([\s\S]*?)<\/script>/);
if (scriptMatch) { fs.writeFileSync('js/admin-app.js', scriptMatch[1], 'utf8'); console.log('Extracted admin'); }

const empHtml = fs.readFileSync('employee.html', 'utf8');
const empMatch = empHtml.match(/<script type="module">[\r\n]+([\s\S]*?)<\/script>/);
if (empMatch) { fs.writeFileSync('js/employee-app.js', empMatch[1], 'utf8'); console.log('Extracted emp'); }
