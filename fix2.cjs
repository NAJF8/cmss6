const fs = require('fs');

let adminHtml = fs.readFileSync('admin.html', 'utf8');
adminHtml = adminHtml.split('\\`').join('`').split('\\$').join('$');
fs.writeFileSync('admin.html', adminHtml, 'utf8');

let empHtml = fs.readFileSync('employee.html', 'utf8');
empHtml = empHtml.split('\\`').join('`').split('\\$').join('$');
fs.writeFileSync('employee.html', empHtml, 'utf8');

console.log('Fixed backslashes using split/join!');
