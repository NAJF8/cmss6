import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getDatabase, ref, get, set, update, push, child, onValue, remove } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const firebaseConfig = { apiKey: "AIzaSyDtzonzkDsEvF9KNXi70j6ZTXG5kLAM_0c", authDomain: "cmms-37512.firebaseapp.com", databaseURL: "https://cmms-37512-default-rtdb.firebaseio.com", projectId: "cmms-37512", storageBucket: "cmms-37512.firebasestorage.app", messagingSenderId: "451592788539", appId: "1:451592788539:web:d3dc3e68b1543996b39a1e" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// --- UI Utilities ---
const showToast = (msg, type = 'success') => {
    const c = document.getElementById('toast-container');
    const d = document.createElement('div');
    d.className = `p-4 rounded-lg shadow-lg font-bold text-white flex items-center justify-between ${type === 'success' ? 'bg-success' : 'bg-danger'}`;
    d.textContent = msg;
    c.appendChild(d);
    setTimeout(() => {
        d.style.opacity = '0';
        d.style.transition = 'opacity 0.3s';
        setTimeout(() => d.remove(), 300);
    }, 3000);
};

const elLogin = document.getElementById('login-view');
const elApp = document.getElementById('app-view');
const elContent = document.getElementById('content');

let currentUser = null;
let currentProfile = null;
let currentHash = '#dashboard';
let dbData = { assets: {}, workOrders: {}, breakdowns: {}, users: {}, roles: {}, spareParts: {}, settings: {}, auditLogs: {} };

// Define Default Roles and their base permissions if not in DB
const DEFAULT_ROLES = {
    super_admin: { name: 'Super Admin', permissions: ['*'] },
    admin: { name: 'Admin', permissions: ['assets.view', 'assets.edit', 'assets.create', 'work_orders.view', 'work_orders.create', 'work_orders.assign', 'inventory.view', 'users.view'] },
    technician: { name: 'فني صيانة', permissions: ['assets.view', 'work_orders.view', 'work_orders.start', 'work_orders.complete', 'inventory.view', 'inventory.issue'] },
    warehouse: { name: 'أمين مخزن', permissions: ['inventory.view', 'inventory.receive', 'inventory.issue'] }
};

// Check if user has permission
const hasPerm = (perm) => {
    if (!currentProfile) return false;
    if (currentProfile.isSuperAdmin) return true;
    
    let perms = [];
    // Load from user role in dbData if exists
    if (currentProfile.roleId && dbData.roles[currentProfile.roleId]) {
        perms = dbData.roles[currentProfile.roleId].permissions || [];
    } else if (currentProfile.roleId && DEFAULT_ROLES[currentProfile.roleId]) {
        perms = DEFAULT_ROLES[currentProfile.roleId].permissions;
    }
    
    // Add overrides
    if (currentProfile.permissionsOverride) {
        currentProfile.permissionsOverride.forEach(p => {
            if (p.startsWith('-')) {
                perms = perms.filter(x => x !== p.substring(1));
            } else {
                perms.push(p);
            }
        });
    }

    if (perms.includes('*')) return true;
    return perms.includes(perm);
};

// --- Authentication ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value);
    } catch (err) {
        document.getElementById('login-error').textContent = 'بيانات الدخول غير صحيحة';
        document.getElementById('login-error').classList.remove('hide');
    }
});

document.getElementById('btn-google').addEventListener('click', async () => {
    try { await signInWithPopup(auth, googleProvider); }
    catch (err) { console.error(err); document.getElementById('login-error').textContent = 'فشل الدخول: ' + (err.message.includes('unauthorized-domain') ? 'يجب إضافة الدومين في Firebase' : 'تأكد من بياناتك'); document.getElementById('login-error').classList.remove('hide'); }
});

