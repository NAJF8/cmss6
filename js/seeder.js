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
            'BR-2026-0041': { assetId: 'AST-1005', title: 'ارتفاع حرارة الضاغط', category: 'Mechanical', priority: 'critical', reportedBy: 'علي حسن', time: Date.now() - 3600000, status: 'In Progress' },
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
