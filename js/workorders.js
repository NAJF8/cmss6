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
        kanbanHtml += \`<div class="flex-none w-80 bg-surface border border-border rounded-xl flex flex-col max-h-full">
            <div class="p-3 border-b border-border flex justify-between items-center bg-gray-50 rounded-t-xl">
                <span class="font-bold text-sm">\${col.title}</span>
                <span class="\${col.color} text-xs font-bold px-2 py-0.5 rounded-full">\${col.items.length}</span>
            </div>
            <div class="p-3 flex-1 overflow-y-auto space-y-3">\`;
            
        col.items.forEach(item => {
            const asset = dbData.assets[item.assetId];
            kanbanHtml += \`
                <div class="bg-white p-3 rounded-lg border border-border shadow-sm cursor-pointer hover:border-action transition">
                    <div class="flex justify-between items-start mb-2">
                        <span class="text-xs font-bold text-secondary" dir="ltr">\${item.id}</span>
                        \${item.priority === 'critical' ? '<span class="w-2 h-2 rounded-full bg-danger"></span>' : ''}
                    </div>
                    <div class="font-bold text-sm mb-1">\${item.description}</div>
                    <div class="text-xs text-primary mb-3">\${asset ? asset.name : ''}</div>
                    <div class="flex justify-between items-center pt-2 border-t border-border">
                        <div class="flex items-center gap-1 text-xs text-secondary font-bold">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                            \${item.tech || 'غير محدد'}
                        </div>
                        <button onclick="showToast('سيتم برمجة فتح الطلب')" class="text-action text-xs font-bold hover:underline">عرض</button>
                    </div>
                </div>
            \`;
        });
        
        kanbanHtml += \`</div></div>\`;
    });
    
    kanbanHtml += '</div>';

    elContent.innerHTML = \`
        <div class="mb-6 flex justify-between items-center">
            <h2 class="text-2xl font-bold text-primary">أوامر العمل (Work Orders)</h2>
            <button onclick="showToast('إضافة أمر عمل (تحت التطوير)')" class="bg-action text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-700">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                أمر عمل جديد
            </button>
        </div>
        \${kanbanHtml}
    \`;
};
