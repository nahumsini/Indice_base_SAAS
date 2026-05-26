<?php
/**
 * Root Panel - Dashboard
 * Main view with SaaS KPIs
 */
require __DIR__ . '/../bootstrap.php';
if (!defined('APP_BOOTSTRAPPED')) { http_response_code(403); exit; }
require __DIR__ . '/../core/auth.php';
require __DIR__ . '/../core/root.php';

requireLogin();
$rootUser = requireRoot();

// Fetch statistics
function getRootStats() {
    $db = db();
    $stats = [];
    
    // Total companies
    $stats['companies'] = (int)$db->query("SELECT COUNT(*) FROM companies")->fetchColumn();
    
    // Total users
    $stats['users'] = (int)$db->query("SELECT COUNT(*) FROM users")->fetchColumn();
    
    // Active users (logged in within the last 30 days)
    try {
        $stats['active_users'] = (int)$db->query("SELECT COUNT(*) FROM users WHERE last_login_at > DATE_SUB(NOW(), INTERVAL 30 DAY)")->fetchColumn();
    } catch(Exception $e) {
        $stats['active_users'] = 0;
    }
    
    // Total active modules
    $stats['modules'] = (int)$db->query("SELECT COUNT(*) FROM modules WHERE is_active = 1")->fetchColumn();
    
    // Released MVP modules
    try {
        $stats['modules_released'] = (int)$db->query("SELECT COUNT(*) FROM modules WHERE mvp_status = 'released'")->fetchColumn();
    } catch(Exception $e) {
        $stats['modules_released'] = 0;
    }
    
    // MVP bypass users
    try {
        $stats['mvp_users'] = (int)$db->query("SELECT COUNT(*) FROM mvp_bypass_users")->fetchColumn();
    } catch(Exception $e) {
        $stats['mvp_users'] = 0;
    }
    
    // Plans
    $stats['plans'] = (int)$db->query("SELECT COUNT(*) FROM plans WHERE is_active = 1")->fetchColumn();
    
    // Companies by plan
    $stats['companies_by_plan'] = $db->query("
        SELECT p.name as plan_name, COUNT(c.id) as total 
        FROM plans p 
        LEFT JOIN companies c ON c.plan_id = p.id 
        WHERE p.is_active = 1 
        GROUP BY p.id, p.name 
        ORDER BY total DESC
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // Latest registrations
    $stats['recent_companies'] = $db->query("
        SELECT c.id, c.name, c.created_at, p.name as plan_name 
        FROM companies c 
        LEFT JOIN plans p ON c.plan_id = p.id 
        ORDER BY c.created_at DESC 
        LIMIT 5
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    // Latest users
    $stats['recent_users'] = $db->query("
        SELECT id, full_name AS name, email, created_at 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
    ")->fetchAll(PDO::FETCH_ASSOC);
    
    return $stats;
}

$stats = getRootStats();
$pageTitle = 'Dashboard';

// Include nav (starts HTML)
include __DIR__ . '/_root_nav.php';
?>

    <div class="page-header">
        <h1 class="page-title">SaaS Dashboard</h1>
        <p class="page-subtitle">General status overview of Indice ERP</p>
    </div>

    <!-- Stats Grid -->
    <div class="row g-4 mb-4">
        <div class="col-md-6 col-lg-3">
            <div class="stat-card">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <div class="stat-card-value"><?= number_format($stats['companies']); ?></div>
                        <div class="stat-card-label">Registered Companies</div>
                    </div>
                    <div class="stat-card-icon primary">
                        <i class="bi bi-building"></i>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="col-md-6 col-lg-3">
            <div class="stat-card">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <div class="stat-card-value"><?= number_format($stats['users']); ?></div>
                        <div class="stat-card-label">Total Users</div>
                        <small class="text-success"><?= $stats['active_users']; ?> active (30d)</small>
                    </div>
                    <div class="stat-card-icon success">
                        <i class="bi bi-people"></i>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="col-md-6 col-lg-3">
            <div class="stat-card">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <div class="stat-card-value"><?= $stats['modules_released']; ?>/<?= $stats['modules']; ?></div>
                        <div class="stat-card-label">Released Modules</div>
                    </div>
                    <div class="stat-card-icon warning">
                        <i class="bi bi-grid-3x3-gap"></i>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="col-md-6 col-lg-3">
            <div class="stat-card">
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <div class="stat-card-value"><?= $stats['mvp_users']; ?></div>
                        <div class="stat-card-label">MVP/Tester Users</div>
                    </div>
                    <div class="stat-card-icon danger">
                        <i class="bi bi-shield-check"></i>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Quick Actions -->
    <div class="row g-4 mb-4">
        <div class="col-12">
            <div class="root-card">
                <div class="root-card-header d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-lightning me-2"></i>Quick Actions</span>
                </div>
                <div class="root-card-body">
                    <div class="d-flex flex-wrap gap-2">
                        <a href="/panel_root/users.php" class="btn btn-root-primary">
                            <i class="bi bi-person-plus me-2"></i>Add MVP User
                        </a>
                        <a href="/panel_root/plans.php" class="btn btn-root-outline">
                            <i class="bi bi-plus-circle me-2"></i>Manage Plans
                        </a>
                        <a href="/panel_root/modules.php" class="btn btn-root-outline">
                            <i class="bi bi-grid-3x3-gap me-2"></i>Manage Modules
                        </a>
                        <a href="/panel_root/payments.php" class="btn btn-root-outline">
                            <i class="bi bi-credit-card me-2"></i>Configure Payments
                        </a>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Two columns -->
    <div class="row g-4">
        <!-- Companies by plan -->
        <div class="col-lg-6">
            <div class="root-card h-100">
                <div class="root-card-header">
                    <i class="bi bi-pie-chart me-2"></i>Companies by Plan
                </div>
                <div class="root-card-body">
                    <?php if (empty($stats['companies_by_plan'])): ?>
                        <p class="text-muted">No data available</p>
                    <?php else: ?>
                        <?php foreach ($stats['companies_by_plan'] as $plan): ?>
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <span><?= htmlspecialchars($plan['plan_name'] ?? 'No plan'); ?></span>
                                <span class="badge badge-root badge-primary"><?= (int)$plan['total']; ?> companies</span>
                            </div>
                            <div class="progress mb-3" style="height: 8px;">
                                <?php $pct = $stats['companies'] > 0 ? ($plan['total'] / $stats['companies']) * 100 : 0; ?>
                                <div class="progress-bar" style="width: <?= $pct; ?>%; background: var(--root-primary);"></div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>
        
        <!-- Latest companies -->
        <div class="col-lg-6">
            <div class="root-card h-100">
                <div class="root-card-header d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-clock-history me-2"></i>Latest Registered Companies</span>
                </div>
                <div class="root-card-body p-0">
                    <table class="root-table">
                        <thead>
                            <tr>
                                <th>Company</th>
                                <th>Plan</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($stats['recent_companies'])): ?>
                                <tr><td colspan="3" class="text-center py-3 text-muted">No records</td></tr>
                            <?php else: ?>
                                <?php foreach ($stats['recent_companies'] as $c): ?>
                                    <tr>
                                        <td><?= htmlspecialchars($c['name']); ?></td>
                                        <td><span class="badge badge-root badge-primary"><?= htmlspecialchars($c['plan_name'] ?? 'N/A'); ?></span></td>
                                        <td><?= date('d/m/Y', strtotime($c['created_at'])); ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Recent Users -->
    <div class="row g-4 mt-2">
        <div class="col-12">
            <div class="root-card">
                <div class="root-card-header">
                    <i class="bi bi-person-lines-fill me-2"></i>Latest Registered Users
                </div>
                <div class="root-card-body p-0">
                    <table class="root-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Registration Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php if (empty($stats['recent_users'])): ?>
                                <tr><td colspan="4" class="text-center py-3 text-muted">No records</td></tr>
                            <?php else: ?>
                                <?php foreach ($stats['recent_users'] as $u): ?>
                                    <tr>
                                        <td>#<?= $u['id']; ?></td>
                                        <td><?= htmlspecialchars($u['name'] ?? '-'); ?></td>
                                        <td><?= htmlspecialchars($u['email']); ?></td>
                                        <td><?= date('d/m/Y H:i', strtotime($u['created_at'])); ?></td>
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
