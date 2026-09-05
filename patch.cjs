const fs = require('fs');
let app = fs.readFileSync('js/admin-app.js', 'utf8');

const dash = fs.readFileSync('js/dashboard.js', 'utf8');
const seed = fs.readFileSync('js/seeder.js', 'utf8');

app = app.replace(/const renderDashboard = \(\) => {[\s\S]*?};\n/, dash + '\n');

const oldSettings = /const renderSettings = \(\) => {[\s\S]*?};\n/;
const newSettings = `const renderSettings = () => { 
    elContent.innerHTML = \`<div class="p-6 bg-surface rounded-xl border border-border">
        <h3 class="font-bold text-lg mb-4 text-primary">إعدادات النظام وإدارة البيانات</h3>
        <button onclick="seedDemoData()" class="bg-action text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
            ضخ البيانات التجريبية (Demo Data)
        </button>
        <p class="text-xs text-secondary mt-2">استخدم هذا الزر لملء النظام ببيانات تجريبية كاملة (مكائن، أعطال، أوامر عمل، مخزون) لتقييم التصميم بشكل واقعي.</p>
    </div>\`; 
};\n`;

if (app.match(oldSettings)) {
    app = app.replace(oldSettings, newSettings);
} else {
    // If not found, just append it
    app += '\n' + newSettings;
}

app = app + '\n' + seed;

fs.writeFileSync('js/admin-app.js', app, 'utf8');
console.log('App patched');
