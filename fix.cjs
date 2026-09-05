const fs = require('fs');
let html = fs.readFileSync('admin.html', 'utf8');

html = html.replace('if (!currentProfile) return; // Wait for profile', 
    "if (!currentProfile && currentUser.email === 'mohameadalhaear100@gmail.com') { currentProfile = { email: currentUser.email, name: 'المدير العام', roleId: 'super_admin', isSuperAdmin: true, status: 'active' }; } else if (!currentProfile) return;");

html = html.replace("catch (err) { document.getElementById('login-error').textContent = 'فشل الدخول'; document.getElementById('login-error').classList.remove('hide'); }", 
    "catch (err) { console.error(err); document.getElementById('login-error').textContent = 'فشل الدخول: ' + (err.message.includes('unauthorized-domain') ? 'يجب إضافة الدومين في Firebase' : 'تأكد من بياناتك'); document.getElementById('login-error').classList.remove('hide'); }");

fs.writeFileSync('admin.html', html, 'utf8');
console.log('Fixed admin.html');
