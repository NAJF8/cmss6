import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getDatabase, ref, get, set, update, push, child, onValue, remove } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";

const firebaseConfig = { apiKey: "AIzaSyDtzonzkDsEvF9KNXi70j6ZTXG5kLAM_0c", authDomain: "cmms-37512.firebaseapp.com", databaseURL: "https://cmms-37512-default-rtdb.firebaseio.com", projectId: "cmms-37512", storageBucket: "cmms-37512.firebasestorage.app", messagingSenderId: "451592788539", appId: "1:451592788539:web:d3dc3e68b1543996b39a1e" };
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();



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
let currentTab = 'home';
let myTasks = [];
let dbData = { assets: {} }; // Needed to show asset names

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, document.getElementById('email').value, document.getElementById('password').value); }
    catch (err) { document.getElementById('login-error').classList.remove('hide'); document.getElementById('login-error').textContent = 'Ø¨ÙŠØ§Ù†Ø§Øª Ø§Ù„Ø¯Ø®ÙˆÙ„ Ø®Ø§Ø·Ø¦Ø©'; }
});
document.getElementById('btn-google').addEventListener('click', () => signInWithPopup(auth, googleProvider));
document.getElementById('btn-logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        elLogin.classList.add('hide');
        elApp.classList.remove('hide');
        
        // Fetch Assets first for display names
        onValue(ref(db, 'assets'), snap => { dbData.assets = snap.val() || {}; });

        try {
            const snap = await get(child(ref(db), 'users'));
            let found = false;
            if (snap.exists()) {
                const data = snap.val();
                for (let k in data) {
                    if (data[k].email === user.email) {
                        document.getElementById('user-name').textContent = data[k].name || user.email;
                        document.getElementById('user-role').textContent = data[k].role === 'admin' ? 'Ø¥Ø¯Ø§Ø±ÙŠ' : 'ÙÙ†ÙŠ ØµÙŠØ§Ù†Ø©';
                        document.getElementById('user-initial').textContent = (data[k].name ? data[k].name[0] : user.email[0]).toUpperCase();
                        found = true;
                        break;
                    }
                }
            }
            if(!found) {
                document.getElementById('user-name').textContent = user.email;
                document.getElementById('user-initial').textContent = user.email[0].toUpperCase();
            }
        } catch(e) {
            document.getElementById('user-name').textContent = user.email;
            document.getElementById('user-initial').textContent = user.email[0].toUpperCase();
        }

        onValue(ref(db, 'workOrders'), (snap) => {
            myTasks = [];
            const data = snap.val();
            for (let id in data) {
                // In a real app we filter by assignedTo === user.uid. Here we show all to ensure data is visible.
                myTasks.push({ id, ...data[id] });
            }
            // Sort: newest first
            myTasks.sort((a,b) => (b.date||0) - (a.date||0));
            renderTab();
        });
    } else {
        elLogin.classList.remove('hide');
        elApp.classList.add('hide');
    }
});

window.updateStatus = async (id, status) => {
    try {
        await update(ref(db, 'workOrders/' + id), { status });
        showToast('ØªÙ… ØªØ­Ø¯ÙŠØ« Ø§Ù„Ù…Ù‡Ù…Ø©');
    } catch(e) { showToast('Ø®Ø·Ø£', 'error'); }
};

