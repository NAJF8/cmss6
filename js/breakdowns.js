// --- BREAKDOWNS (PHASE 3) ---

window.updateBreakdownStatus = async (id, status) => {
    if (!hasPerm('breakdowns.edit')) return showToast('لا تملك الصلاحية', 'error');
    await update(ref(db, 'breakdowns/' + id), { status });
    showToast('تم تحديث حالة العطل');
    logAudit('تحديث عطل', \`تحديث حالة \${id} إلى \${status}\`);
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

        return \`
        <tr class="border-b border-border hover:bg-gray-50">
            <td class="p-4 font-bold text-sm" dir="ltr">\${id}</td>
            <td class="p-4 text-sm font-bold text-primary">\${asset ? asset.name : b.assetId}</td>
            <td class="p-4 text-sm">\${b.title}</td>
            <td class="p-4">\${pBadge}</td>
            <td class="p-4">\${sBadge}</td>
            <td class="p-4 text-sm">\${new Date(b.time).toLocaleString('ar-IQ')}</td>
            <td class="p-4">
                <button onclick="showToast('سيتم برمجتها لاحقاً')" class="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded font-bold">التفاصيل</button>
            </td>
        </tr>\`;
    });

    elContent.innerHTML = createTable(['رقم البلاغ', 'الماكينة', 'الوصف', 'الأولوية', 'الحالة', 'الوقت', 'إجراءات'], rows, null, null);
    
    // Add header
    const header = document.createElement('div');
    header.className = 'mb-6 flex justify-between items-center';
    header.innerHTML = \`<h2 class="text-2xl font-bold text-primary">سجل بلاغات الأعطال</h2>
    <button onclick="showToast('إضافة عطل (تحت التطوير)')" class="bg-danger text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-red-700">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        إبلاغ عن عطل
    </button>\`;
    elContent.insertBefore(header, elContent.firstChild);
};
