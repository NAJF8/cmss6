const fs = require('fs');

const fixFile = (file) => {
    let content = fs.readFileSync(file, 'utf8');
    content = content.split('\\$').join('$');
    content = content.split('\\`').join('`');
    fs.writeFileSync(file, content, 'utf8');
};

fixFile('js/dashboard.js');
fixFile('js/admin-app.js');
fixFile('js/employee-app.js');
fixFile('js/assets.js');
fixFile('js/emp-qr.js');

console.log('Fixed literals');
