<?php
/**
 * Root Panel - Navigation
 * Only accessible for users with role='root' in users
 */
if (!defined('APP_BOOTSTRAPPED')) { http_response_code(403); exit; }
$currentPage = basename($_SERVER['PHP_SELF'], '.php');
$rootUser = auth();
$userName = htmlspecialchars($rootUser['name'] ?? $rootUser['email'] ?? 'Admin');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= $pageTitle ?? 'Root Panel'; ?> — Indice SaaS</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet">
    <link href="/assets/css/indice-theme.css?v=1" rel="stylesheet">
    <style>
        :root {
            --root-primary: #1f4d9f;
            --root-primary-dark: #173b79;
            --root-accent: #ffd650;
            --root-success: #10b981;
            --root-warning: #f59e0b;
            --root-danger: #ef4444;
            --root-surface: #f8fafc;
            --root-card: #ffffff;
            --root-border: #e2e8f0;
            --root-text: #0f172a;
            --root-muted: #64748b;
        }
        
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: var(--root-surface);
            min-height: 100vh;
        }
        
        /* Sidebar */
        .root-sidebar {
            width: 260px;
            background: linear-gradient(180deg, var(--root-primary) 0%, var(--root-primary-dark) 100%);
            min-height: 100vh;
            position: fixed;
            left: 0;
            top: 0;
            padding: 0;
            z-index: 1000;
        }
        
        .root-sidebar-header {
            padding: 1.5rem;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        
        .root-sidebar-brand {
            color: #fff;
            font-size: 1.25rem;
            font-weight: 700;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .root-sidebar-brand:hover { color: var(--root-accent); }
        
        .root-sidebar-nav {
            padding: 1rem 0;
        }
        
        .root-nav-item {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.875rem 1.5rem;
            color: rgba(255,255,255,0.8);
            text-decoration: none;
            font-size: 0.95rem;
            transition: all 0.2s ease;
            border-left: 3px solid transparent;
        }
        
        .root-nav-item:hover {
            background: rgba(255,255,255,0.1);
            color: #fff;
        }
        
        .root-nav-item.active {
            background: rgba(255,255,255,0.15);
            color: #fff;
            border-left-color: var(--root-accent);
        }
        
        .root-nav-item i { font-size: 1.1rem; width: 24px; text-align: center; }
        
        .root-nav-section {
            padding: 0.5rem 1.5rem;
            font-size: 0.7rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: rgba(255,255,255,0.4);
            margin-top: 1rem;
        }
        
        .root-sidebar-footer {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 1rem 1.5rem;
            border-top: 1px solid rgba(255,255,255,0.1);
        }
        
        .root-user-info {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: rgba(255,255,255,0.9);
            font-size: 0.9rem;
        }
        
        .root-user-avatar {
            width: 36px;
            height: 36px;
            background: var(--root-accent);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            color: var(--root-primary-dark);
        }
        
        /* Main content */
        .root-main {
            margin-left: 260px;
            padding: 2rem;
            min-height: 100vh;
        }
        
        /* Cards */
        .root-card {
            background: var(--root-card);
            border-radius: 16px;
            border: 1px solid var(--root-border);
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .root-card-header {
            padding: 1.25rem 1.5rem;
            border-bottom: 1px solid var(--root-border);
            font-weight: 600;
            color: var(--root-text);
        }
        
        .root-card-body { padding: 1.5rem; }
        
        /* Stats cards */
        .stat-card {
            background: var(--root-card);
            border-radius: 16px;
            padding: 1.5rem;
            border: 1px solid var(--root-border);
            transition: all 0.2s ease;
        }
        
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.08);
        }
        
        .stat-card-icon {
            width: 48px;
            height: 48px;
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
        }
        
        .stat-card-icon.primary { background: rgba(31,77,159,0.1); color: var(--root-primary); }
        .stat-card-icon.success { background: rgba(16,185,129,0.1); color: var(--root-success); }
        .stat-card-icon.warning { background: rgba(245,158,11,0.1); color: var(--root-warning); }
        .stat-card-icon.danger { background: rgba(239,68,68,0.1); color: var(--root-danger); }
        
        .stat-card-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--root-text);
            line-height: 1.2;
        }
        
        .stat-card-label {
            font-size: 0.875rem;
            color: var(--root-muted);
        }
        
        /* Buttons */
        .btn-root-primary {
            background: var(--root-primary);
            color: #fff;
            border: none;
            padding: 0.625rem 1.25rem;
            border-radius: 8px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        .btn-root-primary:hover {
            background: var(--root-primary-dark);
            color: #fff;
        }
        
        .btn-root-outline {
            background: transparent;
            color: var(--root-primary);
            border: 1px solid var(--root-primary);
            padding: 0.625rem 1.25rem;
            border-radius: 8px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        .btn-root-outline:hover {
            background: var(--root-primary);
            color: #fff;
        }
        
        /* Table */
        .root-table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .root-table th {
            background: var(--root-surface);
            padding: 0.875rem 1rem;
            text-align: left;
            font-weight: 600;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.03em;
            color: var(--root-muted);
            border-bottom: 1px solid var(--root-border);
        }
        
        .root-table td {
            padding: 1rem;
            border-bottom: 1px solid var(--root-border);
            color: var(--root-text);
        }
        
        .root-table tr:hover td { background: var(--root-surface); }
        
        /* Badges */
        .badge-root { padding: 0.35em 0.75em; border-radius: 6px; font-weight: 500; font-size: 0.75rem; }
        .badge-success { background: rgba(16,185,129,0.1); color: #059669; }
        .badge-warning { background: rgba(245,158,11,0.1); color: #d97706; }
        .badge-danger { background: rgba(239,68,68,0.1); color: #dc2626; }
        .badge-primary { background: rgba(31,77,159,0.1); color: var(--root-primary); }
        
        /* Form inputs */
        .root-input {
            border: 1px solid var(--root-border);
            border-radius: 8px;
            padding: 0.625rem 1rem;
            font-size: 0.95rem;
            transition: all 0.2s ease;
        }
        
        .root-input:focus {
            outline: none;
            border-color: var(--root-primary);
            box-shadow: 0 0 0 3px rgba(31,77,159,0.1);
        }
        
        /* Page header */
        .page-header {
            margin-bottom: 2rem;
        }
        
        .page-title {
            font-size: 1.75rem;
            font-weight: 700;
            color: var(--root-text);
            margin: 0;
        }
        
        .page-subtitle {
            color: var(--root-muted);
            margin-top: 0.25rem;
        }
        
        /* Mobile responsive */
        @media (max-width: 991px) {
            .root-sidebar {
                transform: translateX(-100%);
                transition: transform 0.3s ease;
            }
            .root-sidebar.show { transform: translateX(0); }
            .root-main { margin-left: 0; }
            .mobile-toggle { display: block !important; }
        }
        
        .mobile-toggle { display: none; }
    </style>
</head>
<body>

<!-- Sidebar -->
<aside class="root-sidebar">
    <div class="root-sidebar-header">
        <a href="/panel_root/" class="root-sidebar-brand">
            <i class="bi bi-shield-lock"></i>
            Panel Root
        </a>
    </div>
    
    <nav class="root-sidebar-nav">
        <div class="root-nav-section">Main</div>
        <a href="/panel_root/index.php" class="root-nav-item <?= $currentPage === 'index' ? 'active' : ''; ?>">
            <i class="bi bi-speedometer2"></i> Dashboard
        </a>
        <a href="/index.php" class="root-nav-item">
            <i class="bi bi-house"></i> Go to App
        </a>
        
        <div class="root-nav-section">Management</div>
        <a href="/panel_root/users.php" class="root-nav-item <?= $currentPage === 'users' ? 'active' : ''; ?>">
            <i class="bi bi-people"></i> MVP Users
        </a>
        <a href="/panel_root/plans.php" class="root-nav-item <?= $currentPage === 'plans' ? 'active' : ''; ?>">
            <i class="bi bi-collection"></i> Plans
        </a>
        <a href="/panel_root/modules.php" class="root-nav-item <?= $currentPage === 'modules' ? 'active' : ''; ?>">
            <i class="bi bi-grid-3x3-gap"></i> Modules
        </a>
        
        <div class="root-nav-section">Configuration</div>
        <a href="/panel_root/payments.php" class="root-nav-item <?= $currentPage === 'payments' ? 'active' : ''; ?>">
            <i class="bi bi-credit-card"></i> Payment Gateways
        </a>
        
        <div class="root-nav-section">System</div>
        <a href="/panel_root/stats.php" class="root-nav-item <?= $currentPage === 'stats' ? 'active' : ''; ?>">
            <i class="bi bi-graph-up"></i> Statistics
        </a>
    </nav>
    
    <div class="root-sidebar-footer">
        <div class="root-user-info">
            <div class="root-user-avatar"><?= strtoupper(substr($userName, 0, 1)); ?></div>
            <div>
                <div style="font-weight: 600;"><?= $userName; ?></div>
                <small style="opacity: 0.7;">Root Admin</small>
            </div>
        </div>
        <a href="/logout.php" class="root-nav-item mt-2" style="padding: 0.5rem 0; margin: 0;">
            <i class="bi bi-box-arrow-right"></i> Log out
        </a>
    </div>
</aside>

<!-- Mobile toggle -->
<button class="mobile-toggle btn btn-primary position-fixed" style="top: 1rem; left: 1rem; z-index: 1001;" onclick="document.querySelector('.root-sidebar').classList.toggle('show')">
    <i class="bi bi-list"></i>
</button>

<!-- Main Content -->
<main class="root-main">