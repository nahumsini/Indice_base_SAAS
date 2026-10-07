package com.indice.erp.ai.access;

import com.indice.erp.auth.AuthSessionUser;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiAccessTokenService {

    public static final String SALES_TODAY_READ = "sales.today:read";
    public static final String BUSINESS_SNAPSHOT_READ = "business.snapshot:read";
    public static final String HR_PERMISSIONS_SELF_READ = "hr.permissions.self:read";
    public static final String HR_PERMISSIONS_READ = "hr.permissions.read";
    public static final String HR_PERMISSIONS_REQUEST = "hr.permissions.request";
    public static final String HR_PERMISSIONS_REVIEW = "hr.permissions.review";
    public static final String HR_INCENTIVES_READ = "hr.incentives.read";
    public static final String HR_INCENTIVES_MANAGE = "hr.incentives.manage";
    public static final String HR_PEOPLE_READ = "hr.people:read";
    public static final String LEARNING_READ = "learning.read";
    public static final String LEARNING_MANAGE = "learning.manage";
    public static final String HR_PEOPLE_DETAILS_READ = "hr.people.details:read";
    public static final String HR_ASSETS_READ = "hr.assets.read";
    public static final String HR_RECORDS_READ = "hr.records.read";
    public static final String HR_ANNOUNCEMENTS_READ = "hr.announcements.read";
    public static final String HR_ANNOUNCEMENTS_RECEIPTS_READ = "hr.announcements.receipts:read";
    public static final String HR_PEOPLE_MANAGE = "hr.people.manage";
    public static final String HR_PEOPLE_TERMINATE = "hr.people.terminate";
    public static final String HR_RECORDS_MANAGE = "hr.records.manage";
    public static final String HR_ANNOUNCEMENTS_RESPOND = "hr.announcements.respond";
    public static final String HR_PEOPLE_IMPORT = "hr.people.import";
    public static final String HR_ASSETS_MANAGE = "hr.assets.manage";
    public static final String HR_ANNOUNCEMENTS_MANAGE = "hr.announcements.manage";
    public static final String HR_ATTENDANCE_READ = "hr.attendance:read";
    public static final String HR_KPIS_READ = "hr.kpis:read";
    public static final String HR_PAYROLL_READ = "hr.payroll.read";
    public static final String HR_PAYROLL_PREPARE = "hr.payroll.prepare";
    public static final String HR_PAYROLL_APPROVE = "hr.payroll.approve";
    public static final String HR_PAYROLL_PAY = "hr.payroll.pay";
    public static final String PROJECTS_READ = "projects.read";
    public static final String PROJECTS_MANAGE = "projects.manage";
    public static final String PROCESSES_READ = "processes.read";
    public static final String PROCESSES_MANAGE = "processes.manage";
    public static final String PROCESSES_RUN = "processes.run";
    public static final String HR_CONTROL_READ = "hr.control.read";
    public static final String HR_CONTROL_MANAGE = "hr.control.manage";
    public static final String HR_ATTENDANCE_CORRECT = "hr.attendance.correct";
    public static final String TASKS_READ = "tasks.read";
    public static final String TASKS_KPIS_READ = "tasks.kpis:read";
    public static final String SALES_READ = "sales.read";
    public static final String SALES_MANAGE = "sales.manage";
    public static final String SALES_COLLECTIONS_CONFIRM = "sales.collections.confirm";
    public static final String SALES_CANCEL = "sales.cancel";
    public static final String SALES_CONTRACTS_MANAGE = "sales.contracts.manage";
    public static final String SALES_FOLLOWUPS_MANAGE = "sales.followups.manage";
    public static final String SALES_COMMISSIONS_MANAGE = "sales.commissions.manage";
    public static final String POS_TERMINAL_MANAGE = "pos.terminal.manage";
    public static final String POS_SETTLEMENTS_MANAGE = "pos.settlements.manage";
    public static final String POS_ORDERS_MANAGE = "pos.orders.manage";
    public static final String SALES_COMMISSIONS_CUT = "sales.commissions.cut";
    public static final String SALES_COMMISSIONS_SCHEDULE = "sales.commissions.schedule";
    public static final String INVENTORY_PROVIDERS_MANAGE = "inventory.providers.manage";
    public static final String INVENTORY_DISCOUNTS_MANAGE = "inventory.discounts.manage";
    public static final String INVENTORY_PROCUREMENT_MANAGE = "inventory.procurement.manage";
    public static final String INVENTORY_PROCUREMENT_APPROVE = "inventory.procurement.approve";
    public static final String INVENTORY_PROCUREMENT_RECEIVE = "inventory.procurement.receive";
    public static final String INVENTORY_INVOICES_MANAGE = "inventory.invoices.manage";
    public static final String POS_READ = "pos.read";
    public static final String POS_REGISTERS_MANAGE = "pos.registers.manage";
    public static final String POS_SHIFTS_MANAGE = "pos.shifts.manage";
    public static final String POS_CASH_MANAGE = "pos.cash.manage";
    public static final String POS_CHECKOUT = "pos.checkout";
    public static final String POS_INVENTORY_RECEIVE = "pos.inventory.receive";
    public static final String POS_RETURNS_MANAGE = "pos.returns.manage";
    public static final String INVENTORY_READ = "inventory.read";
    public static final String INVENTORY_PRODUCTS_MANAGE = "inventory.products.manage";
    public static final String INVENTORY_WAREHOUSES_MANAGE = "inventory.warehouses.manage";
    public static final String INVENTORY_STOCK_MANAGE = "inventory.stock.manage";
    public static final String INVENTORY_MOVEMENTS_CREATE = "inventory.movements.create";
    public static final String INVENTORY_MOVEMENTS_CANCEL = "inventory.movements.cancel";
    public static final String EXPENSES_READ = "expenses.read";
    public static final String PETTY_CASH_READ = "petty_cash.read";
    public static final String RECEIVABLES_READ = "receivables.read";
    public static final String BUSINESS_CONTEXT_READ = "business.context:read";
    public static final String FINANCE_REFERENCES_READ = "finance.references:read";
    public static final String CUSTOMERS_READ = "customers.read";
    public static final String PROVIDERS_READ = "providers.read";
    public static final String WAREHOUSES_READ = "warehouses.read";
    public static final String BUDGET_LINES_READ = "budget_lines.read";
    public static final String ACCOUNTING_ACCOUNTS_READ = "accounting_accounts.read";
    public static final String CUSTOMERS_CREATE = "customers.create";
    public static final String CUSTOMERS_UPDATE = "customers.update";
    public static final String OPPORTUNITIES_READ = "opportunities.read";
    public static final String OPPORTUNITIES_CREATE = "opportunities.create";
    public static final String OPPORTUNITIES_UPDATE = "opportunities.update";
    public static final String QUOTES_READ = "quotes.read";
    public static final String QUOTES_CREATE = "quotes.create";
    public static final String QUOTES_UPDATE = "quotes.update";
    public static final String COMMERCIAL_REFERENCES_READ = "commercial.references:read";
    public static final String TASKS_CREATE = "tasks.create";
    public static final String TASKS_DELEGATE = "tasks.delegate";
    public static final String TASKS_UPDATE = "tasks.update";
    public static final String TASKS_ORGANIZE = "tasks.organize";
    public static final String TASKS_OPERATE = "tasks.operate";
    public static final String TASKS_AUDIT = "tasks.audit";
    public static final String EXPENSES_CREATE = "expenses.create";
    public static final String PETTY_CASH_EXPENSE_CREATE = "petty_cash.expense:create";
    public static final String PETTY_CASH_DEPOSIT_CREATE = "petty_cash.deposit:create";
    public static final String FILES_READ = "files.read";
    public static final String FILES_ATTACH = "files.attach";
    public static final String OPENID = "openid";
    public static final String EMAIL = "email";

    private static final Set<String> DEFAULT_SCOPES = Set.of(
        SALES_TODAY_READ,
        BUSINESS_SNAPSHOT_READ,
        HR_ANNOUNCEMENTS_RECEIPTS_READ, HR_INCENTIVES_READ, HR_PERMISSIONS_SELF_READ, HR_PERMISSIONS_READ, HR_PEOPLE_READ, LEARNING_READ, HR_PEOPLE_DETAILS_READ, HR_ASSETS_READ, HR_ANNOUNCEMENTS_READ, HR_RECORDS_READ,
        HR_ATTENDANCE_READ, HR_CONTROL_READ, HR_PAYROLL_READ, HR_KPIS_READ,
        TASKS_READ, TASKS_KPIS_READ, PROJECTS_READ, PROCESSES_READ,
        SALES_READ,
        POS_READ,
        INVENTORY_READ,
        EXPENSES_READ,
        PETTY_CASH_READ,
        RECEIVABLES_READ,
        BUSINESS_CONTEXT_READ,
        FINANCE_REFERENCES_READ,
        CUSTOMERS_READ, PROVIDERS_READ, WAREHOUSES_READ, BUDGET_LINES_READ, ACCOUNTING_ACCOUNTS_READ,
        OPPORTUNITIES_READ, QUOTES_READ, COMMERCIAL_REFERENCES_READ
    );
    public static final String EXPENSES_ACCOUNTING_MANAGE = "expenses.accounting.manage";
    public static final String EXPENSES_ACCOUNTS_MANAGE = "expenses.accounts.manage";
    public static final String EXPENSES_PROVIDERS_MANAGE = "expenses.providers.manage";
    public static final String EXPENSES_BUDGETS_MANAGE = "expenses.budgets.manage";
    public static final String EXPENSES_MANAGE = "expenses.manage";
    public static final String EXPENSES_APPROVE = "expenses.approve";
    public static final String EXPENSES_PAY = "expenses.pay";
    public static final String EXPENSES_REVERSE = "expenses.reverse";
    public static final String PETTY_CASH_FUNDS_MANAGE = "petty_cash.funds.manage";
    public static final String PETTY_CASH_RECEIPTS_MANAGE = "petty_cash.receipts.manage";
    public static final String PETTY_CASH_RECEIPTS_APPROVE = "petty_cash.receipts.approve";
    public static final String PETTY_CASH_STATEMENTS_CLOSE = "petty_cash.statements.close";
    private static final Set<String> ACTION_SCOPES = Set.of(
        EXPENSES_ACCOUNTING_MANAGE, EXPENSES_ACCOUNTS_MANAGE, EXPENSES_PROVIDERS_MANAGE, EXPENSES_BUDGETS_MANAGE,
        EXPENSES_MANAGE, EXPENSES_APPROVE, EXPENSES_PAY, EXPENSES_REVERSE,
        PETTY_CASH_FUNDS_MANAGE, PETTY_CASH_RECEIPTS_MANAGE, PETTY_CASH_RECEIPTS_APPROVE, PETTY_CASH_STATEMENTS_CLOSE,
        LEARNING_MANAGE,
        POS_TERMINAL_MANAGE, POS_SETTLEMENTS_MANAGE, POS_ORDERS_MANAGE, SALES_COMMISSIONS_CUT, SALES_COMMISSIONS_SCHEDULE, INVENTORY_PROVIDERS_MANAGE, INVENTORY_DISCOUNTS_MANAGE,
        INVENTORY_PROCUREMENT_MANAGE, INVENTORY_PROCUREMENT_APPROVE, INVENTORY_PROCUREMENT_RECEIVE, INVENTORY_INVOICES_MANAGE,
        POS_REGISTERS_MANAGE, POS_SHIFTS_MANAGE, POS_CASH_MANAGE, POS_CHECKOUT, POS_INVENTORY_RECEIVE, POS_RETURNS_MANAGE,
        SALES_MANAGE, SALES_COLLECTIONS_CONFIRM, SALES_CANCEL, SALES_CONTRACTS_MANAGE, SALES_FOLLOWUPS_MANAGE, SALES_COMMISSIONS_MANAGE,
        INVENTORY_PRODUCTS_MANAGE, INVENTORY_WAREHOUSES_MANAGE, INVENTORY_STOCK_MANAGE, INVENTORY_MOVEMENTS_CREATE, INVENTORY_MOVEMENTS_CANCEL,
        FILES_READ, FILES_ATTACH,
        TASKS_CREATE, TASKS_DELEGATE, TASKS_UPDATE, TASKS_ORGANIZE, TASKS_OPERATE, TASKS_AUDIT,
        HR_CONTROL_MANAGE, HR_ATTENDANCE_CORRECT, HR_PAYROLL_PREPARE, HR_PAYROLL_APPROVE, HR_PAYROLL_PAY, PROJECTS_MANAGE, PROCESSES_MANAGE, PROCESSES_RUN,
        HR_INCENTIVES_MANAGE, HR_PERMISSIONS_REQUEST, HR_PERMISSIONS_REVIEW, HR_PEOPLE_MANAGE, HR_PEOPLE_TERMINATE, HR_PEOPLE_IMPORT, HR_ASSETS_MANAGE, HR_ANNOUNCEMENTS_MANAGE, HR_RECORDS_MANAGE, HR_ANNOUNCEMENTS_RESPOND,
        CUSTOMERS_CREATE, CUSTOMERS_UPDATE, OPPORTUNITIES_CREATE, OPPORTUNITIES_UPDATE, QUOTES_CREATE, QUOTES_UPDATE,
        EXPENSES_CREATE,
        PETTY_CASH_EXPENSE_CREATE,
        PETTY_CASH_DEPOSIT_CREATE
    );
    private static final Set<String> SUPPORTED_SCOPES = supportedScopes(DEFAULT_SCOPES, ACTION_SCOPES);
    private static final Set<String> OAUTH_IDENTITY_SCOPES = Set.of(OPENID, EMAIL);

    private static final String PROVIDER = "generic_mcp";
    private static final String TOKEN_PREFIX = "idx_ai_";
    private static final int TOKEN_BYTES = 32;
    private static final int DEFAULT_EXPIRY_DAYS = 30;
    private static final int MAX_EXPIRY_DAYS = 90;
    private static final int MAX_ACTIVE_CONNECTIONS = 5;

    private final AiAccessTokenRepository repository;
    private final Clock clock;
    private final SecureRandom secureRandom = new SecureRandom();

    public AiAccessTokenService(AiAccessTokenRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    @Transactional
    public IssuedConnection issue(AuthSessionUser owner, String label, Integer expiresInDays) {
        return issue(owner, label, expiresInDays, null);
    }

    @Transactional
    public IssuedConnection issue(
        AuthSessionUser owner,
        String label,
        Integer expiresInDays,
        Set<String> requestedScopes
    ) {
        return issue(owner, label, expiresInDays, requestedScopes, false);
    }

    @Transactional
    public IssuedConnection issueOAuth(
        AuthSessionUser owner,
        String label,
        Integer expiresInDays,
        Set<String> requestedScopes
    ) {
        return issue(owner, label, expiresInDays, requestedScopes, true);
    }

    private IssuedConnection issue(
        AuthSessionUser owner,
        String label,
        Integer expiresInDays,
        Set<String> requestedScopes,
        boolean allowIdentityScopes
    ) {
        requireDirectMembership(owner);
        var normalizedLabel = normalizeLabel(label);
        var days = expiresInDays == null ? DEFAULT_EXPIRY_DAYS : expiresInDays;
        if (days < 1 || days > MAX_EXPIRY_DAYS) {
            throw new IllegalArgumentException("expiresInDays must be between 1 and 90.");
        }

        var now = clock.instant();
        requireAvailableConnection(owner);

        var rawToken = generateToken();
        var expiresAt = now.plus(Duration.ofDays(days));
        var visiblePrefix = rawToken.substring(0, Math.min(18, rawToken.length()));
        var scopes = normalizeScopes(requestedScopes, allowIdentityScopes);
        var id = repository.insert(
            owner,
            PROVIDER,
            normalizedLabel,
            visiblePrefix,
            sha256Hex(rawToken),
            expiresAt,
            scopes
        );
        return new IssuedConnection(id, PROVIDER, normalizedLabel, visiblePrefix, scopes, expiresAt, now, rawToken);
    }

    @Transactional(readOnly = true)
    public void requireAvailableConnection(AuthSessionUser owner) {
        requireDirectMembership(owner);
        if (repository.countActive(owner.userId(), owner.companyId(), clock.instant()) >= MAX_ACTIVE_CONNECTIONS) {
            throw new AiConnectionLimitException();
        }
    }

    public Set<String> supportedScopes() {
        return SUPPORTED_SCOPES;
    }

    public Set<String> supportedOAuthScopes() {
        var scopes = new java.util.HashSet<>(SUPPORTED_SCOPES);
        scopes.addAll(OAUTH_IDENTITY_SCOPES);
        return Set.copyOf(scopes);
    }

    @Transactional(readOnly = true)
    public List<AiAccessTokenRepository.StoredConnection> list(AuthSessionUser owner) {
        requireDirectMembership(owner);
        return repository.list(owner.userId(), owner.companyId());
    }

    @Transactional
    public boolean revoke(AuthSessionUser owner, long connectionId) {
        requireDirectMembership(owner);
        return repository.revoke(connectionId, owner.userId(), owner.companyId(), clock.instant()) == 1;
    }

    @Transactional
    public IssuedConnection rotate(
        AuthSessionUser owner,
        long connectionId,
        Integer expiresInDays,
        Set<String> requestedScopes
    ) {
        return rotate(owner, connectionId, expiresInDays, requestedScopes, false);
    }

    @Transactional
    public IssuedConnection rotateOAuth(
        AuthSessionUser owner,
        long connectionId,
        Integer expiresInDays,
        Set<String> requestedScopes
    ) {
        return rotate(owner, connectionId, expiresInDays, requestedScopes, true);
    }

    private IssuedConnection rotate(
        AuthSessionUser owner,
        long connectionId,
        Integer expiresInDays,
        Set<String> requestedScopes,
        boolean allowIdentityScopes
    ) {
        requireDirectMembership(owner);
        var days = expiresInDays == null ? DEFAULT_EXPIRY_DAYS : expiresInDays;
        if (days < 1 || days > MAX_EXPIRY_DAYS) {
            throw new IllegalArgumentException("expiresInDays must be between 1 and 90.");
        }
        var scopes = normalizeScopes(requestedScopes, allowIdentityScopes);
        var now = clock.instant();
        var rawToken = generateToken();
        var expiresAt = now.plus(Duration.ofDays(days));
        var visiblePrefix = rawToken.substring(0, Math.min(18, rawToken.length()));
        if (repository.rotate(
            connectionId,
            owner,
            visiblePrefix,
            sha256Hex(rawToken),
            expiresAt,
            scopes
        ) != 1) {
            throw new IllegalArgumentException("AI connection is no longer active.");
        }
        return new IssuedConnection(
            connectionId,
            PROVIDER,
            "Conexión renovada",
            visiblePrefix,
            scopes,
            expiresAt,
            now,
            rawToken
        );
    }

    @Transactional
    public Optional<AiAccessTokenRepository.StoredToken> authenticate(
        String authorizationHeader,
        String requiredScope
    ) {
        return authenticateStoredToken(authorizationHeader, requiredScope, true);
    }

    @Transactional
    public Optional<AiAccessTokenRepository.StoredToken> authenticate(String authorizationHeader) {
        return authenticateStoredToken(authorizationHeader, null, true);
    }

    @Transactional(readOnly = true)
    public Optional<AiAccessTokenRepository.StoredToken> authenticateReadOnly(String authorizationHeader) {
        return authenticateStoredToken(authorizationHeader, null, false);
    }

    private Optional<AiAccessTokenRepository.StoredToken> authenticateStoredToken(
        String authorizationHeader,
        String requiredScope,
        boolean markUsage
    ) {
        var rawToken = bearerToken(authorizationHeader);
        if (rawToken.isEmpty()) {
            return Optional.empty();
        }
        var now = clock.instant();
        var stored = repository.findActiveByHash(sha256Hex(rawToken.get()), now)
            .filter(token -> requiredScope == null || token.scopes().contains(requiredScope));
        if (markUsage) stored.ifPresent(token -> repository.markUsed(token.id(), now));
        return stored;
    }

    private void requireDirectMembership(AuthSessionUser owner) {
        if (owner == null || owner.userId() == null || owner.companyId() == null || owner.userCompanyId() == null) {
            throw new IllegalArgumentException("AI connections require a direct active company membership.");
        }
    }

    private String normalizeLabel(String label) {
        var normalized = label == null ? "" : label.trim();
        if (normalized.isBlank()) {
            return "Conexión MCP";
        }
        if (normalized.length() > 120) {
            throw new IllegalArgumentException("label must not exceed 120 characters.");
        }
        return normalized;
    }

    private Set<String> normalizeScopes(Set<String> requestedScopes, boolean allowIdentityScopes) {
        if (requestedScopes == null) {
            return DEFAULT_SCOPES;
        }
        var normalized = requestedScopes.stream()
            .filter(java.util.Objects::nonNull)
            .map(String::trim)
            .filter(scope -> !scope.isBlank())
            .collect(java.util.stream.Collectors.toUnmodifiableSet());
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException("At least one AI permission is required.");
        }
        if (allowIdentityScopes
            && normalized.contains(OPENID) != normalized.contains(EMAIL)) {
            throw new IllegalArgumentException("OAuth identity permissions openid and email must be granted together.");
        }
        var supported = allowIdentityScopes ? supportedOAuthScopes() : SUPPORTED_SCOPES;
        if (!supported.containsAll(normalized)) {
            throw new IllegalArgumentException("One or more AI permissions are not supported.");
        }
        return normalized;
    }

    private Optional<String> bearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.length() > 512) {
            return Optional.empty();
        }
        var separator = authorizationHeader.indexOf(' ');
        if (separator < 1 || !"bearer".equalsIgnoreCase(authorizationHeader.substring(0, separator))) {
            return Optional.empty();
        }
        var token = authorizationHeader.substring(separator + 1).trim();
        if (!token.startsWith(TOKEN_PREFIX) || token.length() < 40 || token.contains(" ")) {
            return Optional.empty();
        }
        return Optional.of(token);
    }

    private String generateToken() {
        var bytes = new byte[TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return TOKEN_PREFIX + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static Set<String> supportedScopes(Set<String> reads, Set<String> actions) {
        var scopes = new java.util.HashSet<>(reads);
        scopes.addAll(actions);
        return Set.copyOf(scopes);
    }

    private String sha256Hex(String value) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is not available.", exception);
        }
    }

    public record IssuedConnection(
        long id,
        String provider,
        String label,
        String tokenPrefix,
        Set<String> scopes,
        Instant expiresAt,
        Instant createdAt,
        String accessToken
    ) {
    }
}
