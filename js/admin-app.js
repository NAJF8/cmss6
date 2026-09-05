import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getDatabase, ref, get, set, update, push, child, onValue, remove } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const firebaseConfig = { apiKey: "AIzaSyDtzonzkDsEvF9KNXi70j6ZTXG5kLAM_0c", authDomain: "cmms-37512.firebaseapp.com", databaseURL: "https://cmms-37512-default-rtdb.asia-southeast1.firebasedatabase.app", projectId: "cmms-37512", storageBucket: "cmms-37512.firebasestorage.app", messagingSenderId: "451592788539", appId: "1:451592788539:web:d3dc3e68b1543996b39a1e" };
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
// --- ENTERPRISE DASHBOARD ---

const renderDashboard = () => {
    const assets = Object.values(dbData.assets || {});
    const wos = Object.values(dbData.workOrders || {});
    const parts = Object.values(dbData.spareParts || {});
    const brks = Object.values(dbData.breakdowns || {});
    
    const totalAssets = assets.length;
    const running = assets.filter(a => a.status === 'active').length;
    const stopped = assets.filter(a => a.status === 'stopped').length;
    const openWos = wos.filter(w => w.status !== 'Completed').length;
    const activeBrks = brks.filter(b => b.status !== 'Closed').length;
    const criticalBrks = brks.filter(b => b.priority === 'critical' && b.status !== 'Closed').length;
    const lowStock = parts.filter(p => p.qty <= p.min).length;
    
    // Calculate Availability
    const availability = totalAssets ? ((running / totalAssets) * 100).toFixed(1) : 0;

    elContent.innerHTML = `
        <!-- ROW 1: 8 KPI CARDS -->
        <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
            <div class="bg-surface p-4 rounded-xl border border-border flex flex-col justify-between">
                <div class="text-[11px] text-secondary font-bold mb-2">إجمالي المكائن</div>
                <div class="text-2xl font-extrabold text-primary">${totalAssets}</div>
            </div>
            <div class="bg-surface p-4 rounded-xl border border-border border-l-4 border-l-success flex flex-col justify-between">
                <div class="text-[11px] text-secondary font-bold mb-2">تعمل</div>
                <div class="text-2xl font-extrabold text-success">${running}</div>
            </div>
            <div class="bg-surface p-4 rounded-xl border border-border border-l-4 border-l-danger flex flex-col justify-between">
                <div class="text-[11px] text-secondary font-bold mb-2">متوقفة</div>
                <div class="text-2xl font-extrabold text-danger">${stopped}</div>
            </div>
            <div class="bg-surface p-4 rounded-xl border border-border flex flex-col justify-between">
                <div class="text-[11px] text-secondary font-bold mb-2">أعطال نشطة</div>
                <div class="text-2xl font-extrabold text-primary">${activeBrks}</div>
            </div>
            <div class="bg-surface p-4 rounded-xl border border-border border-l-4 border-l-red-800 flex flex-col justify-between">
                <div class="text-[11px] text-secondary font-bold mb-2">أعطال حرجة</div>
                <div class="text-2xl font-extrabold text-red-800">${criticalBrks}</div>
            </div>
            <div class="bg-surface p-4 rounded-xl border border-border flex flex-col justify-between">
                <div class="text-[11px] text-secondary font-bold mb-2">أوامر مفتوحة</div>
                <div class="text-2xl font-extrabold text-action">${openWos}</div>
            </div>
            <div class="bg-surface p-4 rounded-xl border border-border border-l-4 border-l-warning flex flex-col justify-between">
                <div class="text-[11px] text-secondary font-bold mb-2">Low Stock</div>
                <div class="text-2xl font-extrabold text-warning">${lowStock}</div>
            </div>
            <div class="bg-surface p-4 rounded-xl border border-border flex flex-col justify-between">
                <div class="text-[11px] text-secondary font-bold mb-2">Availability</div>
                <div class="text-2xl font-extrabold text-primary">${availability}%</div>
            </div>
        </div>

        <!-- ROW 2: Prod Lines (8) + Critical Alerts (4) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            <div class="lg:col-span-8 bg-surface rounded-xl border border-border flex flex-col">
                <div class="p-4 border-b border-border font-bold text-sm">خطوط الإنتاج (Production Lines)</div>
                <div class="p-4 flex-1 overflow-x-auto">
                    <table class="w-full text-sm text-right">
                        <thead>
                            <tr class="text-secondary border-b border-border">
                                <th class="pb-2 font-bold">الخط</th>
                                <th class="pb-2 font-bold">المكائن</th>
                                <th class="pb-2 font-bold">تعمل</th>
                                <th class="pb-2 font-bold">متوقفة</th>
                                <th class="pb-2 font-bold">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr class="border-b border-border last:border-0 hover:bg-gray-50">
                                <td class="py-3 font-bold text-primary">خط التعبئة PL-01</td>
                                <td class="py-3">8</td><td class="py-3 text-success font-bold">7</td><td class="py-3 text-danger font-bold">1</td>
                                <td class="py-3"><span class="bg-green-100 text-success px-2 py-1 rounded text-xs font-bold">مستقر</span></td>
                            </tr>
                            <tr class="border-b border-border last:border-0 hover:bg-gray-50">
                                <td class="py-3 font-bold text-primary">خط التغليف PL-02</td>
                                <td class="py-3">5</td><td class="py-3 text-success font-bold">4</td><td class="py-3 text-danger font-bold">1</td>
                                <td class="py-3"><span class="bg-yellow-100 text-warning px-2 py-1 rounded text-xs font-bold">تحذير</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div class="lg:col-span-4 bg-surface rounded-xl border border-border flex flex-col">
                <div class="p-4 border-b border-border font-bold text-sm text-danger flex justify-between">
                    <span>تنبيهات حرجة (Critical Alerts)</span>
                    <span class="bg-red-100 text-danger text-xs px-2 rounded-full flex items-center">${criticalBrks}</span>
                </div>
                <div class="p-4 flex-1 space-y-3">
                    ${brks.filter(b => b.priority === 'critical').map(b => `
                        <div class="border-l-4 border-danger bg-red-50 p-3 rounded text-sm">
                            <div class="font-bold text-red-900">${b.title}</div>
                            <div class="text-xs text-red-700 mt-1">${dbData.assets[b.assetId]?.name || b.assetId} - ${new Date(b.time).toLocaleTimeString('ar-IQ')}</div>
                        </div>
                    `).join('') || '<div class="text-secondary text-sm text-center py-4">لا توجد تنبيهات حرجة</div>'}
                </div>
            </div>
        </div>

        <!-- ROW 3: Active WOs (7) + Inventory Alerts (5) -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            <div class="lg:col-span-7 bg-surface rounded-xl border border-border flex flex-col">
                <div class="p-4 border-b border-border font-bold text-sm">أوامر العمل المفتوحة</div>
                <div class="p-4 flex-1 overflow-x-auto">
                    ${wos.length ? `
                    <table class="w-full text-sm text-right">
                        <thead>
                            <tr class="text-secondary border-b border-border">
                                <th class="pb-2 font-bold">رقم الأمر</th>
                                <th class="pb-2 font-bold">الوصف</th>
                                <th class="pb-2 font-bold">الفني</th>
                                <th class="pb-2 font-bold">الحالة</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${wos.filter(w => w.status !== 'Completed').slice(0,5).map(w => `
                            <tr class="border-b border-border last:border-0 hover:bg-gray-50">
                                <td class="py-3 text-xs font-bold" dir="ltr">${w.id || 'WO-XXX'}</td>
                                <td class="py-3 truncate max-w-[150px]">${w.description}</td>
                                <td class="py-3">${w.tech || '-'}</td>
                                <td class="py-3"><span class="bg-blue-50 text-action px-2 py-1 rounded text-xs font-bold">${w.status}</span></td>
                            </tr>
                            `).join('')}
                        </tbody>
                    </table>` : '<div class="text-secondary text-sm text-center py-4">لا توجد أوامر مفتوحة</div>'}
                </div>
            </div>

            <div class="lg:col-span-5 bg-surface rounded-xl border border-border flex flex-col">
                <div class="p-4 border-b border-border font-bold text-sm text-warning">نواقص المخزون (Low Stock)</div>
                <div class="p-4 flex-1">
                    ${parts.filter(p => p.qty <= p.min).slice(0,5).map(p => `
                        <div class="flex justify-between items-center border-b border-border last:border-0 py-2">
                            <div>
                                <div class="font-bold text-sm">${p.name}</div>
                                <div class="text-xs text-secondary" dir="ltr">${p.code}</div>
                            </div>
                            <div class="text-danger font-bold text-sm">${p.qty} / ${p.min}</div>
                        </div>
                    `).join('') || '<div class="text-secondary text-sm text-center py-4">المخزون مستقر</div>'}
                </div>
            </div>
        </div>
    `;
};


    // --- WORK ORDERS (PHASE 3) ---

