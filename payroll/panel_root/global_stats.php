<?php
require __DIR__ . '/../bootstrap.php';
require __DIR__ . '/../core/auth.php';
require __DIR__ . '/../core/root.php';
if (!defined('APP_BOOTSTRAPPED')) { http_response_code(403); exit; }
$user = requireRoot();

// Fetch companies
$stmt = db()->prepare("SELECT id, name FROM companies ORDER BY name");
$stmt->execute();
$companies = $stmt->fetchAll(PDO::FETCH_ASSOC);

// Company selection
$selectedCompany = $_GET['company_id'] ?? ($companies[0]['id'] ?? null);

// Module summary
$modules = [];
$users = [];
$stats = [];
if ($selectedCompany) {
    $stmt = db()->prepare("SELECT * FROM modules WHERE is_active=1 ORDER BY sort_order, name");
    $stmt->execute();
    $modules = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $stmt = db()->prepare("SELECT u.id, u.email, uc.role FROM users u JOIN user_companies uc ON u.id=uc.user_id WHERE uc.company_id=? AND uc.status='active'");
    $stmt->execute([$selectedCompany]);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    // Example statistics: total users and active modules
    $stats = [
        'total_users' => count($users),
        'total_modules' => count($modules)
    ];
}
?><!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Global Statistics — Root Panel</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <link href="/assets/css/app.css" rel="stylesheet">
</head>
<body>
<?php $active='stats'; include __DIR__.'/_root_nav.php'; ?>
<div class="container mt-4">
    <h2 class="mb-4">Global Dashboard</h2>
    <form method="get" class="mb-4">
        <label for="company_id" class="form-label">Select company:</label>
        <select name="company_id" id="company_id" class="form-select" onchange="this.form.submit()">
            <?php foreach ($companies as $c): ?>
            <option value="<?php echo $c['id']; ?>" <?php if ($selectedCompany == $c['id']) echo 'selected'; ?>><?php echo htmlspecialchars($c['name']); ?></option>
            <?php endforeach; ?>
        </select>
    </form>
    <div class="row mb-4">
        <div class="col-md-4">
            <div class="dashboard-card">
                <div class="icon">👥</div>
                <div class="card-title">Users</div>
                <p>Total: <?php echo $stats['total_users'] ?? 0; ?></p>
                <ul>
                    <?php foreach ($users as $u): ?>
                    <li><?php echo htmlspecialchars($u['email']); ?> (<?php echo htmlspecialchars($u['role']); ?>)</li>
                    <?php endforeach; ?>
                </ul>
            </div>
        </div>
        <div class="col-md-4">
            <div class="dashboard-card">
                <div class="icon">📦</div>
                <div class="card-title">Active Modules</div>
                <p>Total: <?php echo $stats['total_modules'] ?? 0; ?></p>
                <ul>
                    <?php foreach ($modules as $m): ?>
                    <li><?php echo htmlspecialchars($m['name']); ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        </div>
        <div class="col-md-4">
            <div class="dashboard-card">
                <div class="icon">📊</div>
                <div class="card-title">Statistics</div>
                <p>Active users: <?php echo $stats['total_users'] ?? 0; ?></p>
                <p>Active modules: <?php echo $stats['total_modules'] ?? 0; ?></p>
            </div>
        </div>
    </div>
    <div class="copyright">© 2025 Indice SaaS</div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
