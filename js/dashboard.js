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