const renderTab = () => {
    if (currentTab === 'home') {
        elContent.innerHTML = `
            <div class="mb-6">
                <h2 class="text-xl font-bold mb-4">Ù…Ù„Ø®Øµ Ø£Ø¹Ù…Ø§Ù„ÙŠ</h2>
                <div class="grid grid-cols-2 gap-4">
                    <div class="bg-surface p-5 rounded-2xl shadow-sm border border-border text-center">
                        <div class="text-secondary text-xs font-bold mb-2">Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°</div>
                        <div class="text-4xl font-extrabold text-action">${myTasks.filter(t=>t.status==='Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°').length}</div>
                    </div>
                    <div class="bg-surface p-5 rounded-2xl shadow-sm border border-border text-center">
                        <div class="text-secondary text-xs font-bold mb-2">Ù…Ù‡Ø§Ù… Ø¬Ø¯ÙŠØ¯Ø©</div>
                        <div class="text-4xl font-extrabold text-warning">${myTasks.filter(t=>t.status==='Ø¬Ø¯ÙŠØ¯').length}</div>
                    </div>
                </div>
            </div>
            <div>
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-lg">Ø£Ø­Ø¯Ø« Ø§Ù„Ù…Ù‡Ø§Ù… Ø§Ù„Ù…Ø·Ù„ÙˆØ¨Ø©</h3>
                </div>
                <div class="space-y-4">
                    ${myTasks.filter(t=>t.status!=='Ù…ÙƒØªÙ…Ù„').slice(0,3).map(t => {
                        const ast = t.assetId ? dbData.assets[t.assetId]?.name || '-' : '-';
                        return `
                        <div class="bg-surface p-5 rounded-2xl shadow-sm border border-border flex flex-col gap-3">
                            <div class="flex justify-between items-start">
                                <div>
                                    <div class="font-bold text-lg text-primary">${t.title}</div>
                                    <div class="text-xs text-secondary mt-1 font-bold">Ø§Ù„Ù…Ø§ÙƒÙŠÙ†Ø©: ${ast}</div>
                                </div>
                                <span class="px-2 py-1 bg-yellow-100 text-warning rounded text-[10px] font-bold">${t.priority}</span>
                            </div>
                            <div class="flex gap-2 mt-2 border-t border-border pt-3">
                                ${t.status === 'Ø¬Ø¯ÙŠØ¯' ? `<button onclick="updateStatus('${t.id}', 'Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°')" class="flex-1 bg-action text-white py-2 rounded-xl text-sm font-bold shadow hover:bg-blue-700 transition">Ø¨Ø¯Ø¡ Ø§Ù„Ø¹Ù…Ù„</button>` : ''}
                                ${t.status === 'Ù‚ÙŠØ¯ Ø§Ù„ØªÙ†ÙÙŠØ°' ? `<button onclick="updateStatus('${t.id}', 'Ù…ÙƒØªÙ…Ù„')" class="flex-1 bg-success text-white py-2 rounded-xl text-sm font-bold shadow hover:bg-green-700 transition">Ø¥Ù†Ù‡Ø§Ø¡ Ø§Ù„Ø¹Ù…Ù„</button>` : ''}
                            </div>
                        </div>
                    `}).join('') || '<div class="text-secondary text-center p-8 font-bold border-2 border-dashed border-border rounded-xl">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù‡Ø§Ù… Ø­Ø§Ù„ÙŠØ§Ù‹. Ø£Ù†Øª Ø¬Ø§Ù‡Ø²!</div>'}
                </div>
            </div>
        `;
    } else if (currentTab === 'tasks') {
        elContent.innerHTML = `
            <div class="mb-4">
                <h2 class="text-xl font-bold mb-2">Ø³Ø¬Ù„ Ø§Ù„Ù…Ù‡Ø§Ù…</h2>
                <div class="relative w-full">
                    <input type="text" placeholder="Ø¨Ø­Ø« ÙÙŠ Ø§Ù„Ù…Ù‡Ø§Ù…..." class="w-full border border-border rounded-xl pl-3 pr-10 py-3 text-sm outline-none focus:border-action transition shadow-sm bg-surface">
                    <svg class="w-5 h-5 text-gray-400 absolute right-3 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>
            <div class="space-y-4">
                ${myTasks.map(t => {
                    const ast = t.assetId ? dbData.assets[t.assetId]?.name || '-' : '-';
                    return `
                    <div class="bg-surface p-4 rounded-2xl shadow-sm border border-border flex flex-col gap-2">
                        <div class="flex justify-between items-start">
                            <div><div class="font-bold text-primary">${t.title}</div><div class="text-xs text-secondary font-bold">Ø§Ù„Ù…Ø§ÙƒÙŠÙ†Ø©: ${ast}</div></div>
                            <span class="px-2 py-1 bg-gray-100 border border-border text-primary rounded text-xs font-bold">${t.status}</span>
                        </div>
                    </div>
                `}).join('') || '<div class="text-secondary text-center p-8 font-bold">Ù„Ø§ ØªÙˆØ¬Ø¯ Ù…Ù‡Ø§Ù… Ø³Ø§Ø¨Ù‚Ø©</div>'}
            </div>
        `;
    }
};

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => { 
            b.classList.remove('text-action', 'font-bold'); 
            b.classList.add('text-secondary'); 
        });
        btn.classList.remove('text-secondary'); 
        btn.classList.add('text-action', 'font-bold');
        currentTab = btn.dataset.tab;
        renderTab();
    });
});



// --- PHASE 2: EMPLOYEE QR SCANNER & BOTTOM NAV ---

const origRenderTab = renderTab;

