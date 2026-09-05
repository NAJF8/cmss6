const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

const regex = /console\.error\("Firebase read error on " \+ path, err\);[\s\S]*?}\);/;
const replacement = `console.error("Firebase read error on " + path, err);
                if (path === 'users') {
                    showToast('تنبيه: لم تقم بإضافة قواعد Firebase! (قاعدة البيانات مغلقة)', 'error');
                    if (!currentProfile && currentUser.email === 'mohameadalhaear100@gmail.com') {
                        currentProfile = { email: currentUser.email, name: 'المدير العام', roleId: 'super_admin', isSuperAdmin: true, status: 'active' };
                        document.getElementById('user-name').textContent = 'المدير العام';
                        renderPage(currentHash);
                    }
                }
            });`;

html = html.replace(regex, replacement);
fs.writeFileSync('admin.html', html, 'utf8');
console.log('Fixed');