document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // Listeners for whole DB (simplified for MVP, in production use separate listeners)
        ['assets', 'workOrders', 'breakdowns', 'users', 'roles', 'spareParts', 'settings', 'auditLogs'].forEach(path => {
            onValue(ref(db, path), (snap) => {
                dbData[path] = snap.val() || {};
                
                // If this is the users update, grab our profile
                if (path === 'users' || path === 'roles') {
                    currentProfile = Object.values(dbData.users).find(u => u.email === user.email);
                    if (currentProfile) {
                        // Check status
                        if (currentProfile.status === 'disabled' && currentProfile.email !== 'mohameadalhaear100@gmail.com') {
                            showToast('تم تعطيل حسابك', 'error');
                            signOut(auth);
                            return;
                        }
                        
                        document.getElementById('user-name').textContent = currentProfile.name || user.email;
                        document.getElementById('user-role').textContent = dbData.roles[currentProfile.roleId]?.name || DEFAULT_ROLES[currentProfile.roleId]?.name || currentProfile.roleId;
                        document.getElementById('user-initial').textContent = (currentProfile.name || user.email)[0].toUpperCase();
                        
                        renderPage(currentHash);
                    }
                } else if (currentProfile) {
                    // Update current page if data changed
                    renderPage(currentHash);
                }
            }, (err) => {
                console.error("Firebase read error on " + path, err);
                if (path === 'users') {
                    showToast('تنبيه: لم تقم بإضافة قواعد Firebase! (قاعدة البيانات مغلقة)', 'error');
                    if (!currentProfile && currentUser.email === 'mohameadalhaear100@gmail.com') {
                        currentProfile = { email: currentUser.email, name: 'المدير العام', roleId: 'super_admin', isSuperAdmin: true, status: 'active' };
                        document.getElementById('user-name').textContent = 'المدير العام';
                        renderPage(currentHash);
                    }
                }
            });
        });

        // Super Admin Bootstrap
        if (user.email === 'mohameadalhaear100@gmail.com') {
            const superRef = ref(db, 'users/' + user.uid);
            get(superRef).then(snap => {
                if (!snap.exists()) {
                    set(superRef, { email: user.email, name: 'المدير العام', roleId: 'super_admin', isSuperAdmin: true, status: 'active', createdAt: Date.now() });
                }
            });
        }

        elLogin.classList.add('hide');
        elApp.classList.remove('hide');
        
    } else {
        elLogin.classList.remove('hide');
        elApp.classList.add('hide');
        currentUser = null;
        currentProfile = null;
    }
});

// --- Routing & Navigation ---
const getAllNavs = () => [
    { id: 'dashboard', label: 'لوحة التحكم', section: 'الرئيسية', perm: '*' }, // Everyone can see dashboard
    { id: 'assets', label: 'المكائن والأصول', section: 'الصيانة', perm: 'assets.view' },
    { id: 'workorders', label: 'أوامر العمل', section: 'الصيانة', perm: 'work_orders.view' },
    { id: 'breakdowns', label: 'الأعطال', section: 'الصيانة', perm: 'work_orders.view' },
    { id: 'inventory', label: 'قطع الغيار', section: 'المخزون', perm: 'inventory.view' },
    { id: 'employees', label: 'الموظفون', section: 'الإدارة', perm: 'employees.view' },
    { id: 'users', label: 'المستخدمون والصلاحيات', section: 'الإدارة', perm: 'users.view' },
    { id: 'audit', label: 'سجل النظام', section: 'النظام', perm: 'audit.view' }
];

const renderSidebar = () => {
    let html = '';
    let curSec = '';
    const visibleNavs = getAllNavs().filter(n => n.perm === '*' || hasPerm(n.perm));
    
    visibleNavs.forEach(n => {
        if (n.section !== curSec) {
            curSec = n.section;
            html += `<div class="px-6 py-3 mt-4 text-xs font-bold text-gray-500 uppercase tracking-wider">${curSec}</div>`;
        }
        html += `<a href="#${n.id}" class="nav-link block px-6 py-3 text-sm ${currentHash === '#' + n.id ? 'active' : 'text-gray-400 hover:text-white'}">${n.label}</a>`;
    });
    document.getElementById('sidebar').innerHTML = html;
};

const renderPage = (hash) => {
    if (!currentProfile && currentUser.email === 'mohameadalhaear100@gmail.com') { currentProfile = { email: currentUser.email, name: 'المدير العام', roleId: 'super_admin', isSuperAdmin: true, status: 'active' }; } else if (!currentProfile) return;
    currentHash = hash || '#dashboard';
    
    const visibleNavs = getAllNavs().filter(n => n.perm === '*' || hasPerm(n.perm));
    const pageConfig = visibleNavs.find(n => '#' + n.id === currentHash);
    
    // Protection
    if (!pageConfig && currentHash !== '#dashboard') {
        elContent.innerHTML = `<div class="p-8 text-center text-danger font-bold">عذراً، ليس لديك الصلاحية للوصول إلى هذه الصفحة.</div>`;
        renderSidebar();
        return;
    }

    renderSidebar();
    document.getElementById('page-title').textContent = pageConfig ? pageConfig.label : 'لوحة التحكم';
    
    switch(currentHash) {
        case '#dashboard': renderDashboard(); break;
        case '#assets': renderAssets(); break;
        case '#workorders': renderWorkOrders(); break;
        case '#breakdowns': renderBreakdowns(); break;
        case '#inventory': renderInventory(); break;
        case '#employees': renderEmployees(); break;
        case '#users': renderUsers(); break;
        case '#audit': renderAudit(); break;
        default: renderDashboard();
    }
};

