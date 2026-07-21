<?php
// Legacy payroll compatibility only. Stripe credentials must come from the
// deployment secret store and must never be written to the repository.
$mode = strtolower(trim((string) (getenv('PAYROLL_STRIPE_MODE') ?: 'test')));
if ($mode !== 'test' && $mode !== 'live') {
    $mode = 'test';
}

return [
    'secret_key_test' => (string) (getenv('PAYROLL_STRIPE_SECRET_KEY_TEST') ?: ''),
    'secret_key_live' => (string) (getenv('PAYROLL_STRIPE_SECRET_KEY_LIVE') ?: ''),
    'publishable_key_test' => (string) (getenv('PAYROLL_STRIPE_PUBLISHABLE_KEY_TEST') ?: ''),
    'publishable_key_live' => (string) (getenv('PAYROLL_STRIPE_PUBLISHABLE_KEY_LIVE') ?: ''),
    'mode' => $mode,
];
