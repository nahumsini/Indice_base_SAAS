<?php
require __DIR__ . '/../bootstrap.php';
if (!defined('APP_BOOTSTRAPPED')) { http_response_code(403); exit; }
require __DIR__ . '/../core/auth.php';
require __DIR__ . '/../core/permissions.php';
require __DIR__ . '/../core/root.php';

requireLogin();
$root = requireRoot();

// Simple CSRF token for form
if (empty($_SESSION['csrf_root_modules'])) {
    $_SESSION['csrf_root_modules'] = bin2hex(random_bytes(16));
}
$csrf = $_SESSION['csrf_root_modules'];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($csrf, $_POST['csrf'] ?? '')) {
        http_response_code(400); exit('Bad CSRF');
    }
    $name = trim($_POST['name'] ?? '');
    $slug = trim($_POST['slug'] ?? '');
    if (!preg_match('/^[a-z0-9_\-]{2,50}$/', $slug)) { http_response_code(422); exit('Invalid slug'); }
    $stmt = db()->prepare("INSERT INTO modules (name,slug,description,icon,badge_text,tier,sort_order,is_core,is_active) VALUES (:name,:slug,:description,:icon,:badge,:tier,:sort,:core,:active)");
    $stmt->execute([
        ':name' => $name,
        ':slug' => $slug,
        ':description' => $_POST['description'] ?? null,
        ':icon' => $_POST['icon'] ?? null,
        ':badge' => $_POST['badge_text'] ?? null,
        ':tier' => $_POST['tier'] ?? null,
        ':sort' => (int)($_POST['sort_order'] ?? 0),
        ':core' => isset($_POST['is_core']) ? 1 : 0,
        ':active' => isset($_POST['is_active']) ? 1 : 0,
    ]);
    header('Location: modules.php?created=1');
    exit;
}

$mods = db()->query("SELECT * FROM modules ORDER BY sort_order")->fetchAll(PDO::FETCH_ASSOC);
?><!doctype html>
<html>
<head>
    <meta charset="utf-8">
    <title>Modules — Root Panel</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <link href="/assets/css/app.css" rel="stylesheet">
</head>
<body>
<?php $active='modules'; include __DIR__.'/_root_nav.php'; ?>
<div class="container mt-4">
    <h1>Modules</h1>
    <form method="post" class="row g-2 mb-4">
        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
        <div class="col-md-3"><input type="text" name="name" class="form-control" placeholder="Name" required></div>
        <div class="col-md-2"><input type="text" name="slug" class="form-control" placeholder="slug" required></div>
        <div class="col-md-2"><input type="text" name="icon" class="form-control" placeholder="icon"></div>
        <div class="col-md-2"><input type="text" name="badge_text" class="form-control" placeholder="badge"></div>
        <div class="col-md-1"><input type="number" name="sort_order" class="form-control" placeholder="sort"></div>
        <div class="col-md-1"><input type="text" name="tier" class="form-control" placeholder="tier"></div>
        <div class="col-md-1 form-check"><input class="form-check-input" type="checkbox" name="is_core" id="core"><label class="form-check-label" for="core">Core</label></div>
        <div class="col-md-1 form-check"><input class="form-check-input" type="checkbox" name="is_active" id="active" checked><label class="form-check-label" for="active">Act</label></div>
        <div class="col-md-1"><button class="btn btn-primary">Save</button></div>
    </form>
    <table class="table table-bordered">
        <tr><th>Name</th><th>Slug</th><th>Tier</th><th>Active</th></tr>
        <?php foreach ($mods as $m): ?>
        <tr>
            <td><?php echo htmlspecialchars($m['name']); ?></td>
            <td><?php echo htmlspecialchars($m['slug']); ?></td>
            <td><?php echo htmlspecialchars($m['tier']); ?></td>
            <td><?php echo $m['is_active'] ? 'Yes' : 'No'; ?></td>
        </tr>
        <?php endforeach; ?>
    </table>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
