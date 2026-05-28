<?php
/**
 * Root Panel: MVP Module Access Control
 * 
 * Manages:
 * - MVP status of modules (released/construction/hidden)
 * - Bypass users (testers with full access)
 */
require __DIR__ . '/../bootstrap.php';
if (!defined('APP_BOOTSTRAPPED')) { http_response_code(403); exit; }
require __DIR__ . '/../core/auth.php';
require __DIR__ . '/../core/permissions.php';
require __DIR__ . '/../core/root.php';
require __DIR__ . '/../core/module_loader.php';

requireLogin();
$root = requireRoot();
$user = $root; // Usuario root actual

// CSRF
if (empty($_SESSION['csrf_mvp_access'])) {
    $_SESSION['csrf_mvp_access'] = bin2hex(random_bytes(16));
}
$csrf = $_SESSION['csrf_mvp_access'];

$message = '';
$messageType = 'success';

// Process POST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($csrf, $_POST['csrf'] ?? '')) {
        http_response_code(400); exit('Bad CSRF');
    }
    
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'update_module_status':
            $slug = $_POST['slug'] ?? '';
            $status = $_POST['status'] ?? '';
            if ($slug && in_array($status, ['released', 'construction', 'hidden'])) {
                if (updateModuleMvpStatus($slug, $status)) {
                    $message = "Module '{$slug}' status updated to '{$status}'";
                } else {
                    $message = "Error updating module";
                    $messageType = 'danger';
                }
            }
            break;
            
        case 'add_bypass':
            $email = trim($_POST['email'] ?? '');
            $reason = trim($_POST['reason'] ?? 'Tester MVP');
            if ($email) {
                // Buscar usuario por email
                $stmt = db()->prepare("SELECT id FROM users WHERE email = ?");
                $stmt->execute([$email]);
                $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($targetUser) {
                    if (addMvpBypassUser($targetUser['id'], $user['id'], $reason)) {
                        $message = "User '{$email}' added as bypass";
                    } else {
                        $message = "Error adding bypass user";
                        $messageType = 'danger';
                    }
                } else {
                    $message = "User with email '{$email}' not found";
                    $messageType = 'warning';
                }
            }
            break;
            
        case 'remove_bypass':
            $userId = (int)($_POST['user_id'] ?? 0);
            if ($userId) {
                if (removeMvpBypassUser($userId)) {
                    $message = "User removed from bypass";
                } else {
                    $message = "Error removing user";
                    $messageType = 'danger';
                }
            }
            break;
    }
    
    // Redirect to prevent form resubmission
    if ($message) {
        $_SESSION['mvp_flash'] = ['message' => $message, 'type' => $messageType];
    }
    header('Location: module_access.php');
    exit;
}

// Flash message
if (isset($_SESSION['mvp_flash'])) {
    $message = $_SESSION['mvp_flash']['message'];
    $messageType = $_SESSION['mvp_flash']['type'];
    unset($_SESSION['mvp_flash']);
}

// Load data
$modules = db()->query("SELECT slug, name, mvp_status, is_active FROM modules ORDER BY sort_order, name")->fetchAll(PDO::FETCH_ASSOC);
$bypassUsers = listMvpBypassUsers();
$mvpConfig = getMvpConfig();