window.addEventListener('hashchange', () => { if (currentUser) renderPage(window.location.hash); });

// --- Modals ---
window.openModal = (title, bodyHtml, onSave) => {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = bodyHtml;
    document.getElementById('modal-container').classList.remove('hide');
    document.getElementById('modal-save').onclick = async () => {
        const btn = document.getElementById('modal-save');
        btn.disabled = true; btn.textContent = 'جاري الحفظ...';
        try {
            if (await onSave()) document.getElementById('modal-container').classList.add('hide');
        } catch(e) {
            showToast(e.message || 'خطأ في الحفظ', 'error');
        } finally {
            btn.disabled = false; btn.textContent = 'حفظ';
        }
    };
};

window.closeModal = () => document.getElementById('modal-container').classList.add('hide');

// --- Generic Table Component ---
const createTable = (headers, rows, addFn, addLabel) => `
    <div class="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div class="relative w-full sm:w-80">
            <input type="text" placeholder="بحث..." class="w-full border border-border rounded-lg pl-3 pr-10 py-2.5 text-sm outline-none focus:border-action transition shadow-sm">
            <svg class="w-5 h-5 text-gray-400 absolute right-3 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
        ${addFn ? `<button onclick="${addFn}" class="bg-action text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition shadow-sm whitespace-nowrap flex gap-2 items-center"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>${addLabel}</button>` : ''}
    </div>
    <div class="bg-surface rounded-xl border border-border shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-sm text-right">
                <thead class="bg-gray-50/80 text-secondary border-b border-border">
                    <tr>${headers.map(h => `<th class="p-4 font-bold whitespace-nowrap">${h}</th>`).join('')}</tr>
                </thead>
                <tbody class="divide-y divide-border">
                    ${rows.length ? rows.join('') : `<tr><td colspan="${headers.length}" class="p-12 text-center text-secondary font-bold text-base">لا توجد بيانات للعرض</td></tr>`}
                </tbody>
            </table>
        </div>
        <div class="p-4 border-t border-border bg-gray-50/50 flex justify-between items-center text-xs text-secondary font-bold">
            <div>إجمالي السجلات: ${rows.length}</div>
        </div>
    </div>
`;

// Helper: Log audit
const logAudit = (action, details) => {
    push(ref(db, 'auditLogs'), {
        user: currentProfile?.email || 'System',
        action,
        details,
        date: Date.now()
    }).catch(console.error);
};

// --- Pages ---

