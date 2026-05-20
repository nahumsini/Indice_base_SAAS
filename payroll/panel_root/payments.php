<?php
/**
 * Root Panel - Payment Gateway Configuration
 * 
 * Allows configuration of Stripe and MercadoPago
 */
require __DIR__ . '/../bootstrap.php';
if (!defined('APP_BOOTSTRAPPED')) { http_response_code(403); exit; }
require __DIR__ . '/../core/auth.php';
require __DIR__ . '/../core/root.php';

requireLogin();
$rootUser = requireRoot();

// CSRF
if (empty($_SESSION['csrf_root_payments'])) {
    $_SESSION['csrf_root_payments'] = bin2hex(random_bytes(16));
}
$csrf = $_SESSION['csrf_root_payments'];

$message = '';
$messageType = 'success';

// Configuration file paths
$stripeConfigPath = __DIR__ . '/stripe_config.php';
$mpConfigPath = __DIR__ . '/mercadopago_config.php';

// Load current configurations
$stripeConfig = file_exists($stripeConfigPath) ? include($stripeConfigPath) : [];
$mpConfig = file_exists($mpConfigPath) ? include($mpConfigPath) : [];

// Procesar POST
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!hash_equals($csrf, $_POST['csrf'] ?? '')) {
        http_response_code(400); exit('Bad CSRF');
    }
    
    $gateway = $_POST['gateway'] ?? '';
    
    if ($gateway === 'stripe') {
        $newConfig = [
            'secret_key_test' => trim($_POST['stripe_secret_test'] ?? ''),
            'secret_key_live' => trim($_POST['stripe_secret_live'] ?? ''),
            'publishable_key_test' => trim($_POST['stripe_pk_test'] ?? ''),
            'publishable_key_live' => trim($_POST['stripe_pk_live'] ?? ''),
            'mode' => $_POST['stripe_mode'] ?? 'test'
        ];
        
        $code = "<?php\n// Stripe Configuration - Auto-generated\nreturn " . var_export($newConfig, true) . ";\n";
        file_put_contents($stripeConfigPath, $code);
        $stripeConfig = $newConfig;
        $message = "Stripe configuration saved";
        
    } elseif ($gateway === 'mercadopago') {
        $newConfig = [
            'access_token_test' => trim($_POST['mp_token_test'] ?? ''),
            'access_token_live' => trim($_POST['mp_token_live'] ?? ''),
            'public_key_test' => trim($_POST['mp_pk_test'] ?? ''),
            'public_key_live' => trim($_POST['mp_pk_live'] ?? ''),
            'mode' => $_POST['mp_mode'] ?? 'test'
        ];
        
        $code = "<?php\n// MercadoPago Configuration - Auto-generated\nreturn " . var_export($newConfig, true) . ";\n";
        file_put_contents($mpConfigPath, $code);
        $mpConfig = $newConfig;
        $message = "MercadoPago configuration saved";
    }
    
    $_SESSION['root_flash'] = ['message' => $message, 'type' => $messageType];
    header('Location: payments.php');
    exit;
}

// Flash
if (isset($_SESSION['root_flash'])) {
    $message = $_SESSION['root_flash']['message'];
    $messageType = $_SESSION['root_flash']['type'];
    unset($_SESSION['root_flash']);
}