window.renderTab = () => {
    if (currentTab === 'scan') {
        elContent.innerHTML = `
            <div class="flex flex-col h-full bg-black text-white rounded-2xl overflow-hidden shadow-xl relative">
                <div class="p-4 bg-gray-900 flex justify-between items-center z-10 absolute top-0 w-full">
                    <h2 class="font-bold">Ù…Ø³Ø­ ÙƒÙˆØ¯ Ø§Ù„Ù…Ø§ÙƒÙŠÙ†Ø© (QR)</h2>
                    <button onclick="document.querySelector('[data-tab=\\'home\\']').click()" class="text-white bg-gray-800 p-2 rounded-full"><svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                </div>
                <div id="qr-reader" class="flex-1 w-full bg-black flex items-center justify-center"></div>
            </div>
        `;
        
        setTimeout(() => {
            if (window.Html5Qrcode) {
                const html5QrCode = new Html5Qrcode("qr-reader");
                html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
                (decodedText, decodedResult) => {
                    html5QrCode.stop().then(() => {
                        const assetId = decodedText.trim();
                        if (dbData.assets && dbData.assets[assetId]) {
                            showToast('ØªÙ… Ø§Ù„ØªØ¹Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ù…Ø§ÙƒÙŠÙ†Ø©');
                            showAssetActionSheet(assetId);
                        } else {
                            showToast('Ø§Ù„Ù…Ø§ÙƒÙŠÙ†Ø© ØºÙŠØ± Ù…Ø³Ø¬Ù„Ø©: ' + assetId, 'error');
                            document.querySelector('[data-tab="home"]').click();
                        }
                    });
                },
                (errorMessage) => { })
                .catch((err) => {
                    document.getElementById('qr-reader').innerHTML = '<div class="text-center p-8 text-red-500 font-bold">Ù„Ø§ ÙŠÙ…ÙƒÙ† Ø§Ù„ÙˆØµÙˆÙ„ Ù„Ù„ÙƒØ§Ù…ÙŠØ±Ø§</div>';
                });
            }
        }, 300);
    } else {
        origRenderTab();
    }
};

window.showAssetActionSheet = (assetId) => {
    const a = dbData.assets[assetId];
    if (!a) return;
    
    const sheet = document.createElement('div');
    sheet.className = "fixed inset-0 bg-black/60 z-[100] flex flex-col justify-end transition-opacity duration-300";
    sheet.innerHTML = `
        <div class="bg-surface rounded-t-3xl w-full p-6 animate-[slideIn_0.3s_ease-out]">
            <div class="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-6"></div>
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h3 class="font-bold text-xl text-primary">${a.name}</h3>
                    <p class="text-xs text-secondary font-bold mt-1" dir="ltr">${a.code || assetId}</p>
                </div>
                ${a.status === 'active' ? '<span class="bg-green-100 text-success px-3 py-1 rounded-full text-xs font-bold border border-green-200">ØªØ¹Ù…Ù„</span>' : '<span class="bg-red-100 text-danger px-3 py-1 rounded-full text-xs font-bold border border-red-200">Ù…ØªÙˆÙ‚ÙØ©</span>'}
            </div>
            
            <div class="grid grid-cols-2 gap-3 mb-6">
                <button onclick="document.getElementById('temp-sheet').remove(); showToast('Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ·ÙˆÙŠØ± (Ø§Ù„Ù…Ø±Ø­Ù„Ø© 3)')" class="bg-red-50 text-danger border border-red-100 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-red-100 transition">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    <span class="font-bold text-sm">Ø¥Ø¨Ù„Ø§Øº Ø¹Ù† Ø¹Ø·Ù„</span>
                </button>
                <button onclick="document.getElementById('temp-sheet').remove(); showToast('Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ·ÙˆÙŠØ± (Ø§Ù„Ù…Ø±Ø­Ù„Ø© 3)')" class="bg-blue-50 text-action border border-blue-100 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-blue-100 transition">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                    <span class="font-bold text-sm">Ø³Ø¬Ù„ Ø§Ù„Ø£Ø¹Ù…Ø§Ù„</span>
                </button>
            </div>
            
            <button onclick="document.getElementById('temp-sheet').remove(); document.querySelector('[data-tab=\\'home\\']').click()" class="w-full bg-gray-100 text-secondary font-bold py-3.5 rounded-xl hover:bg-gray-200 transition">Ø¥Ù„ØºØ§Ø¡</button>
        </div>
    `;
    sheet.id = "temp-sheet";
    document.body.appendChild(sheet);
};


