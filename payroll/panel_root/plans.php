<?php
/**
 * Root Panel - Plan Management
 * 
 * CRUD for subscription plans
 */
require __DIR__ . '/../bootstrap.php';
if (!defined('APP_BOOTSTRAPPED')) { http_response_code(403); exit; }
require __DIR__ . '/../core/auth.php';
require __DIR__ . '/../core/root.php';

requireLogin();
$rootUser = requireRoot();

// CSRF
if (empty($_SESSION['csrf_root_plans'])) {
    $_SESSION['csrf_root_plans'] = bin2hex(random_bytes(16));
}
$csrf = $_SESSION['csrf_root_plans'];

$message = '';
$messageType = 'success';
$editPlan = null;

// Edit mode
if (isset($_GET['edit'])) {
    $editId = (int)$_GET['edit'];
    $stmt = db()->prepare("SELECT * FROM plans WHERE id = ?");
    $stmt->execute([$editId]);
    $editPlan = $stmt->fetch(PDO::FETCH_ASSOC);
}

// Procesar POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($csrf, $_POST['csrf'] ?? '')) {
        http_response_code(400); exit('Bad CSRF');
    }
    
    $action = $_POST['action'] ?? 'save';
    
    if ($action === 'delete') {
        $planId = (int)($_POST['plan_id'] ?? 0);
        if ($planId) {
            $stmt = db()->prepare("DELETE FROM plans WHERE id = ?");
            $stmt->execute([$planId]);
            $message = "Plan deleted";
        }
    } else {
        // Save/update
        $planId = (int)($_POST['plan_id'] ?? 0);
        $name = trim($_POST['name'] ?? '');
        $slug = trim($_POST['slug'] ?? '');
        $price = (float)($_POST['price'] ?? 0);
        $currency = trim($_POST['currency'] ?? 'USD');
        $userLimit = $_POST['user_limit'] !== '' ? (int)$_POST['user_limit'] : null;
        $extraUserPrice = $_POST['extra_user_price'] !== '' ? (float)$_POST['extra_user_price'] : 5.00;
        $trialDays = (int)($_POST['trial_days'] ?? 30);
        $description = trim($_POST['description'] ?? '');
        $modulesSelected = $_POST['modules'] ?? [];
        
        // Auto slug
        if (!$slug && $name) {
            $slug = strtolower(preg_replace('/[^a-z0-9]+/', '_', $name));
        }
        
        if ($planId > 0) {
            // Update
            $stmt = db()->prepare("
                UPDATE plans SET 
                    name = ?, slug = ?, price = ?, currency = ?, 
                    user_limit = ?, extra_user_price = ?, trial_days = ?, 
                    description = ?, modules_included = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $name, $slug, $price, $currency,
                $userLimit, $extraUserPrice, $trialDays,
                $description, json_encode($modulesSelected),
                $planId
            ]);
            $message = "Plan updated";
        } else {
            // Insert
            $stmt = db()->prepare("
                INSERT INTO plans (name, slug, price, currency, user_limit, extra_user_price, trial_days, description, modules_included, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ");
            $stmt->execute([
                $name, $slug, $price, $currency,
                $userLimit, $extraUserPrice, $trialDays,
                $description, json_encode($modulesSelected)
            ]);
            $message = "Plan created";
        }
    }
    
    $_SESSION['root_flash'] = ['message' => $message, 'type' => $messageType];
    header('Location: plans.php');
    exit;
}

// Flash
if (isset($_SESSION['root_flash'])) {
    $message = $_SESSION['root_flash']['message'];
    $messageType = $_SESSION['root_flash']['type'];
    unset($_SESSION['root_flash']);
}

// Load data
$plans = db()->query("SELECT * FROM plans ORDER BY price ASC")->fetchAll(PDO::FETCH_ASSOC);
$allModules = db()->query("SELECT slug, name FROM modules WHERE is_active = 1 ORDER BY sort_order, name")->fetchAll(PDO::FETCH_ASSOC);

// Modules included in current plan (editing)
$editModules = [];
if ($editPlan && !empty($editPlan['modules_included'])) {
    $editModules = json_decode($editPlan['modules_included'], true) ?: [];
}