$pageTitle = 'Payment Gateways';
include __DIR__ . '/_root_nav.php';
?>

    <div class="page-header">
        <h1 class="page-title">Payment Gateway Configuration</h1>
        <p class="page-subtitle">Configure credentials for Stripe and MercadoPago</p>
    </div>

    <?php if ($message): ?>
    <div class="alert alert-<?= $messageType; ?> alert-dismissible fade show" role="alert">
        <?= htmlspecialchars($message); ?>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
    <?php endif; ?>

    <div class="row g-4">
        <!-- Stripe -->
        <div class="col-lg-6">
            <div class="root-card h-100">
                <div class="root-card-header d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-credit-card me-2"></i>Stripe</span>
                    <?php if (!empty($stripeConfig['secret_key_test']) || !empty($stripeConfig['secret_key_live'])): ?>
                        <span class="badge badge-root badge-success">Configurado</span>
                    <?php else: ?>
                        <span class="badge badge-root badge-warning">No configurado</span>
                    <?php endif; ?>
                </div>
                <div class="root-card-body">
                    <form method="post">
                        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                        <input type="hidden" name="gateway" value="stripe">
                        
                        <div class="mb-3">
                            <label class="form-label">Mode</label>
                            <select name="stripe_mode" class="form-select root-input">
                                <option value="test" <?= ($stripeConfig['mode'] ?? 'test') === 'test' ? 'selected' : ''; ?>>Test</option>
                                <option value="live" <?= ($stripeConfig['mode'] ?? '') === 'live' ? 'selected' : ''; ?>>Live (Production)</option>
                            </select>
                        </div>
                        
                        <hr>
                        <h6 class="text-muted mb-3">Credenciales de Prueba</h6>
                        
                        <div class="mb-3">
                            <label class="form-label">Secret Key (Test)</label>
                            <input type="password" name="stripe_secret_test" class="form-control root-input" placeholder="sk_test_..."
                                   value="<?= htmlspecialchars($stripeConfig['secret_key_test'] ?? ''); ?>">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Publishable Key (Test)</label>
                            <input type="text" name="stripe_pk_test" class="form-control root-input" placeholder="pk_test_..."
                                   value="<?= htmlspecialchars($stripeConfig['publishable_key_test'] ?? ''); ?>">
                        </div>
                        
                        <hr>
                        <h6 class="text-muted mb-3">Production Credentials</h6>
                        
                        <div class="mb-3">
                            <label class="form-label">Secret Key (Live)</label>
                            <input type="password" name="stripe_secret_live" class="form-control root-input" placeholder="sk_live_..."
                                   value="<?= htmlspecialchars($stripeConfig['secret_key_live'] ?? ''); ?>">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Publishable Key (Live)</label>
                            <input type="text" name="stripe_pk_live" class="form-control root-input" placeholder="pk_live_..."
                                   value="<?= htmlspecialchars($stripeConfig['publishable_key_live'] ?? ''); ?>">
                        </div>
                        
                        <button type="submit" class="btn btn-root-primary w-100">
                            <i class="bi bi-save me-2"></i>Save Stripe
                        </button>
                    </form>
                </div>
            </div>
        </div>
        
        <!-- MercadoPago -->
        <div class="col-lg-6">
            <div class="root-card h-100">
                <div class="root-card-header d-flex justify-content-between align-items-center">
                    <span><i class="bi bi-wallet2 me-2"></i>MercadoPago</span>
                    <?php if (!empty($mpConfig['access_token_test']) || !empty($mpConfig['access_token_live'])): ?>
                        <span class="badge badge-root badge-success">Configurado</span>
                    <?php else: ?>
                        <span class="badge badge-root badge-warning">No configurado</span>
                    <?php endif; ?>
                </div>
                <div class="root-card-body">
                    <form method="post">
                        <input type="hidden" name="csrf" value="<?= htmlspecialchars($csrf); ?>">
                        <input type="hidden" name="gateway" value="mercadopago">
                        
                        <div class="mb-3">
                            <label class="form-label">Mode</label>
                            <select name="mp_mode" class="form-select root-input">
                                <option value="test" <?= ($mpConfig['mode'] ?? 'test') === 'test' ? 'selected' : ''; ?>>Test</option>
                                <option value="live" <?= ($mpConfig['mode'] ?? '') === 'live' ? 'selected' : ''; ?>>Live (Production)</option>
                            </select>
                        </div>
                        
                        <hr>
                        <h6 class="text-muted mb-3">Test Credentials</h6>
                        
                        <div class="mb-3">
                            <label class="form-label">Access Token (Test)</label>
                            <input type="password" name="mp_token_test" class="form-control root-input" placeholder="TEST-..."
                                   value="<?= htmlspecialchars($mpConfig['access_token_test'] ?? ''); ?>">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Public Key (Test)</label>
                            <input type="text" name="mp_pk_test" class="form-control root-input" placeholder="TEST-..."
                                   value="<?= htmlspecialchars($mpConfig['public_key_test'] ?? ''); ?>">
                        </div>
                        
                        <hr>
                        <h6 class="text-muted mb-3">Production Credentials</h6>
                        
                        <div class="mb-3">
                            <label class="form-label">Access Token (Live)</label>
                            <input type="password" name="mp_token_live" class="form-control root-input" placeholder="APP_USR-..."
                                   value="<?= htmlspecialchars($mpConfig['access_token_live'] ?? ''); ?>">
                        </div>
                        
                        <div class="mb-3">
                            <label class="form-label">Public Key (Live)</label>
                            <input type="text" name="mp_pk_live" class="form-control root-input" placeholder="APP_USR-..."
                                   value="<?= htmlspecialchars($mpConfig['public_key_live'] ?? ''); ?>">
                        </div>
                        
                        <button type="submit" class="btn btn-root-primary w-100">
                            <i class="bi bi-save me-2"></i>Save MercadoPago
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>

    <!-- Information -->
    <div class="row g-4 mt-2">
        <div class="col-12">
            <div class="root-card">
                <div class="root-card-header">
                    <i class="bi bi-info-circle me-2"></i>Important Information
                </div>
                <div class="root-card-body">
                    <div class="row">
                        <div class="col-md-6">
                            <h6>Stripe</h6>
                            <ul class="small text-muted">
                                <li>Get your credentials at <a href="https://dashboard.stripe.com/apikeys" target="_blank">dashboard.stripe.com</a></li>
                                <li>Test keys start with <code>sk_test_</code> and <code>pk_test_</code></li>
                                <li>Production keys start with <code>sk_live_</code> and <code>pk_live_</code></li>
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <h6>MercadoPago</h6>
                            <ul class="small text-muted">
                                <li>Get your credentials at <a href="https://www.mercadopago.com.mx/developers/panel" target="_blank">developers.mercadopago.com</a></li>
                                <li>Test keys start with <code>TEST-</code></li>
                                <li>Production keys start with <code>APP_USR-</code></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</main>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>
