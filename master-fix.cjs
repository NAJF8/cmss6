const fs = require('fs');

try {
    let app = fs.readFileSync('js/admin-app.js', 'utf8');

    // 1. Fix Database URL
    app = app.replace('https://cmms-37512-default-rtdb.firebaseio.com', 'https://cmms-37512-default-rtdb.asia-southeast1.firebasedatabase.app');

    // 2. Inject New Dashboard
    const dash = fs.readFileSync('js/dashboard.js', 'utf8');
    // We will find where renderDashboard starts and ends.
    // Since regex can be tricky with newlines, let's use split/indexOf
    const dashStart = app.indexOf('const renderDashboard = () => {');
    if (dashStart !== -1) {
        // Find the end of renderDashboard
        // It's followed by `const renderWorkOrders = () => {`
        const nextFunc = app.indexOf('const renderWorkOrders = () => {');
        if (nextFunc !== -1) {
            app = app.substring(0, dashStart) + dash + '\n\n    ' + app.substring(nextFunc);
            console.log('Dashboard successfully replaced!');
        } else {
            console.log('Could not find next func for dashboard replacement.');
        }
    } else {
        console.log('Could not find renderDashboard start.');
    }

    fs.writeFileSync('js/admin-app.js', app, 'utf8');

    // 3. Fix Employee App DB URL
    let empApp = fs.readFileSync('js/employee-app.js', 'utf8');
    empApp = empApp.replace('https://cmms-37512-default-rtdb.firebaseio.com', 'https://cmms-37512-default-rtdb.asia-southeast1.firebasedatabase.app');
    fs.writeFileSync('js/employee-app.js', empApp, 'utf8');
    console.log('Employee DB URL fixed!');

} catch (e) {
    console.error(e);
}