const renderWorkOrders = () => {
    const wos = Object.entries(dbData.workOrders || {});
    
    const cols = {
        'New': { title: 'جديد', color: 'bg-blue-100 text-blue-800 border-blue-200', items: [] },
        'Assigned': { title: 'تم الإسناد', color: 'bg-purple-100 text-purple-800 border-purple-200', items: [] },
        'In Progress': { title: 'قيد العمل', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', items: [] },
        'Waiting Parts': { title: 'بانتظار قطع', color: 'bg-orange-100 text-orange-800 border-orange-200', items: [] },
        'Completed': { title: 'مكتمل', color: 'bg-green-100 text-green-800 border-green-200', items: [] }
    };

    wos.forEach(([id, w]) => {
        if (cols[w.status]) cols[w.status].items.push({id, ...w});
    });

    let kanbanHtml = '<div class="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-180px)]">';
    
    Object.entries(cols).forEach(([status, col]) => {
        kanbanHtml += `<div class="flex-none w-80 bg-surface border border-border rounded-xl flex flex-col max-h-full">
            <div class="p-3 border-b border-border flex justify-between items-center bg-gray-50 rounded-t-xl">
                <span class="font-bold text-sm">${col.title}</span>
                <span class="${col.color} text-xs font-bold px-2 py-0.5 rounded-full">${col.items.length}</span>
            </div>
            <div class="p-3 flex-1 overflow-y-auto space-y-3">`;
            
        col.items.forEach(item => {
            const asset = dbData.assets[item.assetId];
            kanbanHtml += `
                <div class="bg-white p-3 rounded-lg border border-border shadow-sm cursor-pointer hover:border-action transition">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-xs font-bold text-secondary" dir="ltr">${item.id}</span>
                        ${item.priority === 'critical' ? '<span class="w-2 h-2 rounded-full bg-danger"></span>' : ''}
                    </div>
                    <div class="font-bold text-sm mb-1">${item.description}</div>
                    <div class="text-xs text-primary mb-3">${asset ? asset.name : ''}</div>
                    <div class="flex justify-between items-center pt-2 border-t border-border">
                        <div class="flex items-center gap-1 text-xs text-secondary font-bold">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            ${item.tech || 'غير محدد'}
                        </div>
                        <button onclick="showToast('سيتم برمجة فتح الطلب')" class="text-action text-xs font-bold hover:underline">عرض</button>
                    </div>
                </div>
            `;
        });
        
        kanbanHtml += `</div></div>`;
    });
    
    kanbanHtml += '</div>';

    elContent.innerHTML = `
        <div class="mb-6 flex justify-between items-center">
            <h2 class="text-2xl font-bold text-primary">أوامر العمل (Work Orders)</h2>
            <button onclick="showToast('إضافة أمر عمل (تحت التطوير)')" class="bg-action text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                أمر عمل جديد
            </button>
        </div>
        ${kanbanHtml}
    `;
};


const renderBreakdowns = () => {
    const brks = Object.entries(dbData.breakdowns || {}).sort((a,b) => b[1].time - a[1].time);
    
    const rows = brks.map(([id, b]) => {
        let pBadge = '';
        if (b.priority === 'critical') pBadge = '<span class="bg-red-100 text-red-800 px-2 py-1 rounded text-xs font-bold">حرج</span>';
        else if (b.priority === 'urgent') pBadge = '<span class="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs font-bold">عاجل</span>';
        else pBadge = '<span class="bg-gray-100 text-secondary px-2 py-1 rounded text-xs font-bold">عادي</span>';

        let sBadge = '';
        if (b.status === 'New') sBadge = '<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-bold">جديد</span>';
        else if (b.status === 'Assigned') sBadge = '<span class="bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-bold">مسند</span>';
        else if (b.status === 'In Progress') sBadge = '<span class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-bold">قيد العمل</span>';
        else sBadge = '<span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">مغلق</span>';

        const asset = dbData.assets[b.assetId];

        return `
        <tr class="border-b border-border hover:bg-gray-50">
            <td class="p-4 font-bold text-sm" dir="ltr">${id}</td>
            <td class="p-4 text-sm font-bold text-primary">${asset ? asset.name : b.assetId}</td>
            <td class="p-4 text-sm">${b.title}</td>
            <td class="p-4">${pBadge}</td>
            <td class="p-4">${sBadge}</td>
            <td class="p-4 text-sm">${new Date(b.time).toLocaleString('ar-IQ')}</td>
            <td class="p-4">
                <button onclick="showToast('سيتم برمجتها لاحقاً')" class="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded font-bold">التفاصيل</button>
            </td>
        </tr>`;
    });

    elContent.innerHTML = createTable(['رقم البلاغ', 'الماكينة', 'الوصف', 'الأولوية', 'الحالة', 'الوقت', 'إجراءات'], rows, null, null);
    
    // Add header
    const header = document.createElement('div');
    header.className = 'mb-6 flex justify-between items-center';
    header.innerHTML = `<h2 class="text-2xl font-bold text-primary">سجل بلاغات الأعطال</h2>
    <button onclick="showToast('إضافة عطل (تحت التطوير)')" class="bg-danger text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-700">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        إبلاغ عن عطل
    </button>`;
    elContent.insertBefore(header, elContent.firstChild);
};


// --- SEED DEMO DATA ---
window.seedDemoData = async () => {
    if (!confirm('تحذير: سيتم إضافة بيانات تجريبية ضخمة إلى قاعدة البيانات. هل تريد الاستمرار؟')) return;
    
    showToast('جاري ضخ البيانات التجريبية...', 'info');
    
    try {
        const assets = {
            'AST-1001': { name: 'ماكينة التعبئة رقم 1', code: 'FM-01', department: 'التعبئة', line: 'PL-01', status: 'active', criticality: 'critical', createdAt: Date.now() },
            'AST-1002': { name: 'ماكينة التعبئة رقم 2', code: 'FM-02', department: 'التعبئة', line: 'PL-01', status: 'active', criticality: 'important', createdAt: Date.now() },
            'AST-1003': { name: 'ماكينة التغليف التلقائي', code: 'PK-01', department: 'التغليف', line: 'PL-02', status: 'stopped', criticality: 'critical', createdAt: Date.now() },
            'AST-1004': { name: 'الضاغط الهوائي A', code: 'AC-01', department: 'الخدمات', line: 'UT-01', status: 'active', criticality: 'important', createdAt: Date.now() },
            'AST-1005': { name: 'الضاغط الهوائي B', code: 'AC-02', department: 'الخدمات', line: 'UT-01', status: 'stopped', criticality: 'critical', createdAt: Date.now() },
            'AST-1006': { name: 'مضخة التبريد الرئيسية', code: 'CP-01', department: 'التبريد', line: 'PL-06', status: 'active', criticality: 'critical', createdAt: Date.now() }
        };

        const breakdowns = {
            'BR-2026-0041': { assetId: 'AST-1005', title: 'ارتفاع حرارة الضاغط', category: 'Mechanical', priority: 'critical', reportedBy: 'المدير العام', time: Date.now() - 3600000, status: 'In Progress' },
            'BR-2026-0042': { assetId: 'AST-1003', title: 'توقف حساس التغليف', category: 'Electrical', priority: 'important', reportedBy: 'سجاد حسين', time: Date.now() - 7200000, status: 'Assigned' }
        };

        const workOrders = {
            'WO-2026-0104': { assetId: 'AST-1005', description: 'فحص وتبديل رمان بلي الضاغط', tech: 'أحمد كريم', priority: 'critical', status: 'In Progress', elapsed: '00:48' },
            'WO-2026-0105': { assetId: 'AST-1003', description: 'تبديل حساس التغليف وإعادة المعايرة', tech: 'علي حسن', priority: 'important', status: 'Assigned', elapsed: '00:00' }
        };

        const spareParts = {
            'SP-0001': { name: 'Bearing 6205', code: 'SKF-6205', category: 'Mechanical', qty: 3, min: 5, max: 30, location: 'M-A-04', cost: '18,000', status: 'Low Stock' },
            'SP-0002': { name: 'Proximity Sensor', code: 'OM-PROX', category: 'Electrical', qty: 12, min: 10, max: 50, location: 'E-B-02', cost: '45,000', status: 'Normal' }
        };

        await update(ref(db, '/'), {
            assets: { ...dbData.assets, ...assets },
            breakdowns: { ...dbData.breakdowns, ...breakdowns },
            workOrders: { ...dbData.workOrders, ...workOrders },
            spareParts: { ...dbData.spareParts, ...spareParts }
        });
        
        showToast('تمت إضافة البيانات التجريبية بنجاح!');
        logAudit('النظام', 'ضخ بيانات تجريبية (Demo Data)');
        
    } catch (e) {
        console.error(e);
        showToast('حدث خطأ أثناء رفع البيانات: ' + e.message, 'error');
    }
};

