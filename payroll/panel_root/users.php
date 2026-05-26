<?php
/**
 * Root Panel - MVP User Management
 * 
 * Allows:
 * - View/add bypass users (testers with access to all modules)
 * - Change MVP status of modules (released/construction/hidden)
 * - Create root users
 */
require __DIR__ . '/../bootstrap.php';
if (!defined('APP_BOOTSTRAPPED')) { http_response_code(403); exit; }
require __DIR__ . '/../core/auth.php';
require __DIR__ . '/../core/root.php';
require __DIR__ . '/../core/module_loader.php';

requireLogin();
$rootUser = requireRoot();

// CSRF
if (empty($_SESSION['csrf_root_users'])) {
    $_SESSION['csrf_root_users'] = bin2hex(random_bytes(16));
}
$csrf = $_SESSION['csrf_root_users'];

$message = '';
$messageType = 'success';

// Process POST actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($csrf, $_POST['csrf'] ?? '')) {
        http_response_code(400); exit('Bad CSRF');
    }
    
    $action = $_POST['action'] ?? '';
    
    switch ($action) {
        case 'add_mvp_user':
            $email = trim($_POST['email'] ?? '');
            $reason = trim($_POST['reason'] ?? 'Tester MVP');
            if ($email) {
                $stmt = db()->prepare("SELECT id, full_name AS name FROM users WHERE email = ?");
                $stmt->execute([$email]);
                $targetUser = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($targetUser) {
                    if (addMvpBypassUser($targetUser['id'], $rootUser['id'], $reason)) {
                        $message = "User '{$targetUser['name']}' ({$email}) added as MVP";
                    } else {
                        $message = "Error adding user. They may already exist.";
                        $messageType = 'warning';
                    }
                } else {
                    $message = "User with email '{$email}' not found";
                    $messageType = 'danger';
                }
            }
            break;
            
        case 'remove_mvp_user':
            $userId = (int)($_POST['user_id'] ?? 0);
            if ($userId && removeMvpBypassUser($userId)) {
                $message = "User removed from MVP list";
            } else {
                $message = "Error removing user";
                $messageType = 'danger';
            }
            break;
            
        case 'update_module_status':
            $slug = $_POST['slug'] ?? '';
            $status = $_POST['status'] ?? '';
            if ($slug && in_array($status, ['released', 'construction', 'hidden'])) {
                if (updateModuleMvpStatus($slug, $status)) {
                    $message = "Module '{$slug}' updated to '{$status}'";
                } else {
                    $message = "Error updating module";
                    $messageType = 'danger';
                }
            }
            break;
            
        case 'make_root':
            $userId = (int)($_POST['user_id'] ?? 0);
            $companyId = (int)($_POST['company_id'] ?? 1);
            if ($userId) {
                // Verificar si ya existe el registro en user_companies
                $check = db()->prepare("SELECT id FROM user_companies WHERE user_id = ? AND company_id = ?");
                $check->execute([$userId, $companyId]);
                if ($check->fetch()) {
                    // Update existing role
                    $stmt = db()->prepare("UPDATE user_companies SET role = 'root' WHERE user_id = ? AND company_id = ?");
                    $stmt->execute([$userId, $companyId]);
                } else {
                    // Insertar nuevo registro con rol root
                    $stmt = db()->prepare("INSERT INTO user_companies (user_id, company_id, role, status) VALUES (?, ?, 'root', 'active')");
                    $stmt->execute([$userId, $companyId]);
                }
                $message = "User promoted to Root";
            }
            break;
            
        case 'remove_root':
            $userId = (int)($_POST['user_id'] ?? 0);
            if ($userId && $userId !== $rootUser['id']) {
                $stmt = db()->prepare("UPDATE user_companies SET role = 'admin' WHERE user_id = ? AND role = 'root'");
                $stmt->execute([$userId]);
                $message = "Root role removed from user";
            } else {
                $message = "You cannot remove your own role";
                $messageType = 'warning';
            }
            break;
    }
    
// Flash redirect
    if ($message) {
        $_SESSION['root_flash'] = ['message' => $message, 'type' => $messageType];
    }
    header('Location: users.php');
    exit;
}

// Flash message
if (isset($_SESSION['root_flash'])) {
    $message = $_SESSION['root_flash']['message'];
    $messageType = $_SESSION['root_flash']['type'];
    unset($_SESSION['root_flash']);
}

