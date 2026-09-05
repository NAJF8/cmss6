const fs = require('fs');

try {
    // 1. Process admin-app.js
    let adminJs = fs.readFileSync('js/admin-app.js', 'utf8');
    const assetsJs = fs.readFileSync('js/assets.js', 'utf8');
    
    // We want to replace the mock renderAssets with the real one from assetsJs
    // The mock one looks like: const renderAssets = () => { elContent.innerHTML = `<div...</div>`; };
    adminJs = adminJs.replace(/const renderAssets = \(\) => {[\s\S]*?};/, assetsJs);
    
    // 2. Process admin.html
    let adminHtml = fs.readFileSync('admin.html', 'utf8');
    if (!adminHtml.includes('qrcode.min.js')) {
        adminHtml = adminHtml.replace('</head>', '<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>\n</head>');
    }
    // Remove old script
    adminHtml = adminHtml.replace(/<script type="module">[\s\S]*?<\/script>/, '<script type="module">\n' + adminJs + '\n</script>');
    fs.writeFileSync('admin.html', adminHtml, 'utf8');
    console.log('admin.html built!');

    // 3. Process employee-app.js
    let empJs = fs.readFileSync('js/employee-app.js', 'utf8');
    const empQrJs = fs.readFileSync('js/emp-qr.js', 'utf8');
    empJs = empJs + '\n\n' + empQrJs;

    // 4. Process employee.html
    let empHtml = fs.readFileSync('employee.html', 'utf8');
    if (!empHtml.includes('html5-qrcode.min.js')) {
        empHtml = empHtml.replace('</head>', '<script src="https://cdnjs.cloudflare.com/ajax/libs/html5-qrcode/2.3.8/html5-qrcode.min.js"></script>\n</head>');
    }
    
    const newNav = `
<nav class="bg-surface border-t border-border flex justify-around p-3 shrink-0 fixed bottom-0 w-full z-20 pb-safe">
    <button class="nav-btn flex flex-col items-center gap-1 w-16 text-action font-bold" data-tab="home">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
        <span class="text-[10px]">الرئيسية</span>
    </button>
    <button class="nav-btn flex flex-col items-center gap-1 w-16 text-secondary relative" data-tab="scan">
        <div class="absolute -top-6 bg-action text-white p-3 rounded-full shadow-lg border-4 border-background">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        </div>
        <span class="text-[10px] mt-6">مسح QR</span>
    </button>
    <button class="nav-btn flex flex-col items-center gap-1 w-16 text-secondary" data-tab="tasks">
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
        <span class="text-[10px]">مهامي</span>
    </button>
</nav>
`;
    empHtml = empHtml.replace(/<nav class="bg-surface border-t border-border flex justify-around p-3 shrink-0 fixed bottom-0 w-full z-20 pb-safe">[\s\S]*?<\/nav>/, newNav);
    empHtml = empHtml.replace(/<script type="module">[\s\S]*?<\/script>/, '<script type="module">\n' + empJs + '\n</script>');
    fs.writeFileSync('employee.html', empHtml, 'utf8');
    console.log('employee.html built!');
} catch (e) {
    console.error(e);
}
