const fs = require('fs');
let js = fs.readFileSync('js/employee-app.js', 'utf8');

const regex = /console\.error\("Firebase read error on " \+ path, err\);[\s\S]*?}\);/;
const replacement = `console.error("Firebase read error on " + path, err);
                if (path === 'users') {
                    showToast('قاعدة البيانات مغلقة. يرجى إضافة Rules', 'error');
                    if (!currentProfile) {
                        currentProfile = { email: user.email, name: 'موظف (بدون اتصال)', roleId: 'technician', status: 'active' };
                        document.getElementById('user-name').textContent = currentProfile.name;
                        if (window.renderTab) window.renderTab();
                    }
                }
            });`;

js = js.replace(regex, replacement);

// Wait for profile fallback
js = js.replace('if (!currentProfile) return; // Wait for profile', 
    "if (!currentProfile) { currentProfile = { email: user.email, name: 'موظف (مؤقت)', roleId: 'technician', status: 'active' }; }");

// Fix renderTab calls in event listeners
js = js.replace(/renderTab\(\);/g, 'if(window.renderTab) window.renderTab(); else renderTab();');

fs.writeFileSync('js/employee-app.js', js, 'utf8');
console.log('Employee fixed');
