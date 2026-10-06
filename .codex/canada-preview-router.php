<?php
// Local read-only marketing preview. Keep this router outside the web root.
$path = rawurldecode(parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/');
if (!in_array($_SERVER['REQUEST_METHOD'] ?? '', ['GET', 'HEAD'], true)) {
    http_response_code(405);
    exit('Preview is read-only.');
}

$pages = ['/canada.php', '/planes.php', '/index.php', '/diagnostico.php', '/privacidad.php', '/terminos.php'];
if (in_array($path, $pages, true)) {
    return false;
}

if (preg_match('~^/(?:css|js|imgs|i18n)/[A-Za-z0-9_./-]+\.(?:css|js|json|png|jpg|jpeg|svg|webp|gif|ico)$~', $path)) {
    $root = realpath((string)($_SERVER['DOCUMENT_ROOT'] ?? ''));
    $target = realpath((string)$root . $path);
    if ($root && $target && str_starts_with($target, $root . DIRECTORY_SEPARATOR) && is_file($target)) {
        return false;
    }
}

http_response_code(404);
exit('Not available in this local preview.');
