<?php
require __DIR__.'/../bootstrap.php';
require __DIR__.'/../core/auth.php';
require __DIR__.'/../core/root.php';
require __DIR__.'/../core/plan.php';
if (!defined('APP_BOOTSTRAPPED')) { http_response_code(403); exit; }
$user = requireRoot();
$company = rootSelectedCompany();
if (!$company) { http_response_code(404); exit('No company'); }
if (empty($_SESSION['csrf_root_subscription'])) { $_SESSION['csrf_root_subscription']=bin2hex(random_bytes(16)); }
$csrf = $_SESSION['csrf_root_subscription'];

$errors = [];$message=null;
if ($_SERVER['REQUEST_METHOD']==='POST') {
    if (!hash_equals($csrf, $_POST['csrf'] ?? '')) { http_response_code(400); exit('Bad CSRF'); }
    if (isset($_POST['change_plan'])) {
        $planId = (int)($_POST['plan_id'] ?? 0);
        if ($planId<=0) { $errors[]='Invalid plan'; }
        if (!$errors) {
            try {
                $trial = !empty($_POST['start_trial']);
                $new = changeCompanySubscription($company['id'], $planId, null, $trial?'trial':'active');
                $message = 'Subscription updated to plan '.$new['plan_name'];
            } catch (Throwable $e) { $errors[]=$e->getMessage(); }
        }
    }
}

$sub = currentSubscription($company['id']);
$history = subscriptionHistory($company['id']);
$plans = db()->query("SELECT id,name,slug,price,currency,user_limit,trial_days FROM plans ORDER BY price ASC, id ASC")->fetchAll(PDO::FETCH_ASSOC);
$stats = seatStats($company['id']);
?>
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Subscription — Root Panel</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/font/bootstrap-icons.css" rel="stylesheet">
<link href="/assets/css/app.css" rel="stylesheet">
</head>
<body>
<?php $active='plans'; include __DIR__.'/_root_nav.php'; ?>
<div class="container mt-4">
    <h1 class="h3">Company Subscription</h1>
    <p class="text-muted mb-3">Company: <strong><?= htmlspecialchars($company['name']); ?></strong> (ID <?= (int)$company['id']; ?>)</p>
    <?php if($message): ?><div class="alert alert-success"><?= htmlspecialchars($message); ?></div><?php endif; ?>
    <?php if($errors): ?><div class="alert alert-danger"><ul class="mb-0"><?php foreach($errors as $e){ echo '<li>'.htmlspecialchars($e).'</li>'; } ?></ul></div><?php endif; ?>

    <div class="row g-4">
        <div class="col-lg-7">
            <div class="card mb-4">
                <div class="card-header">Current Status</div>
                <div class="card-body">
                    <?php if($sub): ?>
                        <div><strong>Plan:</strong> <?= htmlspecialchars($sub['plan_name']); ?> (<?= htmlspecialchars($sub['plan_slug']); ?>)</div>
                        <div><strong>Status:</strong> <?= htmlspecialchars($sub['status']); ?><?= $sub['trial_end']? ' (trial until '.$sub['trial_end'].')':''; ?></div>
                        <div><strong>Inicio:</strong> <?= htmlspecialchars($sub['period_start']); ?><?= $sub['period_end']? ' · <strong>Fin:</strong> '.htmlspecialchars($sub['period_end']):''; ?></div>
                    <?php else: ?>
                        <div class="text-danger">No active subscription.</div>
                    <?php endif; ?>
                </div>
            </div>
            <div class="card mb-4">
                <div class="card-header">History</div>
                <div class="card-body p-0">
                    <div class="table-responsive">
                    <table class="table table-sm mb-0">
                        <thead class="table-light"><tr><th>ID</th><th>Plan</th><th>Status</th><th>Inicio</th><th>Fin</th></tr></thead>
                        <tbody>
                        <?php foreach($history as $h): ?>
                            <tr>
                                <td><?= (int)$h['id']; ?></td>
                                <td><?= htmlspecialchars($h['plan_name']); ?></td>
                                <td><?= htmlspecialchars($h['status']); ?></td>
                                <td><?= htmlspecialchars($h['period_start']); ?></td>
                                <td><?= htmlspecialchars($h['period_end'] ?? '—'); ?></td>
                            </tr>
                        <?php endforeach; ?>
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-lg-5">
            <div class="card mb-4">
                <div class="card-header">Change Plan</div>
                <div class="card-body">
                    <form method="post" class="vstack gap-2">
                        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                        <input type="hidden" name="change_plan" value="1">
                        <label class="form-label">Target plan</label>
                        <select name="plan_id" class="form-select" required>
                            <option value="">Select a plan</option>
                            <?php foreach($plans as $p): ?>
                                <option value="<?= (int)$p['id']; ?>" <?php if($sub && $sub['plan_id']==$p['id']) echo 'disabled'; ?>><?= htmlspecialchars($p['name']); ?> — <?= number_format((float)$p['price'],2).' '.htmlspecialchars($p['currency']); ?></option>
                            <?php endforeach; ?>
                        </select>
                        <div class="form-check mt-2">
                            <input class="form-check-input" type="checkbox" name="start_trial" id="start_trial">
                            <label for="start_trial" class="form-check-label">Force Trial (if applicable)</label>
                        </div>
                        <button class="btn btn-primary">Apply change</button>
                    </form>
                </div>
            </div>
            <div class="card">
                <div class="card-header">Seats / Users</div>
                <div class="card-body">
                    <ul class="list-unstyled small mb-0">
                        <li><strong>Plan limit:</strong> <?= $stats['unlimited']? '∞' : (int)$stats['plan_limit']; ?></li>
                        <li><strong>Addon seats:</strong> <?= (int)$stats['addon_seats']; ?></li>
                        <li><strong>Effective limit:</strong> <?= $stats['unlimited']? '∞' : (int)$stats['effective_limit']; ?></li>
                        <li><strong>Used:</strong> <?= (int)$stats['used']; ?></li>
                        <li><strong>Available:</strong> <?= $stats['unlimited']? '∞' : (int)$stats['available']; ?></li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
