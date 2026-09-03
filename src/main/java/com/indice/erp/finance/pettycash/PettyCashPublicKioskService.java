package com.indice.erp.finance.pettycash;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.pettycash.dto.CreatePettyCashSettlementLineRequest;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import com.indice.erp.hr.attendance.kiosk.AttendanceKioskTokenService;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PettyCashPublicKioskService {

    private static final int MAX_PIN_FAILURES = 5;
    private static final long PIN_FAILURE_WINDOW_SECONDS = 15 * 60;

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;
    private final AttendanceKioskTokenService tokenService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final PettyCashMapper mapper;
    private final PettyCashService pettyCashService;
    private final PettyCashAttachmentService attachmentService;
    private final int inactivityTimeoutSeconds;
    private final int sessionTtlSeconds;
    private final ConcurrentHashMap<String, PinFailureWindow> pinFailures = new ConcurrentHashMap<>();

    public PettyCashPublicKioskService(
            JdbcTemplate jdbcTemplate,
            ObjectMapper objectMapper,
            AttendanceKioskTokenService tokenService,
            BCryptPasswordEncoder passwordEncoder,
            PettyCashMapper mapper,
            PettyCashService pettyCashService,
            PettyCashAttachmentService attachmentService,
            @Value("${app.petty-cash.kiosk.inactivity-timeout-seconds:900}") int inactivityTimeoutSeconds,
            @Value("${app.petty-cash.kiosk.session-ttl-seconds:14400}") int sessionTtlSeconds) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
        this.tokenService = tokenService;
        this.passwordEncoder = passwordEncoder;
        this.mapper = mapper;
        this.pettyCashService = pettyCashService;
        this.attachmentService = attachmentService;
        this.inactivityTimeoutSeconds = Math.max(30, inactivityTimeoutSeconds);
        this.sessionTtlSeconds = Math.max(this.inactivityTimeoutSeconds, sessionTtlSeconds);
    }

    public Map<String, Object> publicBootstrap(String fundToken) {
        var fund = getActiveKioskFund(fundToken);
        var body = new LinkedHashMap<String, Object>();
        body.put("fund", publicFundMap(fund));
        body.put("scope_label", scopeLabel(fund));
        body.put("auth_methods", List.of("pin"));
        body.put("inactivity_timeout_seconds", inactivityTimeoutSeconds);
        return body;
    }

    /** Builds a fund workspace for an employee already authenticated by the Kiosk Engine. */
    public Map<String, Object> employeeBootstrap(
            String fundToken,
            long companyId,
            long userId) {
        var context = requireEmployeeContext(fundToken, companyId, userId);
        var body = new LinkedHashMap<String, Object>();
        body.put("fund", publicFundMap(context.fund()));
        body.put("scope_label", scopeLabel(context.fund()));
        body.put("authentication", "ENGINE_PIN_SESSION");
        body.put("user", employeeMap(context.employee()));
        body.put("recent_receipts", employeeRecentReceipts(context.fund(), context.employee()));
        body.putAll(employeeHistory(context.fund(), context.employee()));
        body.put("inactivity_timeout_seconds", inactivityTimeoutSeconds);
        return body;
    }

    /** Returns only the authenticated employee's receipt history for an Engine workspace. */
    public Map<String, Object> employeeMovements(
            String fundToken,
            long companyId,
            long userId) {
        var context = requireEmployeeContext(fundToken, companyId, userId);
        var body = new LinkedHashMap<String, Object>();
        body.put("fund", publicFundMap(context.fund()));
        body.put("recent_receipts", employeeRecentReceipts(context.fund(), context.employee()));
        body.putAll(employeeHistory(context.fund(), context.employee()));
        return body;
    }

    /**
     * Revalidates the Engine identity against the active fund and returns an ephemeral module token.
     * The caller uses it server-side only to preserve the existing ownership and fund guards.
     */
    public String employeeIdentificationToken(
            String fundToken,
            long companyId,
            long userId) {
        var context = requireEmployeeContext(fundToken, companyId, userId);
        return tokenService.createIdentificationToken(
            normalizeFundToken(fundToken),
            context.employee().userCompanyId(),
            "pin",
            tokenService.nextIdentificationExpiryEpochSeconds()
        );
    }

    /** Revalidates that a receipt belongs to the authenticated employee before file operations. */
    public void requireEmployeeOwnedReceipt(
            String fundToken,
            long companyId,
            long userId,
            long settlementLineId) {
        if (settlementLineId <= 0) {
            throw new IllegalArgumentException("A valid settlementLineId is required.");
        }
        requireEmployeeOwnedKioskReceipt(
            requireEmployeeContext(fundToken, companyId, userId), settlementLineId, false);
    }

    @Transactional(noRollbackFor = IllegalArgumentException.class)
    public Map<String, Object> publicIdentify(String fundToken, Map<String, Object> payload) {
        var fund = getActiveKioskFund(fundToken);
        var normalizedPayload = payload == null ? Map.<String, Object>of() : payload;
        var authMethod = normalizePublicAuthMethod(stringValue(normalizedPayload, "auth_method"));
        var credentialPayload = stringValue(normalizedPayload, "credential_payload", "credential", "pin");
        if (credentialPayload.isBlank()) {
            throw new IllegalArgumentException("credential_payload is required.");
        }

        ensurePinAttemptAllowed(fundToken);
        var employee = resolveEmployeeByPin(fund.companyId(), credentialPayload);
        if (employee == null) {
            recordPinFailure(fundToken);
            throw new IllegalArgumentException("Credential validation failed.");
        }
        clearPinFailures(fundToken);
        validateEmployeeAccess(fund, employee);

        var expiresAtEpochSeconds = Instant.now().plusSeconds(sessionTtlSeconds).getEpochSecond();
        var identificationToken = tokenService.createIdentificationToken(
            normalizeFundToken(fundToken),
            employee.userCompanyId(),
            authMethod,
            expiresAtEpochSeconds
        );

        var body = new LinkedHashMap<String, Object>();
        body.put("auth_method", authMethod);
        body.put("fund", publicFundMap(fund));
        body.put("user", employeeMap(employee));
        body.put("identification_token", identificationToken);
        body.put("expires_at", Instant.ofEpochSecond(expiresAtEpochSeconds).toString());
        body.put("recent_receipts", recentReceipts(fund));
        body.putAll(publicHistory(fund, employee));
        return body;
    }

    @Transactional
    public Map<String, Object> publicCreateReceipt(String fundToken, Map<String, Object> payload) {
        var context = requirePublicContext(fundToken, payload);
        var normalizedPayload = payload == null ? Map.<String, Object>of() : payload;
        var totalAmount = decimalValue(normalizedPayload, "total_amount", "totalAmount", "amount");
        var taxAmount = decimalValue(normalizedPayload, "tax_amount", "taxAmount");
        var subtotalAmount = decimalValue(normalizedPayload, "subtotal_amount", "subtotalAmount");
        var currencyCode = stringValue(normalizedPayload, "currency_code", "currencyCode");
        var description = stringValue(normalizedPayload, "description", "concept", "concepto");
        var receiptReference = stringValue(normalizedPayload, "receipt_reference", "receiptReference", "reference");
        var expenseDate = dateValue(normalizedPayload, "expense_date", "expenseDate");
        var attachmentCount = integerValue(normalizedPayload, "attachment_count", "attachmentCount");
        var providerId = longValue(normalizedPayload, "provider_id", "providerId");
        var accountingAccountId = longValue(normalizedPayload, "accounting_account_id", "accountingAccountId");

        if (description.isBlank()) {
            throw new IllegalArgumentException("description is required.");
        }
        if (totalAmount == null || totalAmount.signum() <= 0) {
            throw new IllegalArgumentException("total_amount must be greater than zero.");
        }
        if (currencyCode.isBlank()) {
            currencyCode = context.fund().currencyCode();
        }

        var metadata = new LinkedHashMap<String, Object>();
        metadata.put("source", "petty_cash_kiosk");
        metadata.put("kioskFundId", context.fund().id());
        metadata.put("identifiedUserCompanyId", context.employee().userCompanyId());

        var request = new CreatePettyCashSettlementLineRequest(
            null,
            null,
            providerId,
            accountingAccountId,
            description,
            receiptReference.isBlank() ? null : receiptReference,
            subtotalAmount,
            taxAmount,
            totalAmount,
            currencyCode,
            expenseDate == null ? LocalDate.now() : expenseDate,
            attachmentCount == null ? 0 : attachmentCount,
            null,
            null,
            objectMapper.valueToTree(metadata)
        );
        var mutation = pettyCashService.createSettlementLine(
            context.financeContext(),
            context.fund().id(),
            request
        );
        var refreshedFund = getActiveKioskFund(fundToken);
        var body = new LinkedHashMap<String, Object>();
        body.put("fund", publicFundMap(refreshedFund));
        body.put("statement", mutation.statement());
        body.put("settlement_line", mutation.settlementLine());
        body.put("recent_receipts", recentReceipts(refreshedFund));
        body.putAll(publicHistory(refreshedFund, context.employee()));
        return body;
    }

    public Map<String, Object> publicCreateAttachmentUpload(
            String fundToken,
            long settlementLineId,
            Map<String, Object> payload) {
        var context = requirePublicContext(fundToken, payload);
        return attachmentService.createAttachmentUpload(
            context.financeContext(),
            context.fund().id(),
            settlementLineId,
            payload == null ? Map.of() : payload
        );
    }

    public Map<String, Object> publicMovements(String fundToken, Map<String, Object> payload) {
        var context = requirePublicContext(fundToken, payload);
        var body = new LinkedHashMap<String, Object>();
        body.put("fund", publicFundMap(context.fund()));
        body.put("recent_receipts", recentReceipts(context.fund()));
        body.putAll(publicHistory(context.fund(), context.employee()));
        return body;
    }

    public Map<String, Object> publicRegisterAttachment(
            String fundToken,
            long settlementLineId,
            Map<String, Object> payload) {
        var context = requirePublicContext(fundToken, payload);
        return attachmentService.registerAttachment(
            context.financeContext(),
            context.fund().id(),
            settlementLineId,
            payload == null ? Map.of() : payload
        );
    }

    public Map<String, Object> publicListAttachments(
            String fundToken,
            long settlementLineId,
            Map<String, Object> payload) {
        var context = requirePublicContext(fundToken, payload);
        return attachmentService.listAttachments(
            context.financeContext(),
            context.fund().id(),
            settlementLineId
        );
    }

    @Transactional
    public Map<String, Object> publicDeleteReceipt(
            String fundToken,
            long settlementLineId,
            Map<String, Object> payload) {
        var context = requirePublicContext(fundToken, payload);
        requireEmployeeOwnedKioskReceipt(context, settlementLineId);
        pettyCashService.deleteSettlementLine(
            context.financeContext(),
            context.fund().id(),
            settlementLineId
        );

        var refreshedFund = getActiveKioskFund(fundToken);
        var body = new LinkedHashMap<String, Object>();
        body.put("fund", publicFundMap(refreshedFund));
        body.put("recent_receipts", recentReceipts(refreshedFund));
        body.putAll(publicHistory(refreshedFund, context.employee()));
        return body;
    }

    private void requireEmployeeOwnedKioskReceipt(
            PublicPettyCashKioskContext context,
            long settlementLineId) {
        requireEmployeeOwnedKioskReceipt(context, settlementLineId, true);
    }

    private void requireEmployeeOwnedKioskReceipt(
            PublicPettyCashKioskContext context,
            long settlementLineId,
            boolean requireDeletableStatus) {
        var rows = jdbcTemplate.query(
            """
                SELECT created_by_user_id, status, metadata_json
                FROM finance_petty_cash_settlement_lines
                WHERE company_id = ?
                  AND petty_cash_fund_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                """,
            (rs, rowNum) -> new PublicReceiptOwnership(
                rs.getLong("created_by_user_id"),
                rs.getString("status"),
                rs.getString("metadata_json")
            ),
            context.fund().companyId(),
            context.fund().id(),
            settlementLineId
        );

        if (rows.isEmpty()) {
            throw new NoSuchElementException("Petty cash receipt not found.");
        }

        var receipt = rows.getFirst();
        if (!isEmployeeOwnedKioskReceipt(
                context.employee(),
                receipt.createdByUserId(),
                receipt.metadataJson())) {
            throw FinanceApiException.forbidden("Only receipts created by the identified employee can be deleted.");
        }
        if (requireDeletableStatus && !isKioskDeletableStatus(receipt.status())) {
            throw FinanceApiException.conflict("This receipt can no longer be deleted from the kiosk.");
        }
    }

    private boolean isEmployeeOwnedKioskReceipt(
            PublicPettyCashEmployee employee,
            long createdByUserId,
            String metadataJson) {
        try {
            var metadata = readMetadata(metadataJson);
            return createdByUserId == employee.userId()
                && "petty_cash_kiosk".equals(metadata.path("source").asText())
                && metadata.path("identifiedUserCompanyId").asLong(-1L) == employee.userCompanyId();
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    private boolean isKioskDeletableStatus(String status) {
        return "DRAFT".equals(status) || "RECEIPT_ATTACHED".equals(status);
    }

    private com.fasterxml.jackson.databind.JsonNode readMetadata(String metadataJson) {
        try {
            return objectMapper.readTree(metadataJson == null || metadataJson.isBlank() ? "{}" : metadataJson);
        } catch (Exception ex) {
            throw new IllegalArgumentException("Petty cash receipt metadata is invalid.");
        }
    }

    private PublicPettyCashKioskContext requirePublicContext(String fundToken, Map<String, Object> payload) {
        var fund = getActiveKioskFund(fundToken);
        var identificationToken = stringValue(payload == null ? Map.of() : payload, "identification_token");
        var claims = tokenService.verifyIdentificationToken(normalizeFundToken(fundToken), identificationToken);
        var employee = loadEmployee(fund.companyId(), claims.userCompanyId());
        validateEmployeeAccess(fund, employee);
        var financeContext = new FinanceContext(
            employee.userId(),
            fund.companyId(),
            employee.fullName(),
            "petty_cash_kiosk",
            true,
            scopeForFund(fund)
        );
        return new PublicPettyCashKioskContext(fund, employee, financeContext);
    }

    private PublicPettyCashKioskContext requireEmployeeContext(
            String fundToken,
            long companyId,
            long userId) {
        if (companyId <= 0 || userId <= 0) {
            throw new SecurityException("Authenticated employee kiosk identity is required.");
        }
        var fund = getActiveKioskFund(fundToken);
        if (fund.companyId() != companyId) {
            throw new SecurityException("Petty cash kiosk does not belong to the authenticated company.");
        }
        var employee = loadEmployeeByUserId(companyId, userId);
        if (!hasCompanyWidePettyCashAccess(companyId, userId)) {
            validateEmployeeAccess(fund, employee);
        }
        var financeContext = new FinanceContext(
            employee.userId(),
            fund.companyId(),
            employee.fullName(),
            "petty_cash_employee_kiosk",
            true,
            scopeForFund(fund)
        );
        return new PublicPettyCashKioskContext(fund, employee, financeContext);
    }

    private boolean hasCompanyWidePettyCashAccess(long companyId, long userId) {
        var roles = jdbcTemplate.query(
            """
                SELECT LOWER(REPLACE(COALESCE(role, ''), ' ', '')) AS role
                FROM user_companies
                WHERE company_id = ? AND user_id = ?
                  AND LOWER(COALESCE(status, 'active')) IN ('active', 'activo')
                ORDER BY id DESC
                LIMIT 1
                """,
            (rs, rowNum) -> rs.getString("role"),
            companyId,
            userId
        );
        return roles.stream().findFirst()
            .map(role -> "root".equals(role) || "superadmin".equals(role))
            .orElse(false);
    }

    private PettyCashFundRecord getActiveKioskFund(String fundToken) {
        var normalizedToken = normalizeFundToken(fundToken);
        var legacyFundId = parseLegacyFundId(normalizedToken);
        var params = new ArrayList<Object>();
        params.add(normalizedToken);
        if (legacyFundId != null) {
            params.add(legacyFundId);
        }
        var rows = jdbcTemplate.query(
            """
            SELECT
            """ + PettyCashSql.FUND_COLUMNS + """
            FROM finance_petty_cash_funds fund
            WHERE (
                fund.kiosk_public_token = ?
                """ + (legacyFundId == null ? "" : "OR (fund.kiosk_public_token IS NULL AND fund.id = ?)") + """
              )
              AND fund.deleted_at IS NULL
              AND fund.kiosk_enabled = TRUE
              AND fund.status <> 'CLOSED'
            """,
            mapper::mapFund,
            params.toArray()
        );
        return rows.stream()
            .findFirst()
            .orElseThrow(() -> new NoSuchElementException("Petty cash kiosk not found."));
    }

    private PublicPettyCashEmployee resolveEmployeeByPin(long companyId, String pin) {
        var credentialRef = tokenService.pinCredentialReference(companyId, pin);
        var rows = jdbcTemplate.query(
            """
                SELECT m.id AS method_id,
                       p.user_company_id,
                       uc.user_id,
                       COALESCE(e.user_code, '') AS user_code,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position_title,
                       COALESCE(e.department, '') AS department,
                       COALESCE(LOWER(e.status), 'active') AS status,
                       m.credential_ref,
                       m.secret_hash
                FROM user_access_methods m
                JOIN user_access_profiles p ON p.id = m.access_profile_id
                JOIN hr_users e ON e.id = p.user_company_id
                JOIN user_companies uc ON uc.id = p.user_company_id
                WHERE m.company_id = ?
                  AND COALESCE(LOWER(m.status), 'active') = 'active'
                  AND COALESCE(LOWER(p.status), 'active') = 'active'
                  AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
                  AND m.method_type = 'pin'
                ORDER BY p.user_company_id ASC, m.priority ASC, m.id ASC
                """,
            (rs, rowNum) -> new PinCandidate(
                rs.getLong("method_id"),
                rs.getLong("user_company_id"),
                rs.getLong("user_id"),
                fallback(rs.getString("user_code"), ""),
                fallback(rs.getString("full_name"), ""),
                fallback(rs.getString("position_title"), ""),
                fallback(rs.getString("department"), ""),
                fallback(rs.getString("status"), "active"),
                fallback(rs.getString("credential_ref"), ""),
                fallback(rs.getString("secret_hash"), "")
            ),
            companyId
        );

        for (var candidate : rows) {
            if (!candidate.secretHash().isBlank() && passwordEncoder.matches(pin, candidate.secretHash())) {
                if (!credentialRef.equals(candidate.credentialRef())) {
                    jdbcTemplate.update(
                        "UPDATE user_access_methods SET credential_ref = ? WHERE company_id = ? AND id = ?",
                        credentialRef, companyId, candidate.methodId()
                    );
                }
                return new PublicPettyCashEmployee(
                    candidate.userCompanyId(),
                    candidate.userId(),
                    candidate.userCode(),
                    candidate.fullName(),
                    candidate.positionTitle(),
                    candidate.department(),
                    candidate.status()
                );
            }
        }
        return null;
    }

    private PublicPettyCashEmployee loadEmployee(long companyId, long userCompanyId) {
        var rows = jdbcTemplate.query(
            """
                SELECT e.id AS user_company_id,
                       uc.user_id,
                       COALESCE(e.user_code, '') AS user_code,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position_title,
                       COALESCE(e.department, '') AS department,
                       COALESCE(LOWER(e.status), 'active') AS status
                FROM hr_users e
                JOIN user_companies uc ON uc.id = e.id
                WHERE e.company_id = ?
                  AND e.id = ?
                  AND LOWER(COALESCE(uc.status, 'active')) = 'active'
                  AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
                """,
            (rs, rowNum) -> new PublicPettyCashEmployee(
                rs.getLong("user_company_id"),
                rs.getLong("user_id"),
                fallback(rs.getString("user_code"), ""),
                fallback(rs.getString("full_name"), ""),
                fallback(rs.getString("position_title"), ""),
                fallback(rs.getString("department"), ""),
                fallback(rs.getString("status"), "active")
            ),
            companyId,
            userCompanyId
        );
        return rows.stream()
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Identified collaborator is not active."));
    }

    private PublicPettyCashEmployee loadEmployeeByUserId(long companyId, long userId) {
        var rows = jdbcTemplate.query(
            """
                SELECT e.id AS user_company_id,
                       uc.user_id,
                       COALESCE(e.user_code, '') AS user_code,
                       TRIM(CONCAT_WS(' ', COALESCE(e.first_name, ''), COALESCE(e.last_name, ''))) AS full_name,
                       COALESCE(e.position, '') AS position_title,
                       COALESCE(e.department, '') AS department,
                       COALESCE(LOWER(e.status), 'active') AS status
                FROM hr_users e
                JOIN user_companies uc ON uc.id = e.id
                WHERE e.company_id = ?
                  AND uc.company_id = ?
                  AND uc.user_id = ?
                  AND LOWER(COALESCE(uc.status, 'active')) = 'active'
                  AND COALESCE(LOWER(e.status), 'active') <> 'terminated'
                ORDER BY e.id ASC
                LIMIT 1
                """,
            (rs, rowNum) -> new PublicPettyCashEmployee(
                rs.getLong("user_company_id"),
                rs.getLong("user_id"),
                fallback(rs.getString("user_code"), ""),
                fallback(rs.getString("full_name"), ""),
                fallback(rs.getString("position_title"), ""),
                fallback(rs.getString("department"), ""),
                fallback(rs.getString("status"), "active")
            ),
            companyId,
            companyId,
            userId
        );
        return rows.stream()
            .findFirst()
            .orElseThrow(() -> new SecurityException("No active employee is linked to this kiosk session."));
    }

    private void validateEmployeeAccess(PettyCashFundRecord fund, PublicPettyCashEmployee employee) {
        if (fund.responsibleUserId() != null && !fund.responsibleUserId().equals(employee.userId())) {
            throw new IllegalArgumentException("This PIN is not assigned to this petty cash fund.");
        }
    }

    private List<Map<String, Object>> recentReceipts(PettyCashFundRecord fund) {
        var items = jdbcTemplate.query(
            """
                SELECT id, description, total_amount, currency_code, expense_date, attachment_count, status
                FROM finance_petty_cash_settlement_lines
                WHERE company_id = ?
                  AND petty_cash_fund_id = ?
                  AND deleted_at IS NULL
                ORDER BY expense_date DESC, id DESC
                LIMIT 10
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("description", rs.getString("description"));
                row.put("total_amount", rs.getBigDecimal("total_amount"));
                row.put("currency_code", rs.getString("currency_code"));
                row.put("expense_date", rs.getObject("expense_date", LocalDate.class));
                row.put("attachment_count", rs.getInt("attachment_count"));
                row.put("status", rs.getString("status"));
                return row;
            },
            fund.companyId(),
            fund.id()
        );
        return new ArrayList<>(items);
    }

    private List<Map<String, Object>> employeeRecentReceipts(
            PettyCashFundRecord fund,
            PublicPettyCashEmployee employee) {
        var items = jdbcTemplate.query(
            """
                SELECT receipt.id, receipt.description, receipt.total_amount,
                       receipt.currency_code, receipt.expense_date,
                       receipt.attachment_count, receipt.status
                FROM finance_petty_cash_settlement_lines receipt
                WHERE receipt.company_id = ?
                  AND receipt.petty_cash_fund_id = ?
                  AND receipt.deleted_at IS NULL
                """ + employeeReceiptOwnershipSql("receipt") + """
                ORDER BY receipt.expense_date DESC, receipt.id DESC
                LIMIT 10
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("description", rs.getString("description"));
                row.put("total_amount", rs.getBigDecimal("total_amount"));
                row.put("currency_code", rs.getString("currency_code"));
                row.put("expense_date", rs.getObject("expense_date", LocalDate.class));
                row.put("attachment_count", rs.getInt("attachment_count"));
                row.put("status", rs.getString("status"));
                return row;
            },
            fund.companyId(),
            fund.id(),
            employee.userId(),
            employee.userCompanyId()
        );
        return new ArrayList<>(items);
    }

    private Map<String, Object> publicHistory(
            PettyCashFundRecord fund,
            PublicPettyCashEmployee employee) {
        var history = new LinkedHashMap<String, Object>();
        history.put("periods", publicPeriods(fund));
        history.put("expenses", publicExpenses(fund, employee));
        history.put("income_movements", publicIncomeMovements(fund));
        return history;
    }

    private Map<String, Object> employeeHistory(
            PettyCashFundRecord fund,
            PublicPettyCashEmployee employee) {
        var history = new LinkedHashMap<String, Object>();
        history.put("periods", publicPeriods(fund));
        history.put("expenses", employeeExpenses(fund, employee));
        // Replenishments and transfers belong to the shared fund, not to an employee receipt.
        history.put("income_movements", List.of());
        return history;
    }

    private List<Map<String, Object>> publicPeriods(PettyCashFundRecord fund) {
        var items = jdbcTemplate.query(
            """
                SELECT id, period_key, period_start, period_end, status, currency_code
                FROM finance_petty_cash_statements
                WHERE company_id = ?
                  AND petty_cash_fund_id = ?
                  AND deleted_at IS NULL
                ORDER BY period_start DESC, id DESC
                LIMIT 24
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("period_key", rs.getString("period_key"));
                row.put("period_start", rs.getObject("period_start", LocalDate.class));
                row.put("period_end", rs.getObject("period_end", LocalDate.class));
                row.put("status", rs.getString("status"));
                row.put("currency_code", rs.getString("currency_code"));
                return row;
            },
            fund.companyId(),
            fund.id()
        );
        return new ArrayList<>(items);
    }

    private List<Map<String, Object>> publicExpenses(
            PettyCashFundRecord fund,
            PublicPettyCashEmployee employee) {
        var items = jdbcTemplate.query(
            """
                SELECT settlement_line.id,
                       settlement_line.petty_cash_statement_id,
                       statement.period_key,
                       settlement_line.description,
                       settlement_line.receipt_reference,
                       settlement_line.total_amount,
                       settlement_line.currency_code,
                       settlement_line.expense_date,
                       settlement_line.attachment_count,
                       settlement_line.status,
                       settlement_line.created_by_user_id,
                       settlement_line.metadata_json
                FROM finance_petty_cash_settlement_lines settlement_line
                JOIN finance_petty_cash_statements statement
                  ON statement.id = settlement_line.petty_cash_statement_id
                 AND statement.deleted_at IS NULL
                WHERE settlement_line.company_id = ?
                  AND settlement_line.petty_cash_fund_id = ?
                  AND settlement_line.deleted_at IS NULL
                ORDER BY settlement_line.expense_date DESC, settlement_line.id DESC
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("statement_id", rs.getLong("petty_cash_statement_id"));
                row.put("period_key", rs.getString("period_key"));
                row.put("description", rs.getString("description"));
                row.put("receipt_reference", rs.getString("receipt_reference"));
                row.put("total_amount", rs.getBigDecimal("total_amount"));
                row.put("currency_code", rs.getString("currency_code"));
                row.put("expense_date", rs.getObject("expense_date", LocalDate.class));
                row.put("attachment_count", rs.getInt("attachment_count"));
                row.put("status", rs.getString("status"));
                row.put("can_delete", isKioskDeletableStatus(rs.getString("status"))
                    && isEmployeeOwnedKioskReceipt(
                        employee,
                        rs.getLong("created_by_user_id"),
                        rs.getString("metadata_json")
                    ));
                return row;
            },
            fund.companyId(),
            fund.id()
        );
        return new ArrayList<>(items);
    }

    private List<Map<String, Object>> employeeExpenses(
            PettyCashFundRecord fund,
            PublicPettyCashEmployee employee) {
        var items = jdbcTemplate.query(
            """
                SELECT settlement_line.id,
                       settlement_line.petty_cash_statement_id,
                       statement.period_key,
                       settlement_line.description,
                       settlement_line.receipt_reference,
                       settlement_line.total_amount,
                       settlement_line.currency_code,
                       settlement_line.expense_date,
                       settlement_line.attachment_count,
                       settlement_line.status
                FROM finance_petty_cash_settlement_lines settlement_line
                JOIN finance_petty_cash_statements statement
                  ON statement.id = settlement_line.petty_cash_statement_id
                 AND statement.deleted_at IS NULL
                WHERE settlement_line.company_id = ?
                  AND settlement_line.petty_cash_fund_id = ?
                  AND settlement_line.deleted_at IS NULL
                """ + employeeReceiptOwnershipSql("settlement_line") + """
                ORDER BY settlement_line.expense_date DESC, settlement_line.id DESC
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("statement_id", rs.getLong("petty_cash_statement_id"));
                row.put("period_key", rs.getString("period_key"));
                row.put("description", rs.getString("description"));
                row.put("receipt_reference", rs.getString("receipt_reference"));
                row.put("total_amount", rs.getBigDecimal("total_amount"));
                row.put("currency_code", rs.getString("currency_code"));
                row.put("expense_date", rs.getObject("expense_date", LocalDate.class));
                row.put("attachment_count", rs.getInt("attachment_count"));
                row.put("status", rs.getString("status"));
                row.put("can_delete", isKioskDeletableStatus(rs.getString("status")));
                return row;
            },
            fund.companyId(),
            fund.id(),
            employee.userId(),
            employee.userCompanyId()
        );
        return new ArrayList<>(items);
    }

    private String employeeReceiptOwnershipSql(String alias) {
        return """
                  AND %1$s.created_by_user_id = ?
                  AND JSON_VALID(%1$s.metadata_json)
                  AND JSON_UNQUOTE(JSON_EXTRACT(%1$s.metadata_json, '$.source')) = 'petty_cash_kiosk'
                  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(
                        %1$s.metadata_json, '$.identifiedUserCompanyId')) AS UNSIGNED) = ?
                """.formatted(alias);
    }

    private List<Map<String, Object>> publicIncomeMovements(PettyCashFundRecord fund) {
        var items = jdbcTemplate.query(
            """
                SELECT movement.id,
                       movement.petty_cash_statement_id,
                       COALESCE(statement.period_key, DATE_FORMAT(movement.movement_date, '%Y-%m')) AS period_key,
                       movement.type,
                       movement.amount,
                       movement.currency_code,
                       movement.movement_date,
                       movement.reference
                FROM finance_petty_cash_movements movement
                LEFT JOIN finance_petty_cash_statements statement
                  ON statement.id = movement.petty_cash_statement_id
                 AND statement.deleted_at IS NULL
                WHERE movement.company_id = ?
                  AND movement.petty_cash_fund_id = ?
                  AND movement.deleted_at IS NULL
                  AND movement.type IN ('INITIAL_FUNDING', 'ADDITIONAL_DEPOSIT', 'CARRY_FORWARD')
                ORDER BY movement.movement_date DESC, movement.id DESC
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("statement_id", rs.getObject("petty_cash_statement_id", Long.class));
                row.put("period_key", rs.getString("period_key"));
                row.put("type", rs.getString("type"));
                row.put("amount", rs.getBigDecimal("amount"));
                row.put("currency_code", rs.getString("currency_code"));
                row.put("movement_date", rs.getObject("movement_date", LocalDate.class));
                row.put("reference", rs.getString("reference"));
                return row;
            },
            fund.companyId(),
            fund.id()
        );
        return new ArrayList<>(items);
    }

    private Map<String, Object> publicFundMap(PettyCashFundRecord fund) {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", fund.id());
        row.put("name", fund.name());
        row.put("currency_code", fund.currencyCode());
        row.put("current_balance_amount", fund.currentBalanceAmount());
        row.put("limit_amount", fund.limitAmount());
        row.put("cut_off_day", fund.cutOffDay());
        row.put("scope_label", scopeLabel(fund));
        return row;
    }

    private Map<String, Object> employeeMap(PublicPettyCashEmployee employee) {
        var row = new LinkedHashMap<String, Object>();
        row.put("id", employee.userCompanyId());
        row.put("user_id", employee.userId());
        row.put("user_code", employee.userCode());
        row.put("full_name", employee.fullName());
        row.put("position_title", employee.positionTitle());
        row.put("department", employee.department());
        return row;
    }

    private FinanceScope scopeForFund(PettyCashFundRecord fund) {
        if (fund.businessId() != null) {
            return FinanceScope.businessOffice(fund.unitId(), fund.businessId());
        }
        if (fund.unitId() != null) {
            return FinanceScope.unitHeadquarters(fund.unitId());
        }
        return FinanceScope.corporateOffice();
    }

    private String scopeLabel(PettyCashFundRecord fund) {
        if (fund.businessId() != null) {
            return "Negocio #" + fund.businessId();
        }
        if (fund.unitId() != null) {
            return "Unidad #" + fund.unitId();
        }
        return "Empresa";
    }

    private void ensurePinAttemptAllowed(String fundToken) {
        var key = failureKey(fundToken);
        var now = Instant.now().getEpochSecond();
        var window = pinFailures.get(key);
        if (window == null || now - window.firstFailureEpochSeconds() > PIN_FAILURE_WINDOW_SECONDS) {
            return;
        }
        if (window.count() >= MAX_PIN_FAILURES) {
            throw new IllegalArgumentException("Too many failed PIN attempts. Try again later.");
        }
    }

    private void recordPinFailure(String fundToken) {
        var key = failureKey(fundToken);
        var now = Instant.now().getEpochSecond();
        pinFailures.compute(key, (ignored, current) -> {
            if (current == null || now - current.firstFailureEpochSeconds() > PIN_FAILURE_WINDOW_SECONDS) {
                return new PinFailureWindow(now, 1);
            }
            return new PinFailureWindow(current.firstFailureEpochSeconds(), current.count() + 1);
        });
    }

    private void clearPinFailures(String fundToken) {
        pinFailures.remove(failureKey(fundToken));
    }

    private String failureKey(String fundToken) {
        return normalizeFundToken(fundToken);
    }

    private Long parseLegacyFundId(String fundToken) {
        try {
            return Long.parseLong(fundToken);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String normalizeFundToken(String fundToken) {
        return fundToken == null ? "" : fundToken.trim();
    }

    private String normalizePublicAuthMethod(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "pin" -> "pin";
            default -> throw new IllegalArgumentException("Public kiosk auth_method must be pin.");
        };
    }

    private BigDecimal decimalValue(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value == null) {
                continue;
            }
            if (value instanceof Number number) {
                return BigDecimal.valueOf(number.doubleValue());
            }
            var text = String.valueOf(value).trim().replace(",", ".");
            if (!text.isBlank()) {
                return new BigDecimal(text);
            }
        }
        return null;
    }

    private Long longValue(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value == null) {
                continue;
            }
            if (value instanceof Number number) {
                return number.longValue();
            }
            var text = String.valueOf(value).trim();
            if (!text.isBlank()) {
                return Long.parseLong(text);
            }
        }
        return null;
    }

    private Integer integerValue(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value == null) {
                continue;
            }
            if (value instanceof Number number) {
                return number.intValue();
            }
            var text = String.valueOf(value).trim();
            if (!text.isBlank()) {
                return Integer.parseInt(text);
            }
        }
        return null;
    }

    private LocalDate dateValue(Map<String, Object> payload, String... keys) {
        for (var key : keys) {
            var value = payload.get(key);
            if (value == null) {
                continue;
            }
            var text = String.valueOf(value).trim();
            if (!text.isBlank()) {
                return LocalDate.parse(text);
            }
        }
        return null;
    }

    private String stringValue(Map<String, Object> payload, String... keys) {
        if (payload == null) {
            return "";
        }
        for (var key : keys) {
            var value = payload.get(key);
            if (value != null) {
                return String.valueOf(value).trim();
            }
        }
        return "";
    }

    private String fallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private record PublicPettyCashKioskContext(
        PettyCashFundRecord fund,
        PublicPettyCashEmployee employee,
        FinanceContext financeContext
    ) {
    }

    private record PublicReceiptOwnership(
        long createdByUserId,
        String status,
        String metadataJson
    ) {
    }

    private record PublicPettyCashEmployee(
        long userCompanyId,
        long userId,
        String userCode,
        String fullName,
        String positionTitle,
        String department,
        String status
    ) {
    }

    private record PinCandidate(
        long methodId,
        long userCompanyId,
        long userId,
        String userCode,
        String fullName,
        String positionTitle,
        String department,
        String status,
        String credentialRef,
        String secretHash
    ) {
    }

    private record PinFailureWindow(long firstFailureEpochSeconds, int count) {
    }
}