// Dashboard (Basic version for now)
const renderDashboard = () => {
    const assets = Object.values(dbData.assets || {});
    const wos = Object.values(dbData.workOrders || {});
    
    elContent.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-surface p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
                <div><div class="text-secondary text-sm font-bold mb-1">إجمالي المكائن</div><div class="text-3xl font-extrabold text-primary">${assets.length}</div></div>
            </div>
            <div class="bg-surface p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
                <div><div class="text-secondary text-sm font-bold mb-1">عاملة / متوقفة</div><div class="text-3xl font-extrabold text-success">${assets.filter(a=>a.status==='active').length} <span class="text-lg text-gray-300">/</span> <span class="text-danger">${assets.filter(a=>a.status==='stopped').length}</span></div></div>
            </div>
            <div class="bg-surface p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
                <div><div class="text-secondary text-sm font-bold mb-1">أوامر مفتوحة</div><div class="text-3xl font-extrabold text-warning">${wos.filter(w=>w.status!=='مكتمل').length}</div></div>
            </div>
            <div class="bg-surface p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
                <div><div class="text-secondary text-sm font-bold mb-1">بلاغات الأعطال</div><div class="text-3xl font-extrabold text-danger">${Object.values(dbData.breakdowns || {}).length}</div></div>
            </div>
        </div>
    `;
};

// ... Assets, Work Orders, Breakdowns, Inventory remain similar for now, just adding checks ...
// --- ASSETS (PHASE 2 IMPLEMENTATION) ---

let currentAssetsPage = 1;
const itemsPerPage = 10;

window.openAssetProfile = (assetId) => {
    const a = dbData.assets[assetId];
    if (!a) return;
    
    openModal("ملف الماكينة: " + a.name, `
        <div class="flex flex-col h-full">
            <div class="flex border-b border-border mb-4">
                <button class="px-4 py-2 font-bold text-action border-b-2 border-action">نظرة عامة</button>
                <button class="px-4 py-2 font-bold text-secondary hover:text-primary">أوامر العمل</button>
                <button class="px-4 py-2 font-bold text-secondary hover:text-primary">سجل الأعطال</button>
            </div>
            
            <div class="flex-1 overflow-y-auto">
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <div class="p-4 bg-gray-50 rounded-xl border border-border">
                        <div class="text-xs text-secondary font-bold mb-1">الرقم التعريفي (ID)</div>
                        <div class="font-bold text-primary" dir="ltr">${a.code || assetId}</div>
                    </div>
                    <div class="p-4 bg-gray-50 rounded-xl border border-border">
                        <div class="text-xs text-secondary font-bold mb-1">القسم / خط الإنتاج</div>
                        <div class="font-bold text-primary">${a.department || '-'}</div>
                    </div>
                    <div class="p-4 bg-gray-50 rounded-xl border border-border">
                        <div class="text-xs text-secondary font-bold mb-1">الحالة الحالية</div>
                        <div class="font-bold text-primary">${a.status === 'active' ? '<span class="text-success">● تعمل</span>' : '<span class="text-danger">● متوقفة</span>'}</div>
                    </div>
                    <div class="p-4 bg-gray-50 rounded-xl border border-border">
                        <div class="text-xs text-secondary font-bold mb-1">تاريخ الإضافة</div>
                        <div class="font-bold text-primary" dir="ltr">${a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-GB') : '-'}</div>
                    </div>
                </div>
                
                <div class="border border-border p-5 rounded-xl shadow-sm text-center flex flex-col items-center justify-center">
                    <h4 class="font-bold mb-4">رمز QR للماكينة</h4>
                    <div id="qrcode-${assetId}" class="mb-4 bg-white p-2 border border-border rounded inline-block mx-auto"></div>
                    <button onclick="window.print()" class="text-sm bg-gray-100 px-4 py-2 rounded-lg font-bold hover:bg-gray-200">طباعة الرمز</button>
                </div>
            </div>
        </div>
    `, async () => {
        return true; 
    });

    setTimeout(() => {
        if(window.QRCode && document.getElementById('qrcode-' + assetId)) {
            document.getElementById('qrcode-' + assetId).innerHTML = '';
            new QRCode(document.getElementById('qrcode-' + assetId), {
                text: assetId,
                width: 128,
                height: 128
            });
        }
    }, 200);
};

window.openAddAsset = () => {
    if (!hasPerm('assets.create')) return showToast('لا تملك الصلاحية', 'error');
    openModal("إضافة ماكينة جديدة", `
        <div class="space-y-4">
            <div><label class="block text-sm font-bold mb-2">الاسم <span class="text-danger">*</span></label><input id="a-name" type="text" class="w-full border border-border p-2.5 rounded-lg focus:border-action outline-none"></div>
            <div><label class="block text-sm font-bold mb-2">رقم الماكينة (ID)</label><input id="a-code" type="text" class="w-full border border-border p-2.5 rounded-lg focus:border-action outline-none" dir="ltr"></div>
            <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-sm font-bold mb-2">القسم</label><input id="a-dep" type="text" class="w-full border border-border p-2.5 rounded-lg focus:border-action outline-none"></div>
                <div><label class="block text-sm font-bold mb-2">خط الإنتاج</label><input id="a-line" type="text" class="w-full border border-border p-2.5 rounded-lg focus:border-action outline-none"></div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-sm font-bold mb-2">الحالة</label>
                    <select id="a-status" class="w-full border border-border p-2.5 rounded-lg focus:border-action outline-none"><option value="active">عاملة</option><option value="stopped">متوقفة</option></select>
                </div>
                <div><label class="block text-sm font-bold mb-2">الأهمية (Criticality)</label>
                    <select id="a-crit" class="w-full border border-border p-2.5 rounded-lg focus:border-action outline-none"><option value="normal">عادية (C)</option><option value="important">مهمة (B)</option><option value="critical">حرجة (A)</option></select>
                </div>
            </div>
        </div>
    `, async () => {
        const name = document.getElementById('a-name').value;
        if (!name) throw new Error('الاسم مطلوب');
        const assetId = "AST-" + Date.now().toString().slice(-6);
        await set(ref(db, 'assets/' + assetId), { 
            name, 
            code: document.getElementById('a-code').value || assetId, 
            department: document.getElementById('a-dep').value,
            line: document.getElementById('a-line').value,
            status: document.getElementById('a-status').value,
            criticality: document.getElementById('a-crit').value,
            createdAt: Date.now()
        });
        logAudit('إضافة ماكينة', `الماكينة: ${name}`);
        showToast('تمت الإضافة بنجاح'); return true;
    });
};

window.deleteAsset = async (id) => {
    if (!hasPerm('assets.delete')) return showToast('لا تملك الصلاحية', 'error');
    if (confirm('هل أنت متأكد من حذف هذه الماكينة؟')) {
        await remove(ref(db, 'assets/' + id));
        showToast('تم حذف الماكينة');
        logAudit('حذف ماكينة', `ID: ${id}`);
    }
};

const renderAssets = () => {
    let assetsList = Object.entries(dbData.assets || {});
    
    const rows = assetsList.map(([id, a]) => {
        let critBadge = '';
        if (a.criticality === 'critical') critBadge = '<span class="text-danger font-bold text-xs bg-red-50 px-2 py-1 rounded">حرجة A</span>';
        else if (a.criticality === 'important') critBadge = '<span class="text-warning font-bold text-xs bg-yellow-50 px-2 py-1 rounded">مهمة B</span>';
        else critBadge = '<span class="text-secondary font-bold text-xs bg-gray-100 px-2 py-1 rounded">عادية C</span>';

        let actions = `<button onclick="openAssetProfile('${id}')" class="text-xs text-action hover:text-blue-700 font-bold px-2 py-1 bg-blue-50 rounded mr-2">عرض الملف</button>`;
        if (hasPerm('assets.delete')) {
            actions += `<button onclick="deleteAsset('${id}')" class="text-xs text-danger hover:text-red-700 font-bold px-2 py-1 bg-red-50 rounded">حذف</button>`;
        }

        return `
        <tr class="hover:bg-gray-50 transition border-b border-border">
            <td class="p-4 font-bold text-primary">${a.name}</td>
            <td class="p-4 text-xs font-bold text-secondary" dir="ltr">${a.code||id}</td>
            <td class="p-4 text-sm">${a.department||'-'}</td>
            <td class="p-4">${a.status==='active'?'<span class="inline-flex items-center gap-1 text-success text-xs font-bold"><span class="w-2 h-2 rounded-full bg-success"></span> تعمل</span>':'<span class="inline-flex items-center gap-1 text-danger text-xs font-bold"><span class="w-2 h-2 rounded-full bg-danger"></span> متوقفة</span>'}</td>
            <td class="p-4">${critBadge}</td>
            <td class="p-4">${actions}</td>
        </tr>
    `});

    elContent.innerHTML = createTable(['الماكينة', 'ID', 'القسم', 'الحالة', 'الأهمية', 'الإجراءات'], rows, hasPerm('assets.create') ? 'openAddAsset()' : null, 'إضافة ماكينة');
};

const renderWorkOrders = () => { elContent.innerHTML = `<div class="p-4 bg-yellow-50 text-warning font-bold rounded">جاري تطوير الأوامر (المرحلة 3)</div>`; };
const renderBreakdowns = () => { elContent.innerHTML = `<div class="p-4 bg-yellow-50 text-warning font-bold rounded">جاري تطوير الأعطال (المرحلة 3)</div>`; };
const renderInventory = () => { elContent.innerHTML = `<div class="p-4 bg-yellow-50 text-warning font-bold rounded">جاري تطوير المخازن (المرحلة 4)</div>`; };
const renderEmployees = () => { elContent.innerHTML = `<div class="p-4 bg-yellow-50 text-warning font-bold rounded">جاري تخصيص الموظفين (المرحلة 1 ب)</div>`; };
const renderAudit = () => { 
    const rows = Object.values(dbData.auditLogs || {}).sort((a,b)=>b.date-a.date).slice(0, 50).map(a => `
        <tr class="hover:bg-gray-50 transition">
            <td class="p-4 font-bold text-primary text-xs" dir="ltr">${new Date(a.date).toLocaleString('en-GB')}</td>
            <td class="p-4 text-sm">${a.action}</td>
            <td class="p-4 text-xs font-bold text-secondary">${a.user||'-'}</td>
        </tr>
    `);
    elContent.innerHTML = createTable(['التاريخ', 'الحدث', 'المستخدم'], rows, null, null);
};

// --- USERS & PERMISSIONS (PHASE 1 IMPLEMENTATION) ---

window.openAddUser = () => {
    if (!hasPerm('users.create')) return showToast('ليس لديك صلاحية لإضافة مستخدم', 'error');
    
    const roleOptions = Object.entries(DEFAULT_ROLES).map(([id, r]) => `<option value="${id}">${r.name}</option>`).join('');
    
    openModal("إضافة مستخدم جديد", `
        <div class="space-y-4">
            <div><label class="block text-sm font-bold mb-2">البريد الإلكتروني <span class="text-danger">*</span></label><input id="u-email" type="email" class="w-full border border-border p-2.5 rounded-lg" dir="ltr"></div>
            <div><label class="block text-sm font-bold mb-2">الاسم</label><input id="u-name" type="text" class="w-full border border-border p-2.5 rounded-lg"></div>
            <div><label class="block text-sm font-bold mb-2">الدور (Role)</label><select id="u-role" class="w-full border border-border p-2.5 rounded-lg">${roleOptions}</select></div>
        </div>
    `, async () => {
        const email = document.getElementById('u-email').value;
        if (!email) throw new Error('البريد مطلوب');
        // Push user logic. (In real CMMS we'd use a Cloud Function. Here we save to RTDB)
        const newUserRef = push(ref(db, 'users'));
        await set(newUserRef, { email, name: document.getElementById('u-name').value, roleId: document.getElementById('u-role').value, status: 'active', createdAt: Date.now() });
        logAudit('إضافة مستخدم', `البريد: ${email}`);
        showToast('تمت إضافة المستخدم');
        return true;
    });
};

window.toggleUserStatus = async (uid, currentStatus, isSuperAdmin) => {
    if (!hasPerm('users.edit')) return showToast('لا تملك الصلاحية', 'error');
    if (isSuperAdmin === 'true') return showToast('لا يمكن تعديل حالة Super Admin', 'error');
    
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    await update(ref(db, 'users/' + uid), { status: newStatus });
    logAudit(newStatus === 'active' ? 'تفعيل مستخدم' : 'تعطيل مستخدم', `UID: ${uid}`);
    showToast('تم التحديث بنجاح');
};

const renderUsers = () => {
    const rows = Object.entries(dbData.users || {}).map(([uid, u]) => {
        const roleName = dbData.roles[u.roleId]?.name || DEFAULT_ROLES[u.roleId]?.name || u.roleId;
        const statusBadge = u.status === 'active' ? '<span class="text-success bg-green-50 px-2 py-1 rounded">نشط</span>' : '<span class="text-danger bg-red-50 px-2 py-1 rounded">معطل</span>';
        
        let actions = ``;
        if (hasPerm('users.edit') && !u.isSuperAdmin) {
            actions += `<button onclick="toggleUserStatus('${uid}', '${u.status}', '${u.isSuperAdmin}')" class="text-xs text-secondary hover:text-primary font-bold px-2 py-1 bg-gray-100 rounded mr-2">تغيير الحالة</button>`;
        }
        if (u.isSuperAdmin) {
            actions = `<span class="text-xs text-gray-400 font-bold">صلاحيات مطلقة</span>`;
        }

        return `
        <tr class="hover:bg-gray-50 transition border-b border-border">
            <td class="p-4 font-bold text-primary">${u.name||'-'} ${u.isSuperAdmin ? '⭐' : ''}</td>
            <td class="p-4 text-xs font-bold text-secondary" dir="ltr">${u.email}</td>
            <td class="p-4 text-xs font-bold">${roleName}</td>
            <td class="p-4 text-xs font-bold">${statusBadge}</td>
            <td class="p-4">${actions}</td>
        </tr>
    `});
    
    elContent.innerHTML = createTable(['الاسم', 'البريد', 'الدور', 'الحالة', 'الإجراءات'], rows, hasPerm('users.create') ? 'openAddUser()' : null, 'مستخدم جديد');
};