// Statistics
$stats = [
    'released' => count(array_filter($modules, fn($m) => $m['mvp_status'] === 'released')),
    'construction' => count(array_filter($modules, fn($m) => $m['mvp_status'] === 'construction')),
    'hidden' => count(array_filter($modules, fn($m) => $m['mvp_status'] === 'hidden')),
    'bypass_users' => count($bypassUsers)
];
?><!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>MVP Control — Root Panel</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
    <link href="/assets/css/app.css" rel="stylesheet">
    <style>
        .status-badge { font-size: 0.75rem; padding: 0.35em 0.65em; }
        .status-released { background: #10b981; color: #fff; }
        .status-construction { background: #f59e0b; color: #111; }
        .status-hidden { background: #6b7280; color: #fff; }
        .stat-card { border-radius: 12px; padding: 1rem; text-align: center; }
        .stat-card h3 { margin: 0; font-size: 2rem; font-weight: 700; }
        .stat-card small { color: #64748b; }
        .action-btn { padding: 0.25rem 0.5rem; font-size: 0.75rem; }
    </style>
</head>
<body>
<?php $active='mvp_access'; include __DIR__.'/_root_nav.php'; ?>

<div class="container mt-4">
    <div class="d-flex justify-content-between align-items-center mb-4">
        <h1 class="mb-0"><i class="bi bi-shield-lock me-2"></i>MVP Access Control</h1>
        <span class="badge <?= $mvpConfig['enabled'] ? 'bg-success' : 'bg-secondary'; ?>">
            MVP <?= $mvpConfig['enabled'] ? 'Active' : 'Disabled'; ?>
        </span>
    </div>
    
    <?php if ($message): ?>
    <div class="alert alert-<?= $messageType; ?> alert-dismissible fade show" role="alert">
        <?= htmlspecialchars($message); ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
    <?php endif; ?>
    
    <!-- Statistics -->
    <div class="row g-3 mb-4">
        <div class="col-md-3">
            <div class="stat-card bg-success bg-opacity-10 border border-success">
                <h3 class="text-success"><?= $stats['released']; ?></h3>
                <small>Released Modules</small>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-card bg-warning bg-opacity-10 border border-warning">
                <h3 class="text-warning"><?= $stats['construction']; ?></h3>
                <small>Under Construction</small>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-card bg-secondary bg-opacity-10 border border-secondary">
                <h3 class="text-secondary"><?= $stats['hidden']; ?></h3>
                <small>Hidden</small>
            </div>
        </div>
        <div class="col-md-3">
            <div class="stat-card bg-primary bg-opacity-10 border border-primary">
                <h3 class="text-primary"><?= $stats['bypass_users']; ?></h3>
                <small>Bypass Users</small>
            </div>
        </div>
    </div>
    
    <!-- Modules -->
    <div class="card mb-4">
        <div class="card-header bg-white">
            <h5 class="mb-0"><i class="bi bi-grid-3x3-gap me-2"></i>Module Status</h5>
        </div>
        <div class="card-body p-0">
            <table class="table table-hover mb-0">
                <thead class="table-light">
                    <tr>
                        <th>Module</th>
                        <th>Slug</th>
                        <th>MVP Status</th>
                        <th>Active</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($modules as $m): ?>
                    <tr>
                        <td><strong><?= htmlspecialchars($m['name']); ?></strong></td>
                        <td><code><?= htmlspecialchars($m['slug']); ?></code></td>
                        <td>
                            <?php
                            $statusClass = 'status-' . $m['mvp_status'];
                            $statusLabel = match($m['mvp_status']) {
                                'released' => '✅ Released',
                                'construction' => '🚧 Construction',
                                'hidden' => '👁 Hidden',
                                default => $m['mvp_status']
                            };
                            ?>
                            <span class="badge status-badge <?= $statusClass; ?>"><?= $statusLabel; ?></span>
                        </td>
                        <td>
                            <?= $m['is_active'] ? '<span class="text-success">Yes</span>' : '<span class="text-muted">No</span>'; ?>
                        </td>
                        <td>
                            <?php if ($m['mvp_status'] !== 'released'): ?>
                            <form method="post" class="d-inline">
                                <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                                <input type="hidden" name="action" value="update_module_status">
                                <input type="hidden" name="slug" value="<?= htmlspecialchars($m['slug']); ?>">
                                <input type="hidden" name="status" value="released">
                                <button type="submit" class="btn btn-success action-btn" title="Release">
                                    <i class="bi bi-check-lg"></i> Release
                                </button>
                            </form>
                            <?php endif; ?>
                            
                            <?php if ($m['mvp_status'] !== 'construction'): ?>
                            <form method="post" class="d-inline">
                                <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                                <input type="hidden" name="action" value="update_module_status">
                                <input type="hidden" name="slug" value="<?= htmlspecialchars($m['slug']); ?>">
                                <input type="hidden" name="status" value="construction">
                                <button type="submit" class="btn btn-warning action-btn" title="Under construction">
                                    <i class="bi bi-cone-striped"></i> Construction
                                </button>
                            </form>
                            <?php endif; ?>
                            
                            <?php if ($m['mvp_status'] !== 'hidden'): ?>
                            <form method="post" class="d-inline">
                                <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                                <input type="hidden" name="action" value="update_module_status">
                                <input type="hidden" name="slug" value="<?= htmlspecialchars($m['slug']); ?>">
                                <input type="hidden" name="status" value="hidden">
                                <button type="submit" class="btn btn-secondary action-btn" title="Hide">
                                    <i class="bi bi-eye-slash"></i> Hide
                                </button>
                            </form>
                            <?php endif; ?>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
    
    <!-- Bypass Users -->
    <div class="card mb-4">
        <div class="card-header bg-white d-flex justify-content-between align-items-center">
            <h5 class="mb-0"><i class="bi bi-person-badge me-2"></i>Users with Bypass Access</h5>
            <button class="btn btn-primary btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#addBypassForm">
                <i class="bi bi-plus-lg"></i> Add
            </button>
        </div>
        
        <!-- Add form -->
        <div class="collapse" id="addBypassForm">
            <div class="card-body border-bottom bg-light">
                <form method="post" class="row g-2 align-items-end">
                    <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                    <input type="hidden" name="action" value="add_bypass">
                    <div class="col-md-5">
                        <label class="form-label">User email</label>
                        <input type="email" name="email" class="form-control" placeholder="user@example.com" required>
                    </div>
                    <div class="col-md-5">
                        <label class="form-label">Reason</label>
                        <input type="text" name="reason" class="form-control" placeholder="Tester MVP" value="Tester MVP">
                    </div>
                    <div class="col-md-2">
                        <button type="submit" class="btn btn-success w-100">
                            <i class="bi bi-check-lg"></i> Add
                        </button>
                    </div>
                </form>
            </div>
        </div>
        
        <div class="card-body p-0">
            <?php if (empty($bypassUsers)): ?>
            <div class="text-center py-4 text-muted">
                <i class="bi bi-person-x" style="font-size: 2rem;"></i>
                <p class="mb-0 mt-2">No bypass users configured</p>
                <small>Bypass users can view all modules regardless of their MVP status</small>
            </div>
            <?php else: ?>
            <table class="table table-hover mb-0">
                <thead class="table-light">
                    <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Reason</th>
                        <th>Added by</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($bypassUsers as $bu): ?>
                    <tr>
                        <td><strong><?= htmlspecialchars($bu['user_name'] ?? 'N/A'); ?></strong></td>
                        <td><?= htmlspecialchars($bu['user_email']); ?></td>
                        <td><span class="badge bg-info"><?= htmlspecialchars($bu['reason']); ?></span></td>
                        <td><?= htmlspecialchars($bu['granted_by_name'] ?? 'System'); ?></td>
                        <td><small class="text-muted"><?= date('d/m/Y H:i', strtotime($bu['created_at'])); ?></small></td>
                        <td>
                            <form method="post" class="d-inline" onsubmit="return confirm('Remove bypass access from this user?');">
                                <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                                <input type="hidden" name="action" value="remove_bypass">
                                <input type="hidden" name="user_id" value="<?= (int)$bu['user_id']; ?>">
                                <button type="submit" class="btn btn-outline-danger btn-sm">
                                    <i class="bi bi-x-lg"></i> Remove
                                </button>
                            </form>
                        </td>
                    </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
            <?php endif; ?>
        </div>
    </div>
    
    <!-- Info -->
    <div class="alert alert-info">
        <h6><i class="bi bi-info-circle me-2"></i>Information</h6>
        <ul class="mb-0 small">
            <li><strong>Released:</strong> Module visible and accessible to all users</li>
            <li><strong>Construction:</strong> Module visible but blocked with message "<?= htmlspecialchars($mvpConfig['construction_message']); ?>"</li>
            <li><strong>Hidden:</strong> Module completely hidden from the dashboard</li>
            <li><strong>Bypass Users:</strong> Can access all modules regardless of MVP status</li>
            <li><strong>Root Users:</strong> Automatically have access to everything (no bypass needed)</li>
        </ul>
    </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