// Load data
$mvpUsers = listMvpBypassUsers();
$modules = db()->query("SELECT slug, name, mvp_status, is_active FROM modules WHERE is_active = 1 ORDER BY sort_order, name")->fetchAll(PDO::FETCH_ASSOC);
$rootUsers = db()->query("
    SELECT DISTINCT u.id, u.full_name AS name, u.email, uc.role, u.created_at 
    FROM users u 
    INNER JOIN user_companies uc ON uc.user_id = u.id 
    WHERE uc.role = 'root' 
    ORDER BY u.id
")->fetchAll(PDO::FETCH_ASSOC);
$allUsers = db()->query("SELECT id, full_name AS name, email FROM users ORDER BY full_name LIMIT 100")->fetchAll(PDO::FETCH_ASSOC);

$pageTitle = 'MVP Users';
include __DIR__ . '/_root_nav.php';
?>

    <div class="page-header d-flex justify-content-between align-items-center flex-wrap gap-3">
        <div>
            <h1 class="page-title">MVP Users and Access Control</h1>
            <p class="page-subtitle">Manage who can see all modules and the status of each module</p>
        </div>
    </div>

    <?php if ($message): ?>
    <div class="alert alert-<?= $messageType; ?> alert-dismissible fade show" role="alert">
        <?= htmlspecialchars($message); ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
    <?php endif; ?>

    <div class="row g-4">
        <!-- MVP Users -->
        <div class="col-lg-6">
            <div class="root-card h-100">
                <div class="root-card-header d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-shield-check me-2"></i>MVP Users (Testers)</span>
                    <span class="badge badge-root badge-primary"><?= count($mvpUsers); ?></span>
                </div>
                <div class="root-card-body">
                    <!-- Add form -->
                    <form method="post" class="mb-4">
                        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                        <input type="hidden" name="action" value="add_mvp_user">
                        <div class="row g-2">
                            <div class="col-md-5">
                                <input type="email" name="email" class="form-control root-input" placeholder="email@example.com" required>
                            </div>
                            <div class="col-md-4">
                                <input type="text" name="reason" class="form-control root-input" placeholder="Reason (optional)" value="Tester MVP">
                            </div>
                            <div class="col-md-3">
                                <button type="submit" class="btn btn-root-primary w-100">
                                    <i class="bi bi-plus"></i> Add
                                </button>
                            </div>
                        </div>
                    </form>
                    
                    <!-- Lista -->
                    <?php if (empty($mvpUsers)): ?>
                        <p class="text-muted text-center py-3">No MVP users registered</p>
                    <?php else: ?>
                        <div class="table-responsive">
                            <table class="root-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Reason</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($mvpUsers as $u): ?>
                                        <tr>
                                            <td>
                                                <strong><?= htmlspecialchars($u['user_name'] ?? $u['user_email']); ?></strong>
                                                <br><small class="text-muted"><?= htmlspecialchars($u['user_email']); ?></small>
                                            </td>
                                            <td><?= htmlspecialchars($u['reason']); ?></td>
                                            <td>
                                                <form method="post" style="display: inline;">
                                                    <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                                                    <input type="hidden" name="action" value="remove_mvp_user">
                                                    <input type="hidden" name="user_id" value="<?= $u['user_id']; ?>">
                                                    <button type="submit" class="btn btn-sm btn-outline-danger" onclick="return confirm('Remove?')">
                                                        <i class="bi bi-trash"></i>
                                                    </button>
                                                </form>
                                            </td>
                                        </tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        
        <!-- Root Users -->
        <div class="col-lg-6">
            <div class="root-card h-100">
                <div class="root-card-header d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-person-badge me-2"></i>Root Users (Administrators)</span>
                    <span class="badge badge-root badge-danger"><?= count($rootUsers); ?></span>
                </div>
                <div class="root-card-body">
                    <!-- Formulario promover -->
                    <form method="post" class="mb-4">
                        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                        <input type="hidden" name="action" value="make_root">
                        <div class="row g-2">
                            <div class="col-md-8">
                                <select name="user_id" class="form-select root-input" required>
                                    <option value="">Select user...</option>
                                    <?php foreach ($allUsers as $u): ?>
                                        <option value="<?= $u['id']; ?>"><?= htmlspecialchars($u['name'] ?? $u['email']); ?> (<?= htmlspecialchars($u['email']); ?>)</option>
                                    <?php endforeach; ?>
                                </select>
                            </div>
                            <div class="col-md-4">
                                <button type="submit" class="btn btn-root-primary w-100" onclick="return confirm('Make this user Root?')">
                                    <i class="bi bi-shield-plus"></i> Make Root
                                </button>
                            </div>
                        </div>
                    </form>
                    
                    <!-- Lista -->
                    <div class="table-responsive">
                        <table class="root-table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Since</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($rootUsers as $u): ?>
                                    <tr>
                                        <td>
                                            <strong><?= htmlspecialchars($u['name'] ?? '-'); ?></strong>
                                            <br><small class="text-muted"><?= htmlspecialchars($u['email']); ?></small>
                                        </td>
                                        <td><?= date('d/m/Y', strtotime($u['created_at'])); ?></td>
                                        <td>
                                            <?php if ($u['id'] !== $rootUser['id']): ?>
                                                <form method="post" style="display: inline;">
                                                    <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                                                    <input type="hidden" name="action" value="remove_root">
                                                    <input type="hidden" name="user_id" value="<?= $u['id']; ?>">
                                                    <button type="submit" class="btn btn-sm btn-outline-warning" onclick="return confirm('Remove Root role?')">
                                                        <i class="bi bi-shield-minus"></i>
                                                    </button>
                                                </form>
                                            <?php else: ?>
                                                <span class="badge badge-root badge-success">You</span>
                                            <?php endif; ?>
                                        </td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Module MVP Status -->
    <div class="row g-4 mt-2">
        <div class="col-12">
            <div class="root-card">
                <div class="root-card-header">
                    <i class="bi bi-grid-3x3-gap me-2"></i>Module MVP Status
                    <small class="text-muted ms-2">(Released = visible to all, Construction = MVP/Root only, Hidden = hidden)</small>
                </div>
                <div class="root-card-body p-0">
                    <table class="root-table">
                        <thead>
                            <tr>
                                <th>Module</th>
                                <th>Slug</th>
                                <th>Current Status</th>
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
                                        $status = $m['mvp_status'] ?? 'construction';
                                        $badgeClass = match($status) {
                                            'released' => 'badge-success',
                                            'hidden' => 'badge-danger',
                                            default => 'badge-warning'
                                        };
                                        $statusLabel = match($status) {
                                            'released' => 'Released',
                                            'hidden' => 'Hidden',
                                            default => 'Under Construction'
                                        };
                                        ?>
                                        <span class="badge badge-root <?= $badgeClass; ?>"><?= $statusLabel; ?></span>
                                    </td>
                                    <td>
                                        <div class="btn-group btn-group-sm">
                                            <?php if ($status !== 'released'): ?>
                                                <form method="post" style="display: inline;">
                                                    <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                                                    <input type="hidden" name="action" value="update_module_status">
                                                    <input type="hidden" name="slug" value="<?= htmlspecialchars($m['slug']); ?>">
                                                    <input type="hidden" name="status" value="released">
                                                    <button type="submit" class="btn btn-sm btn-outline-success">Release</button>
                                                </form>
                                            <?php endif; ?>
                                            <?php if ($status !== 'construction'): ?>
                                                <form method="post" style="display: inline;">
                                                    <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                                                    <input type="hidden" name="action" value="update_module_status">
                                                    <input type="hidden" name="slug" value="<?= htmlspecialchars($m['slug']); ?>">
                                                    <input type="hidden" name="status" value="construction">
                                                    <button type="submit" class="btn btn-sm btn-outline-warning">Construction</button>
                                                </form>
                                            <?php endif; ?>
                                            <?php if ($status !== 'hidden'): ?>
                                                <form method="post" style="display: inline;">
                                                    <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                                                    <input type="hidden" name="action" value="update_module_status">
                                                    <input type="hidden" name="slug" value="<?= htmlspecialchars($m['slug']); ?>">
                                                    <input type="hidden" name="status" value="hidden">
                                                    <button type="submit" class="btn btn-sm btn-outline-secondary">Hide</button>
                                                </form>
                                            <?php endif; ?>
                                        </div>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
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