$pageTitle = 'Plans';
include __DIR__ . '/_root_nav.php';
?>

    <div class="page-header d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
            <h1 class="page-title">Plan Management</h1>
            <p class="page-subtitle">Create and edit subscription plans</p>
        </div>
    </div>

    <?php if ($message): ?>
    <div class="alert alert-<?= $messageType; ?> alert-dismissible fade show" role="alert">
        <?= htmlspecialchars($message); ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
    <?php endif; ?>

    <div class="row g-4">
        <!-- Formulario -->
        <div class="col-lg-5">
            <div class="root-card">
                <div class="root-card-header">
                    <i class="bi bi-<?= $editPlan ? 'pencil' : 'plus-circle'; ?> me-2"></i>
                    <?= $editPlan ? 'Edit Plan' : 'New Plan'; ?>
                </div>
                <div class="root-card-body">
                    <form method="post">
                        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                        <?php if ($editPlan): ?>
                            <input type="hidden" name="plan_id" value="<?= $editPlan['id']; ?>">
                        <?php endif; ?>
                        
                        <div class="mb-3">
                            <label class="form-label">Plan Name</label>
                            <input type="text" name="name" class="form-control root-input" required
                                   value="<?= htmlspecialchars($editPlan['name'] ?? ''); ?>">
                        </div>
                        
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label">Slug</label>
                                <input type="text" name="slug" class="form-control root-input" placeholder="auto"
                                       value="<?= htmlspecialchars($editPlan['slug'] ?? ''); ?>">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Currency</label>
                                <select name="currency" class="form-select root-input">
                                    <option value="USD" <?= ($editPlan['currency'] ?? 'USD') === 'USD' ? 'selected' : ''; ?>>USD</option>
                                    <option value="MXN" <?= ($editPlan['currency'] ?? '') === 'MXN' ? 'selected' : ''; ?>>MXN</option>
                                </select>
                            </div>
                        </div>
                        
                        <div class="row g-3 mt-1">
                            <div class="col-md-6">
                                <label class="form-label">Monthly Price</label>
                                <input type="number" name="price" step="0.01" class="form-control root-input"
                                       value="<?= $editPlan['price'] ?? 0; ?>">
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Trial Days</label>
                                <input type="number" name="trial_days" class="form-control root-input"
                                       value="<?= $editPlan['trial_days'] ?? 30; ?>">
                            </div>
                        </div>
                        
                        <div class="row g-3 mt-1">
                            <div class="col-md-6">
                                <label class="form-label">User Limit</label>
                                <input type="number" name="user_limit" class="form-control root-input" placeholder="∞ unlimited"
                                       value="<?= $editPlan['user_limit'] ?? ''; ?>">
                                <small class="text-muted">Leave empty = unlimited</small>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label">Extra User Price</label>
                                <input type="number" name="extra_user_price" step="0.01" class="form-control root-input"
                                       value="<?= $editPlan['extra_user_price'] ?? 5; ?>">
                            </div>
                        </div>
                        
                        <div class="mb-3 mt-3">
                            <label class="form-label">Description</label>
                            <textarea name="description" class="form-control root-input" rows="2"><?= htmlspecialchars($editPlan['description'] ?? ''); ?></textarea>
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Included Modules</label>
                            <div class="row g-2" style="max-height: 200px; overflow-y: auto;">
                                <?php foreach ($allModules as $m): ?>
                                    <div class="col-6">
                                        <div class="form-check">
                                            <input type="checkbox" name="modules[]" value="<?= htmlspecialchars($m['slug']); ?>"
                                                   class="form-check-input" id="mod_<?= $m['slug']; ?>"
                                                   <?= in_array($m['slug'], $editModules) ? 'checked' : ''; ?>>
                                            <label class="form-check-label" for="mod_<?= $m['slug']; ?>">
                                                <?= htmlspecialchars($m['name']); ?>
                                            </label>
                                        </div>
                                    </div>
                                <?php endforeach; ?>
                            </div>
                        </div>
                        
                        <div class="d-flex gap-2">
                            <button type="submit" class="btn btn-root-primary">
                                <i class="bi bi-check-lg me-1"></i><?= $editPlan ? 'Update' : 'Create Plan'; ?>
                            </button>
                            <?php if ($editPlan): ?>
                                <a href="plans.php" class="btn btn-root-outline">Cancel</a>
                            <?php endif; ?>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <!-- Plans list -->
        <div class="col-lg-7">
            <div class="root-card">
                <div class="root-card-header">
                    <i class="bi bi-collection me-2"></i>Existing Plans
                </div>
                <div class="root-card-body p-0">
                    <table class="root-table">
                        <thead>
                            <tr>
                                <th>Plan</th>
                                <th>Price</th>
                                <th>Users</th>
                                <th>Trial</th>
                                <th>Modules</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($plans)): ?>
                                <tr><td colspan="6" class="text-center py-3 text-muted">No plans found</td></tr>
                            <?php else: ?>
                                <?php foreach ($plans as $p): ?>
                                    <?php $mods = json_decode($p['modules_included'] ?? '[]', true) ?: []; ?>
                                    <tr>
                                        <td>
                                            <strong><?= htmlspecialchars($p['name']); ?></strong>
                                            <br><code class="small"><?= htmlspecialchars($p['slug']); ?></code>
                                        </td>
                                        <td>
                                            $<?= number_format($p['price'], 2); ?> <?= $p['currency']; ?>
                                        </td>
                                        <td>
                                            <?= $p['user_limit'] ?? '∞'; ?>
                                            <?php if ($p['extra_user_price']): ?>
                                                <br><small class="text-muted">+$<?= number_format($p['extra_user_price'], 2); ?>/extra</small>
                                            <?php endif; ?>
                                        </td>
                                        <td><?= (int)$p['trial_days']; ?>d</td>
                                        <td>
                                            <span class="badge badge-root badge-primary"><?= count($mods); ?></span>
                                        </td>
                                        <td>
                                            <a href="?edit=<?= $p['id']; ?>" class="btn btn-sm btn-outline-primary">
                                                <i class="bi bi-pencil"></i>
                                            </a>
                                            <form method="post" style="display: inline;">
                                                <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                                                <input type="hidden" name="action" value="delete">
                                                <input type="hidden" name="plan_id" value="<?= $p['id']; ?>">
                                                <button type="submit" class="btn btn-sm btn-outline-danger" onclick="return confirm('Delete plan?')">
                                                    <i class="bi bi-trash"></i>
                                                </button>
                                            </form>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

</main>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
