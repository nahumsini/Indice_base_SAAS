<?php
require __DIR__ . '/../bootstrap.php';
require __DIR__ . '/../core/auth.php';
require __DIR__ . '/../core/root.php';
require __DIR__ . '/../core/module_loader.php';
if (!defined('APP_BOOTSTRAPPED')) { http_response_code(403); exit; }
$user = requireRoot();

// CSRF
if (empty($_SESSION['csrf_root_modules_sync'])) { $_SESSION['csrf_root_modules_sync']=bin2hex(random_bytes(16)); }
$csrf = $_SESSION['csrf_root_modules_sync'];

$log = [];$errors=[];$done=false;
if ($_SERVER['REQUEST_METHOD']==='POST') {
    if (!hash_equals($csrf, $_POST['csrf'] ?? '')) { http_response_code(400); exit('Bad CSRF'); }
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $metaAll = loadModulesMetadata();
        // Fetch companies to apply base roles (excluding root central if it exists)
        $companies = $pdo->query("SELECT id FROM companies")->fetchAll(PDO::FETCH_COLUMN);
        foreach ($companies as $cid) {
            // admin/root users of the company
            $ucStmt = $pdo->prepare("SELECT id,role FROM user_companies WHERE company_id=? AND status='active'");
            $ucStmt->execute([$cid]);
            $relRows = $ucStmt->fetchAll(PDO::FETCH_ASSOC);
            foreach ($metaAll as $slug => $m) {
                if (!$m['is_active']) continue;
                // For each user_company relation that is admin or root, ensure manager role for the module
                foreach ($relRows as $rel) {
                    if (!in_array($rel['role'], ['admin','root'])) continue;
                    // Verificar existencia
                    $check = $pdo->prepare("SELECT id FROM user_company_module_roles WHERE user_company_id=? AND module_slug=? LIMIT 1");
                    $check->execute([$rel['id'],$slug]);
                    if (!$check->fetch()) {
                        $ins = $pdo->prepare("INSERT INTO user_company_module_roles (user_company_id,module_slug,role,skill_level) VALUES (?,?,?,0)");
                        $ins->execute([$rel['id'],$slug,'manager']);
                        $log[] = "Assigned manager {$slug} to UC {$rel['id']} (company {$cid})";
                    }
                }
            }
        }
        $pdo->commit();
        $done=true;
    } catch (Throwable $e) {
        $pdo->rollBack();
        $errors[]=$e->getMessage();
    }
}
?>
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Sync Base Modules</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body>
<?php $active='modules'; include __DIR__.'/_root_nav.php'; ?>
<div class="container mt-4">
    <h1 class="h4">Synchronize Base Module Roles</h1>
    <p class="text-muted">Assigns <code>manager</code> role for each active module to users with <code>admin</code> or <code>root</code> role in all companies.</p>
    <?php if($done && !$errors): ?><div class="alert alert-success">Synchronization completed.</div><?php endif; ?>
    <?php if($errors): ?><div class="alert alert-danger"><ul class="mb-0"><?php foreach($errors as $e){echo '<li>'.htmlspecialchars($e).'</li>'; } ?></ul></div><?php endif; ?>
    <form method="post" class="mb-4">
        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
        <button class="btn btn-primary" onclick="return confirm('Run synchronization?');">Run synchronization</button>
    </form>
    <?php if($log): ?>
    <div class="card mb-4"><div class="card-header">Log</div><div class="card-body"><pre style="font-size:12px;white-space:pre-wrap;"><?= htmlspecialchars(implode("\n",$log)); ?></pre></div></div>
    <?php endif; ?>
</div>
</body>
</html>
