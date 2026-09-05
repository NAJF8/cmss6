import { auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged, signInWithPopup, googleProvider, ref, onValue, set, push, update, remove } from './firebase-config.js';

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
let currentHash = '#dashboard';
let dbData = { assets: {}, workOrders: {}, breakdowns: {}, users: {}, spareParts: {}, settings: {}, auditLogs: {} };

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
    catch (err) { document.getElementById('login-error').textContent = 'فشل الدخول'; document.getElementById('login-error').classList.remove('hide'); }
});

document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        elLogin.classList.add('hide');
        elApp.classList.remove('hide');
        document.getElementById('user-name').textContent = user.email;
        document.getElementById('user-initial').textContent = user.email[0].toUpperCase();
        
        // Listeners
        ['assets', 'workOrders', 'breakdowns', 'users', 'spareParts', 'settings', 'auditLogs'].forEach(path => {
            onValue(ref(db, path), (snap) => {
                dbData[path] = snap.val() || {};
                renderPage(currentHash);
            }, (err) => {
                console.error("Firebase read error on " + path, err);
                if (path === 'users') showToast('حدث خطأ في صلاحيات القراءة. الرجاء تحديث قواعد بيانات Firebase.', 'error');
            });
        });

        // Ensure Super Admin
        try {
            if (user.email === 'mohameadalhaear100@gmail.com') {
                const superRef = ref(db, 'users/' + user.uid);
                onValue(superRef, (snap) => {
                    if (!snap.exists()) {
                        set(superRef, { email: user.email, name: 'المدير العام', role: 'super_admin', isSuperAdmin: true, status: 'active' }).catch(()=>{});
                    }
                }, { onlyOnce: true });
            }
        } catch(e) {}
    } else {
        elLogin.classList.remove('hide');
        elApp.classList.add('hide');
    }
});

// --- Routing & Navigation ---
const navs = [
    { id: 'dashboard', label: 'لوحة التحكم', section: 'الرئيسية' },
    { id: 'assets', label: 'المكائن والأصول', section: 'الصيانة' },
    { id: 'workorders', label: 'أوامر العمل', section: 'الصيانة' },
    { id: 'breakdowns', label: 'الأعطال', section: 'الصيانة' },
    { id: 'inventory', label: 'قطع الغيار', section: 'المخزون' },
    { id: 'employees', label: 'الموظفون', section: 'الإدارة' },
    { id: 'audit', label: 'سجل النظام', section: 'النظام' }
];

const renderSidebar = () => {
    let html = '';
    let curSec = '';
    navs.forEach(n => {
        if (n.section !== curSec) {
            curSec = n.section;
            html += `<div class="px-6 py-3 mt-4 text-xs font-bold text-gray-500 uppercase tracking-wider">${curSec}</div>`;
        }
        html += `<a href="#${n.id}" class="nav-link block px-6 py-3 text-sm ${currentHash === '#' + n.id ? 'active' : 'text-gray-400 hover:text-white'}">${n.label}</a>`;
    });
    document.getElementById('sidebar').innerHTML = html;
};

