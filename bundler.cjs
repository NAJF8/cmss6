const fs = require('fs');

const makeStandalone = (htmlFile, jsFile) => {
    let html = fs.readFileSync(htmlFile, 'utf8');
    html = html.replace(/<script type="module">[\s\S]*?<\/script>/, '');
    let js = fs.readFileSync('js/' + jsFile, 'utf8');
    const combined = html.replace('</body>', '<script type="module">\n' + js + '\n</script>\n</body>');
    fs.writeFileSync(htmlFile, combined, 'utf8');
};

makeStandalone('admin.html', 'admin-app.js');
console.log('Bundled admin.html');
makeStandalone('employee.html', 'employee-app.js'); console.log('Bundled employee.html');
