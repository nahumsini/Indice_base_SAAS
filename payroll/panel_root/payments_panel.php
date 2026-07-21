<?php
require __DIR__ . '/../bootstrap.php';
require __DIR__ . '/../core/auth.php';
require __DIR__ . '/../core/root.php';
requireLogin();
requireRoot();
if (empty($_SESSION['csrf_root_payments'])) { $_SESSION['csrf_root_payments']=bin2hex(random_bytes(16)); }
$csrf = $_SESSION['csrf_root_payments'];
$configFile = __DIR__ . '/stripe_config.php';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($csrf, $_POST['csrf'] ?? '')) { http_response_code(400); exit('Bad CSRF'); }
    header('Location: payments_panel.php?managed=1');
    exit;
}
$config = require $configFile;
?>
<!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Stripe — Root Panel</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <link href="/assets/css/app.css" rel="stylesheet">
</head>
<body>
<?php $active='stripe'; include __DIR__.'/_root_nav.php'; ?>
<div class="container mt-4">
    <h1 class="mb-3">Stripe Configuration</h1>
    <?php if (!empty($_GET['managed'])): ?><div class="alert alert-warning py-2">Las credenciales se administran mediante secretos del despliegue.</div><?php endif; ?>
    <form method="post" class="row g-3">
        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
        <div class="col-md-3">
            <label class="form-label">Modo</label>
            <select name="mode" class="form-select">
                <option value="test"<?= $config['mode']==='test'?' selected':''; ?>>Test</option>
                <option value="live"<?= $config['mode']==='live'?' selected':''; ?>>Live</option>
            </select>
        </div>
        <div class="col-md-6">
            <label class="form-label">Secret Key (Test)</label>
            <input type="password" name="secret_key_test" class="form-control" value="" autocomplete="new-password">
        </div>
        <div class="col-md-6">
            <label class="form-label">Secret Key (Live)</label>
            <input type="password" name="secret_key_live" class="form-control" value="" autocomplete="new-password">
        </div>
        <div class="col-md-6">
            <label class="form-label">Publishable Key (Test)</label>
            <input type="text" name="publishable_key_test" class="form-control" value="">
        </div>
        <div class="col-md-6">
            <label class="form-label">Publishable Key (Live)</label>
            <input type="text" name="publishable_key_live" class="form-control" value="">
        </div>
        <div class="col-12">
            <button class="btn btn-secondary">Managed by deployment secrets</button>
        </div>
    </form>
    <div class="mt-4 small text-muted">
        Stripe keys are never displayed or stored by this panel. Configure them in the deployment secret store.
    </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