const renderPage = (hash) => {
    currentHash = hash || '#dashboard';
    renderSidebar();
    const p = navs.find(n => '#' + n.id === currentHash);
    document.getElementById('page-title').textContent = p ? p.label : 'لوحة التحكم';
    
    switch(currentHash) {
        case '#dashboard': renderDashboard(); break;
        case '#assets': renderAssets(); break;
        case '#workorders': renderWorkOrders(); break;
        case '#breakdowns': renderBreakdowns(); break;
        case '#inventory': renderInventory(); break;
        case '#employees': renderEmployees(); break;
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

// --- Pages ---

// Dashboard
const renderDashboard = () => {
    const assets = Object.values(dbData.assets);
    const wos = Object.values(dbData.workOrders);
    
    elContent.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div class="bg-surface p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
                <div><div class="text-secondary text-sm font-bold mb-1">إجمالي المكائن</div><div class="text-3xl font-extrabold text-primary">${assets.length}</div></div>
                <div class="w-12 h-12 bg-blue-50 text-action rounded-full flex items-center justify-center"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg></div>
            </div>
            <div class="bg-surface p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
                <div><div class="text-secondary text-sm font-bold mb-1">عاملة / متوقفة</div><div class="text-3xl font-extrabold text-success">${assets.filter(a=>a.status==='active').length} <span class="text-lg text-gray-300">/</span> <span class="text-danger">${assets.filter(a=>a.status==='stopped').length}</span></div></div>
                <div class="w-12 h-12 bg-green-50 text-success rounded-full flex items-center justify-center"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg></div>
            </div>
            <div class="bg-surface p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
                <div><div class="text-secondary text-sm font-bold mb-1">أوامر مفتوحة</div><div class="text-3xl font-extrabold text-warning">${wos.filter(w=>w.status!=='مكتمل').length}</div></div>
                <div class="w-12 h-12 bg-yellow-50 text-warning rounded-full flex items-center justify-center"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg></div>
            </div>
            <div class="bg-surface p-6 rounded-xl border border-border shadow-sm flex items-center justify-between">
                <div><div class="text-secondary text-sm font-bold mb-1">بلاغات الأعطال</div><div class="text-3xl font-extrabold text-danger">${Object.values(dbData.breakdowns).length}</div></div>
                <div class="w-12 h-12 bg-red-50 text-danger rounded-full flex items-center justify-center"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg></div>
            </div>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-surface rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div class="p-5 border-b border-border flex justify-between items-center"><h3 class="font-bold text-lg">أحدث أوامر العمل</h3><a href="#workorders" class="text-action text-sm font-bold hover:underline">عرض الكل</a></div>
                <div class="flex-1 overflow-x-auto p-0">
                    <table class="w-full text-sm text-right">
                        <tbody>${wos.slice(-5).map(w=>`<tr class="border-b border-border/50 hover:bg-gray-50"><td class="p-4 font-bold text-primary">${w.title}</td><td class="p-4"><span class="px-2 py-1 bg-gray-100 rounded text-xs font-bold">${w.status}</span></td></tr>`).join('') || '<tr><td colspan="2" class="p-8 text-center text-secondary">لا توجد أوامر</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
            <div class="bg-surface rounded-xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div class="p-5 border-b border-border flex justify-between items-center"><h3 class="font-bold text-lg">نظرة عامة على الخطوط</h3></div>
                <div class="p-6 flex-1 flex items-center justify-center text-secondary font-bold">
                    سيتم إضافة المخططات البيانية (Charts) هنا
                </div>
            </div>
        </div>
    `;
};

// Assets
window.openAddAsset = () => {
    openModal("إضافة ماكينة", `
        <div class="space-y-4">
            <div><label class="block text-sm font-bold mb-2">الاسم <span class="text-danger">*</span></label><input id="a-name" type="text" class="w-full border border-border p-2.5 rounded-lg focus:border-action outline-none"></div>
            <div><label class="block text-sm font-bold mb-2">رقم الماكينة (ID)</label><input id="a-code" type="text" class="w-full border border-border p-2.5 rounded-lg focus:border-action outline-none" dir="ltr"></div>
            <div><label class="block text-sm font-bold mb-2">القسم / خط الإنتاج</label><input id="a-dep" type="text" class="w-full border border-border p-2.5 rounded-lg focus:border-action outline-none"></div>
            <div><label class="block text-sm font-bold mb-2">الحالة</label>
                <select id="a-status" class="w-full border border-border p-2.5 rounded-lg focus:border-action outline-none"><option value="active">عاملة</option><option value="stopped">متوقفة</option></select>
            </div>
        </div>
    `, async () => {
        const name = document.getElementById('a-name').value;
        if (!name) throw new Error('الاسم مطلوب');
        await push(ref(db, 'assets'), { name, code: document.getElementById('a-code').value, department: document.getElementById('a-dep').value, status: document.getElementById('a-status').value });
        showToast('تمت الإضافة بنجاح'); return true;
    });
};
const renderAssets = () => {
    const rows = Object.entries(dbData.assets).map(([id, a]) => `
        <tr class="hover:bg-gray-50 transition">
            <td class="p-4 font-bold text-primary">${a.name}</td>
            <td class="p-4" dir="ltr">${a.code||'-'}</td>
            <td class="p-4">${a.department||'-'}</td>
            <td class="p-4">${a.status==='active'?'<span class="inline-flex px-2 py-1 bg-green-100 text-success rounded text-xs font-bold">عاملة</span>':'<span class="inline-flex px-2 py-1 bg-red-100 text-danger rounded text-xs font-bold">متوقفة</span>'}</td>
        </tr>
    `);
    elContent.innerHTML = createTable(['اسم الماكينة', 'الرقم', 'القسم', 'الحالة'], rows, 'openAddAsset()', 'إضافة ماكينة');
};

// Work Orders
window.openAddWO = () => {
    const as = Object.entries(dbData.assets).map(([id, a]) => `<option value="${id}">${a.name}</option>`).join('');
    const us = Object.entries(dbData.users).map(([id, u]) => `<option value="${id}">${u.name}</option>`).join('');
    openModal("إضافة أمر عمل", `
        <div class="space-y-4">
            <div><label class="block text-sm font-bold mb-2">العنوان <span class="text-danger">*</span></label><input id="wo-title" type="text" class="w-full border border-border p-2.5 rounded-lg focus:border-action outline-none"></div>
            <div><label class="block text-sm font-bold mb-2">الماكينة</label><select id="wo-asset" class="w-full border border-border p-2.5 rounded-lg focus:border-action outline-none"><option value="">-- اختر --</option>${as}</select></div>
            <div><label class="block text-sm font-bold mb-2">إسناد إلى</label><select id="wo-user" class="w-full border border-border p-2.5 rounded-lg focus:border-action outline-none"><option value="">-- اختر --</option>${us}</select></div>
            <div><label class="block text-sm font-bold mb-2">الأولوية</label><select id="wo-pri" class="w-full border border-border p-2.5 rounded-lg focus:border-action outline-none"><option>عادي</option><option>عالي</option><option>حرج</option></select></div>
        </div>
    `, async () => {
        const title = document.getElementById('wo-title').value;
        if (!title) throw new Error('العنوان مطلوب');
        await push(ref(db, 'workOrders'), { title, assetId: document.getElementById('wo-asset').value, assignedTo: document.getElementById('wo-user').value, priority: document.getElementById('wo-pri').value, status: 'جديد', date: Date.now() });
        showToast('تم حفظ أمر العمل'); return true;
    });
};
window.updateWOStatus = async (id, status) => { await update(ref(db, 'workOrders/'+id), {status}); showToast('تم تحديث الحالة'); };
const renderWorkOrders = () => {
    const rows = Object.entries(dbData.workOrders).map(([id, w]) => {
        const ast = w.assetId ? dbData.assets[w.assetId]?.name || '-' : '-';
        const usr = w.assignedTo ? dbData.users[w.assignedTo]?.name || '-' : '-';
        return `
        <tr class="hover:bg-gray-50 transition">
            <td class="p-4 font-bold text-primary">${w.title}</td>
            <td class="p-4 text-xs">${ast}</td>
            <td class="p-4 text-xs">${usr}</td>
            <td class="p-4"><span class="px-2 py-1 bg-gray-100 rounded text-xs font-bold border border-border">${w.priority}</span></td>
            <td class="p-4">
                <select onchange="updateWOStatus('${id}', this.value)" class="border border-border p-1.5 rounded bg-white text-xs font-bold outline-none cursor-pointer hover:border-gray-400">
                    <option ${w.status==='جديد'?'selected':''}>جديد</option>
                    <option ${w.status==='قيد التنفيذ'?'selected':''}>قيد التنفيذ</option>
                    <option ${w.status==='مكتمل'?'selected':''}>مكتمل</option>
                </select>
            </td>
        </tr>
    `});
    elContent.innerHTML = createTable(['العنوان', 'الماكينة', 'المسند إليه', 'الأولوية', 'الحالة (قابل للتعديل)'], rows, 'openAddWO()', 'أمر عمل جديد');
};

// Breakdowns
window.openAddBreakdown = () => {
    const as = Object.entries(dbData.assets).map(([id, a]) => `<option value="${id}">${a.name}</option>`).join('');
    openModal("إضافة بلاغ عطل", `
        <div class="space-y-4">
            <div><label class="block text-sm font-bold mb-2">الماكينة <span class="text-danger">*</span></label><select id="b-asset" class="w-full border border-border p-2.5 rounded-lg"><option value="">-- اختر --</option>${as}</select></div>
            <div><label class="block text-sm font-bold mb-2">الوصف</label><textarea id="b-desc" class="w-full border border-border p-2.5 rounded-lg h-24"></textarea></div>
        </div>
    `, async () => {
        const aId = document.getElementById('b-asset').value;
        if (!aId) throw new Error('الرجاء اختيار الماكينة');
        await push(ref(db, 'breakdowns'), { assetId: aId, desc: document.getElementById('b-desc').value, status: 'نشط', date: Date.now() });
        showToast('تم الإبلاغ بنجاح'); return true;
    });
};
const renderBreakdowns = () => {
    const rows = Object.entries(dbData.breakdowns).map(([id, b]) => {
        const ast = b.assetId ? dbData.assets[b.assetId]?.name || '-' : '-';
        return `
        <tr class="hover:bg-gray-50 transition">
            <td class="p-4 font-bold text-primary">${ast}</td>
            <td class="p-4 text-sm truncate max-w-xs">${b.desc||'-'}</td>
            <td class="p-4"><span class="px-2 py-1 bg-red-100 text-danger rounded text-xs font-bold">${b.status}</span></td>
            <td class="p-4 text-xs text-secondary" dir="ltr">${new Date(b.date).toLocaleString('en-GB')}</td>
        </tr>
    `});
    elContent.innerHTML = createTable(['الماكينة', 'الوصف', 'الحالة', 'التاريخ'], rows, 'openAddBreakdown()', 'بلاغ جديد');
};

// Inventory
window.openAddPart = () => {
    openModal("إضافة قطعة غيار", `
        <div class="space-y-4">
            <div><label class="block text-sm font-bold mb-2">اسم القطعة <span class="text-danger">*</span></label><input id="p-name" type="text" class="w-full border border-border p-2.5 rounded-lg"></div>
            <div><label class="block text-sm font-bold mb-2">الرقم التعريفي</label><input id="p-code" type="text" class="w-full border border-border p-2.5 rounded-lg" dir="ltr"></div>
            <div class="flex gap-4">
                <div class="w-1/2"><label class="block text-sm font-bold mb-2">الكمية الحالية</label><input id="p-qty" type="number" class="w-full border border-border p-2.5 rounded-lg" value="0"></div>
                <div class="w-1/2"><label class="block text-sm font-bold mb-2">الحد الأدنى</label><input id="p-min" type="number" class="w-full border border-border p-2.5 rounded-lg" value="5"></div>
            </div>
        </div>
    `, async () => {
        const name = document.getElementById('p-name').value;
        if (!name) throw new Error('الاسم مطلوب');
        await push(ref(db, 'spareParts'), { name, code: document.getElementById('p-code').value, qty: Number(document.getElementById('p-qty').value), min: Number(document.getElementById('p-min').value) });
        showToast('تم الحفظ'); return true;
    });
};
const renderInventory = () => {
    const rows = Object.entries(dbData.spareParts).map(([id, p]) => `
        <tr class="hover:bg-gray-50 transition">
            <td class="p-4 font-bold text-primary">${p.name}</td>
            <td class="p-4 text-xs" dir="ltr">${p.code||'-'}</td>
            <td class="p-4"><span class="font-bold text-lg ${p.qty <= p.min ? 'text-danger' : 'text-primary'}">${p.qty}</span></td>
            <td class="p-4"><span class="text-secondary text-xs font-bold">${p.min}</span></td>
            <td class="p-4">${p.qty <= p.min ? '<span class="px-2 py-1 bg-red-100 text-danger rounded text-xs font-bold">نقص</span>' : '<span class="px-2 py-1 bg-green-100 text-success rounded text-xs font-bold">متوفر</span>'}</td>
        </tr>
    `);
    elContent.innerHTML = createTable(['القطعة', 'الرقم', 'الكمية', 'الحد الأدنى', 'الحالة'], rows, 'openAddPart()', 'إضافة قطعة');
};

// Employees
window.openAddEmployee = () => {
    openModal("إضافة موظف", `
        <div class="space-y-4">
            <div><label class="block text-sm font-bold mb-2">البريد الإلكتروني (أساسي لتسجيل الدخول) <span class="text-danger">*</span></label><input id="u-email" type="email" class="w-full border border-border p-2.5 rounded-lg" dir="ltr"></div>
            <div><label class="block text-sm font-bold mb-2">الاسم الكامل</label><input id="u-name" type="text" class="w-full border border-border p-2.5 rounded-lg"></div>
            <div><label class="block text-sm font-bold mb-2">الدور / الصلاحية</label><select id="u-role" class="w-full border border-border p-2.5 rounded-lg"><option value="technician">فني صيانة</option><option value="admin">إداري</option></select></div>
        </div>
        <div class="mt-4 p-3 bg-blue-50 text-action text-xs font-bold rounded-lg leading-relaxed">
            ملاحظة: لتمكين الموظف من الدخول، يجب عليه استخدام "تسجيل الدخول عبر Google" بنفس البريد الإلكتروني المدخل هنا، أو أن تقوم بإنشاء حساب له يدوياً من Firebase Auth.
        </div>
    `, async () => {
        const email = document.getElementById('u-email').value;
        if (!email) throw new Error('البريد الإلكتروني مطلوب');
        // We push to users collection with a random ID, but ideally we match UID. This is just for demonstration.
        await push(ref(db, 'users'), { email, name: document.getElementById('u-name').value, role: document.getElementById('u-role').value, status: 'active' });
        showToast('تمت الإضافة'); return true;
    });
};
const renderEmployees = () => {
    const rows = Object.values(dbData.users).map(u => `
        <tr class="hover:bg-gray-50 transition">
            <td class="p-4 font-bold text-primary">${u.name||'مستخدم'}</td>
            <td class="p-4 text-xs font-bold text-secondary" dir="ltr">${u.email}</td>
            <td class="p-4"><span class="px-2 py-1 bg-gray-100 border border-border rounded text-xs font-bold text-primary">${u.role}</span></td>
            <td class="p-4">${u.status==='active'?'<span class="text-success font-bold text-xs">نشط</span>':'<span class="text-danger font-bold text-xs">معطل</span>'}</td>
        </tr>
    `);
    elContent.innerHTML = createTable(['الاسم', 'البريد الإلكتروني', 'الدور', 'الحالة'], rows, 'openAddEmployee()', 'إضافة موظف');
};

// Audit Log
const renderAudit = () => {
    const rows = Object.values(dbData.auditLogs || {}).map(a => `
        <tr class="hover:bg-gray-50 transition">
            <td class="p-4 font-bold text-primary text-xs" dir="ltr">${new Date(a.date).toLocaleString('en-GB')}</td>
            <td class="p-4 text-sm">${a.action}</td>
            <td class="p-4 text-xs font-bold text-secondary">${a.user||'-'}</td>
        </tr>
    `);
    elContent.innerHTML = createTable(['التاريخ', 'الحدث', 'المستخدم'], rows, null, null);
};
