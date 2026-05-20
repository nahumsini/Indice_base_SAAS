<?php
require __DIR__ . '/../bootstrap.php';
require __DIR__ . '/../core/auth.php';
require __DIR__ . '/../core/root.php';
if (!defined('APP_BOOTSTRAPPED')) { http_response_code(403); exit; }
$user = requireRoot();

// CSRF
if (empty($_SESSION['csrf_root_assign'])) { $_SESSION['csrf_root_assign'] = bin2hex(random_bytes(16)); }
$csrf = $_SESSION['csrf_root_assign'];

// Fetch companies
$companies = db()->query("SELECT id,name,plan_id FROM companies ORDER BY name")->fetchAll(PDO::FETCH_ASSOC);
// Fetch plans
$plans = db()->query("SELECT id,name,modules_included FROM plans ORDER BY id")->fetchAll(PDO::FETCH_ASSOC);
// Fetch active modules for add-ons
$allModules = db()->query("SELECT id,slug,name FROM modules WHERE is_active=1 ORDER BY sort_order,name")->fetchAll(PDO::FETCH_ASSOC);

$selectedCompanyId = isset($_GET['company_id']) ? (int)$_GET['company_id'] : null;
if (!$selectedCompanyId && $companies) { $selectedCompanyId = $companies[0]['id']; }

// Helper: current company record
$currentCompany = null;
if ($selectedCompanyId) {
    $stmt = db()->prepare("SELECT * FROM companies WHERE id=? LIMIT 1");
    $stmt->execute([$selectedCompanyId]);
    $currentCompany = $stmt->fetch(PDO::FETCH_ASSOC);
}

// Fetch existing add-on modules table. We store in company_modules_overrides (if exists). Fallback to empty array.
$addonTableExists = false;
$addons = [];
try {
    $check = db()->query("SHOW TABLES LIKE 'company_module_addons'")->fetch();
    if ($check) { $addonTableExists = true; }
} catch (Exception $e) {}
if ($addonTableExists && $selectedCompanyId) {
    $stmt = db()->prepare("SELECT module_slug FROM company_module_addons WHERE company_id=?");
    $stmt->execute([$selectedCompanyId]);
    $addons = array_column($stmt->fetchAll(PDO::FETCH_ASSOC), 'module_slug');
}

// POST handling: assign plan & add-ons
if ($_SERVER['REQUEST_METHOD']==='POST') {
    if (!hash_equals($csrf, $_POST['csrf'] ?? '')) { http_response_code(400); exit('Bad CSRF'); }
    $cId = (int)($_POST['company_id'] ?? 0);
    $planId = (int)($_POST['plan_id'] ?? 0);
    $addonMods = $_POST['addon_mods'] ?? [];
    // Update company plan
    if ($cId>0) {
        $stmt = db()->prepare("UPDATE companies SET plan_id=:p, plan_started_at=IF(plan_id IS NULL OR plan_id<>:p, NOW(), plan_started_at) WHERE id=:id LIMIT 1");
        $stmt->execute([':p'=>$planId?:null, ':id'=>$cId]);
        // Store addons if table exists
        if ($addonTableExists) {
            $del = db()->prepare("DELETE FROM company_module_addons WHERE company_id=?");
            $del->execute([$cId]);
            if ($addonMods) {
                $ins = db()->prepare("INSERT INTO company_module_addons (company_id, module_slug) VALUES (?,?)");
                foreach ($addonMods as $slug) {
                    if (preg_match('/^[a-z0-9_\-]{2,60}$/', $slug)) { $ins->execute([$cId,$slug]); }
                }
            }
        }
    }
    header('Location: assign_module.php?company_id='.$cId.'&saved=1');
    exit;
}

// Determine plan modules for display
$planModules = [];
if ($currentCompany && $currentCompany['plan_id']) {
    foreach ($plans as $pl) {
        if ($pl['id']==$currentCompany['plan_id']) {
            $planModules = json_decode($pl['modules_included'] ?? '[]', true) ?: [];
            break;
        }
    }
}

?><!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Assign Plan and Modules — Root Panel</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <link href="/assets/css/app.css" rel="stylesheet">
</head>
<body>
<?php $active='assign'; include __DIR__.'/_root_nav.php'; ?>
<div class="container mt-4">
    <h2 class="mb-3">Assign Plan and Add-ons</h2>
    <form method="get" class="row g-2 mb-4 align-items-end">
        <div class="col-md-5">
            <label class="form-label">Company</label>
            <select name="company_id" class="form-select" onchange="this.form.submit()">
                <?php foreach ($companies as $c): ?>
                    <option value="<?= $c['id']; ?>" <?= $selectedCompanyId==$c['id']?'selected':''; ?>><?= htmlspecialchars($c['name']); ?></option>
                <?php endforeach; ?>
            </select>
        </div>
        <div class="col-md-2">
            <button class="btn btn-secondary w-100">Load</button>
        </div>
    </form>

    <?php if ($currentCompany): ?>
        <?php if (!empty($_GET['saved'])): ?><div class="alert alert-success py-2">Guardado.</div><?php endif; ?>
        <form method="post" class="border rounded p-3 mb-4 bg-light">
            <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
            <input type="hidden" name="company_id" value="<?= (int)$currentCompany['id']; ?>">
            <div class="row g-3">
                <div class="col-md-4">
                    <label class="form-label">Plan</label>
                    <select name="plan_id" class="form-select">
                        <option value="">(No plan)</option>
                        <?php foreach ($plans as $pl): ?>
                            <option value="<?= $pl['id']; ?>" <?= $currentCompany['plan_id']==$pl['id']?'selected':''; ?>><?= htmlspecialchars($pl['name']); ?></option>
                        <?php endforeach; ?>
                    </select>
                </div>
                <div class="col-md-8">
                    <label class="form-label">Add-ons (Extra modules)</label>
                    <div class="row row-cols-2 row-cols-md-4 g-1">
                        <?php foreach ($allModules as $m): $slug=$m['slug']; $inPlan=in_array($slug,$planModules); $isAddon=in_array($slug,$addons); ?>
                            <div class="col">
                                <label class="form-check small <?= $inPlan?'opacity-50':''; ?>" title="<?= $inPlan?'Incluido en el plan':''; ?>">
                                    <input type="checkbox" class="form-check-input" name="addon_mods[]" value="<?= htmlspecialchars($slug); ?>" <?= $inPlan?'disabled':''; ?> <?= $isAddon?'checked':''; ?>> <?= htmlspecialchars($m['name']); ?>
                                </label>
                            </div>
                        <?php endforeach; ?>
                    </div>
                    <div class="form-text">Modules already included in the plan are disabled.</div>
                </div>
                <div class="col-12">
                    <button class="btn btn-primary">Save Changes</button>
                </div>
            </div>
        </form>
        <?php if ($planModules): ?>
            <h5>Current Plan Modules</h5>
            <p class="small mb-2"><code><?= htmlspecialchars(implode(', ', $planModules)); ?></code></p>
        <?php endif; ?>
    <?php else: ?>
        <div class="alert alert-warning">No company selected.</div>
    <?php endif; ?>

    <div class="small text-muted mt-4">
        Next steps: record change history, recalculate user limits when changing plan, and regenerate base roles.
    </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
