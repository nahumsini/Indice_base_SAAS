<?php
// MercadoPago Webhook handler
require __DIR__ . '/../bootstrap.php';
$config = require __DIR__ . '/mercadopago_config.php';

// Receive payment notification
$input = file_get_contents('php://input');
$data = json_decode($input, true);
// You must validate the payment here and update the record
// Basic example:
if (isset($data['type']) && $data['type'] === 'payment') {
    // Find the related intentId and activate company/user
    // provisionCompanyFromIntent($intentId);
    http_response_code(200);
    echo 'OK';
    exit;
}
http_response_code(400);
echo 'Invalid webhook';
