package com.indice.erp.finance.payablekiosk;

import com.indice.erp.finance.payablekiosk.dto.PublicPayableRequest;
import com.indice.erp.finance.payablekiosk.dto.PublicProviderRegistrationRequest;
import com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver;
import java.math.BigDecimal;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class PayableKioskPublicRepository {

    record EmployeePinCandidate(long identityId, String name, String secretHash) {
    }

    record PublicProvider(long id, String name) {
    }

    record EmployeeIdentity(long userCompanyId, long userId, String name) {
    }

    private final JdbcTemplate jdbcTemplate;
    private final FinanceBusinessTimeZoneResolver timeZoneResolver;

    PayableKioskPublicRepository(
            JdbcTemplate jdbcTemplate,
            FinanceBusinessTimeZoneResolver timeZoneResolver) {
        this.jdbcTemplate = jdbcTemplate;
        this.timeZoneResolver = timeZoneResolver;
    }

    long insertProvider(PayableKioskRow kiosk, PublicProviderRegistrationRequest request, String metadataJson) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                    INSERT INTO finance_providers (
                      company_id, unit_id, business_id, name, legal_name, tax_id, email, phone,
                      contact_name, payment_terms_days, status, notes, created_by_user_id, metadata_json
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'INACTIVE', ?, NULL, ?)
                    """,
                    Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, kiosk.companyId());
            PayableKioskRepository.setLong(statement, 2, kiosk.unitId());
            PayableKioskRepository.setLong(statement, 3, kiosk.businessId());
            statement.setString(4, request.name().trim());
            statement.setString(5, PayableKioskRules.blankToNull(request.legalName()));
            statement.setString(6, PayableKioskRules.blankToNull(request.taxId()));
            statement.setString(7, PayableKioskRules.blankToNull(request.email()));
            statement.setString(8, PayableKioskRules.blankToNull(request.phone()));
            statement.setString(9, PayableKioskRules.blankToNull(request.contactName()));
            statement.setInt(10, 0);
            statement.setString(11, PayableKioskRules.blankToNull(request.notes()));
            statement.setString(12, metadataJson);
            return statement;
        }, keyHolder);
        return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
    }

    boolean providerRegistrationExists(PayableKioskRow kiosk, PublicProviderRegistrationRequest request) {
        var taxId = PayableKioskRules.blankToNull(request.taxId());
        var email = PayableKioskRules.blankToNull(request.email());
        var count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM finance_providers
                WHERE company_id = ? AND deleted_at IS NULL
                  AND ((? IS NOT NULL AND tax_id = ?) OR (? IS NOT NULL AND LOWER(email) = LOWER(?)))
                """,
                Integer.class,
                kiosk.companyId(),
                taxId,
                taxId,
                email,
                email);
        return count != null && count > 0;
    }

    Map<String, Object> providerCenterProfile(long companyId, long providerId) {
        return jdbcTemplate.query(
            """
                SELECT id, name, legal_name, tax_id, email, phone, contact_name,
                       payment_terms_days
                FROM finance_providers
                WHERE company_id = ? AND id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("name", rs.getString("name"));
                row.put("legal_name", value(rs.getString("legal_name")));
                row.put("tax_id", value(rs.getString("tax_id")));
                row.put("email", value(rs.getString("email")));
                row.put("phone", value(rs.getString("phone")));
                row.put("contact_name", value(rs.getString("contact_name")));
                row.put("payment_terms_days", rs.getInt("payment_terms_days"));
                return Map.copyOf(row);
            }, companyId, providerId).stream().findFirst().orElse(Map.of());
    }

    List<Map<String, Object>> providerCenterPayables(long companyId, long providerId) {
        var rows = jdbcTemplate.query(
            """
                SELECT expense.id, expense.folio, expense.concept, expense.total_amount,
                       expense.paid_amount, expense.balance_amount, expense.currency_code,
                       expense.expense_date, expense.due_date, expense.status,
                       expense.payment_status, expense.created_at
                FROM finance_expenses expense
                WHERE expense.company_id = ? AND expense.provider_id = ?
                  AND expense.purchase_order_id IS NULL AND expense.deleted_at IS NULL
                ORDER BY expense.created_at DESC, expense.id DESC LIMIT 100
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("id", rs.getLong("id"));
                row.put("folio", rs.getString("folio"));
                row.put("concept", rs.getString("concept"));
                row.put("total_amount", rs.getBigDecimal("total_amount"));
                row.put("paid_amount", rs.getBigDecimal("paid_amount"));
                row.put("balance_amount", rs.getBigDecimal("balance_amount"));
                row.put("currency_code", rs.getString("currency_code"));
                row.put("expense_date", rs.getDate("expense_date").toLocalDate().toString());
                row.put("due_date", rs.getDate("due_date") == null ? "" : rs.getDate("due_date").toLocalDate().toString());
                row.put("status", rs.getString("status"));
                row.put("payment_status", rs.getString("payment_status"));
                row.put("created_at", rs.getTimestamp("created_at").toInstant().toString());
                return new LinkedHashMap<>(row);
            }, companyId, providerId);
        attachPaymentProjection(companyId, rows);
        return rows.stream().map(Map::copyOf).toList();
    }

    List<Map<String, Object>> providerCenterPurchaseOrderPayments(
            long companyId, long providerId) {
        var rows = jdbcTemplate.query(
            """
                SELECT expense.id, expense.folio, expense.purchase_order_id,
                       JSON_UNQUOTE(JSON_EXTRACT(expense.metadata_json, '$.supplierInvoiceId'))
                         AS supplier_invoice_id,
                       JSON_UNQUOTE(JSON_EXTRACT(expense.metadata_json, '$.invoiceNumber'))
                         AS invoice_number,
                       expense.total_amount, expense.paid_amount, expense.balance_amount,
                       expense.currency_code, expense.payment_status, expense.created_at
                FROM finance_expenses expense
                WHERE expense.company_id = ? AND expense.provider_id = ?
                  AND expense.purchase_order_id IS NOT NULL AND expense.deleted_at IS NULL
                ORDER BY expense.created_at DESC, expense.id DESC LIMIT 100
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                row.put("expense_id", rs.getLong("id"));
                row.put("folio", rs.getString("folio"));
                row.put("purchase_order_id", rs.getLong("purchase_order_id"));
                var supplierInvoiceId = nullableLong(rs, "supplier_invoice_id");
                if (supplierInvoiceId != null) row.put("supplier_invoice_id", supplierInvoiceId);
                row.put("document_reference", value(rs.getString("invoice_number")).isBlank()
                    ? rs.getString("folio") : rs.getString("invoice_number"));
                row.put("total_amount", rs.getBigDecimal("total_amount"));
                row.put("paid_amount", rs.getBigDecimal("paid_amount"));
                row.put("balance_amount", rs.getBigDecimal("balance_amount"));
                row.put("currency_code", rs.getString("currency_code"));
                row.put("payment_status", rs.getString("payment_status"));
                row.put("created_at", rs.getTimestamp("created_at").toInstant().toString());
                return row;
            }, companyId, providerId);
        attachPaymentProjection(companyId, rows);
        return rows.stream().map(Map::copyOf).toList();
    }

    private void attachPaymentProjection(
            long companyId, List<? extends Map<String, Object>> rows) {
        for (var row : rows) {
            var rawExpenseId = row.containsKey("id") ? row.get("id") : row.get("expense_id");
            var expenseId = ((Number) rawExpenseId).longValue();
            row.put("payments", jdbcTemplate.query(
                """
                    SELECT id, amount, currency_code, payment_date
                    FROM finance_expense_payments
                    WHERE company_id = ? AND expense_id = ?
                    ORDER BY payment_date DESC, id DESC
                    """,
                (rs, rowNum) -> Map.of(
                    "date", rs.getDate("payment_date").toLocalDate().toString(),
                    "amount", rs.getBigDecimal("amount"),
                    "currency_code", rs.getString("currency_code"),
                    "reference", "PAGO-" + rs.getLong("id")),
                companyId, expenseId));
        }
    }

    private Long nullableLong(java.sql.ResultSet rs, String column) throws java.sql.SQLException {
        var value = rs.getLong(column);
        return rs.wasNull() ? null : value;
    }

    long insertProviderChangeRequest(
            long companyId,
            long providerId,
            String category,
            String changesJson,
            String protectedChanges,
            String submittedByName,
            String submittedByEmail) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                """
                    INSERT INTO provider_profile_change_requests (
                        company_id, provider_id, category, status, changes_json,
                        protected_changes, submitted_by_name, submitted_by_email
                    ) VALUES (?, ?, ?, 'SUBMITTED', ?, ?, ?, ?)
                    """,
                Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, companyId);
            statement.setLong(2, providerId);
            statement.setString(3, category);
            statement.setString(4, changesJson);
            statement.setString(5, protectedChanges);
            statement.setString(6, submittedByName);
            statement.setString(7, submittedByEmail);
            return statement;
        }, keyHolder);
        return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
    }

    private String value(String value) {
        return value == null ? "" : value;
    }

    long insertPayable(
            PayableKioskRow kiosk,
            Long providerId,
            Long requestedByUserId,
            PublicPayableRequest request,
            String customJson,
            String metadataJson) {
        var keyHolder = new GeneratedKeyHolder();
        var businessDate = LocalDate.now(timeZoneResolver.resolve(kiosk.companyId()));
        var folio = "CXP-" + businessDate.getYear() + "-"
            + UUID.randomUUID().toString().replace("-", "").toUpperCase();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                    INSERT INTO finance_expenses (
                      company_id, unit_id, business_id, folio, provider_id, concept, description,
                      expense_type, subtotal_amount, tax_amount, total_amount, paid_amount,
                      balance_amount, currency_code, expense_date, due_date, requested_by_user_id,
                      status, payment_status, attachment_count, custom_fields_json, metadata_json
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'VARIABLE', ?, ?, ?, 0, ?, ?, ?, ?, ?,
                      'DRAFT', ?, 0, ?, ?)
                    """,
                    Statement.RETURN_GENERATED_KEYS);
            statement.setLong(1, kiosk.companyId());
            PayableKioskRepository.setLong(statement, 2, kiosk.unitId());
            PayableKioskRepository.setLong(statement, 3, kiosk.businessId());
            statement.setString(4, folio);
            PayableKioskRepository.setLong(statement, 5, providerId);
            statement.setString(6, request.concept().trim());
            statement.setString(7, PayableKioskRules.blankToNull(request.description()));
            statement.setBigDecimal(8, request.subtotalAmount());
            statement.setBigDecimal(9, request.taxAmount());
            statement.setBigDecimal(10, request.totalAmount());
            statement.setBigDecimal(11, request.totalAmount().max(BigDecimal.ZERO));
            statement.setString(12, kiosk.currencyCode());
            statement.setObject(13, businessDate);
            statement.setObject(14, request.dueDate());
            PayableKioskRepository.setLong(statement, 15, requestedByUserId);
            statement.setString(16, paymentStatusFor(request.dueDate(), businessDate));
            statement.setString(17, customJson);
            statement.setString(18, metadataJson);
            return statement;
        }, keyHolder);
        return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
    }

    private String paymentStatusFor(LocalDate dueDate, LocalDate businessDate) {
        return dueDate != null && dueDate.isBefore(businessDate) ? "OVERDUE" : "UNPAID";
    }

    boolean providerAvailable(PayableKioskRow kiosk, Long providerId) {
        var count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM finance_providers
                WHERE company_id = ? AND id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
                  AND (? IS NULL OR unit_id IS NULL OR unit_id = ?)
                  AND (? IS NULL OR business_id IS NULL OR business_id = ?)
                """,
                Integer.class,
                kiosk.companyId(),
                providerId,
                kiosk.unitId(),
                kiosk.unitId(),
                kiosk.businessId(),
                kiosk.businessId());
        return count != null && count > 0;
    }

    List<PublicProvider> availableProviders(PayableKioskRow kiosk) {
        return jdbcTemplate.query(
                """
                SELECT id, name
                FROM finance_providers
                WHERE company_id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
                  AND (? IS NULL OR unit_id IS NULL OR unit_id = ?)
                  AND (? IS NULL OR business_id IS NULL OR business_id = ?)
                ORDER BY name ASC, id ASC
                """,
                (rs, rowNum) -> new PublicProvider(rs.getLong("id"), rs.getString("name")),
                kiosk.companyId(),
                kiosk.unitId(), kiosk.unitId(),
                kiosk.businessId(), kiosk.businessId());
    }

    Optional<EmployeeIdentity> activeEmployeeForUser(PayableKioskRow kiosk, long userId) {
        return jdbcTemplate.query(
                """
                SELECT membership.id AS user_company_id, membership.user_id,
                       TRIM(COALESCE(NULLIF(profile.full_name, ''), NULLIF(user.full_name, ''), user.email)) AS employee_name
                FROM user_companies membership
                JOIN users user ON user.id = membership.user_id
                LEFT JOIN user_profiles profile ON profile.user_id = user.id
                JOIN hr_users employee
                  ON employee.id = membership.id AND employee.company_id = membership.company_id
                LEFT JOIN user_work_profiles work_profile
                  ON work_profile.user_company_id = membership.id
                 AND work_profile.company_id = membership.company_id
                WHERE membership.company_id = ? AND membership.user_id = ?
                  AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                  AND LOWER(COALESCE(employee.status, 'active')) <> 'terminated'
                  AND (
                    (? IS NULL AND ? IS NULL)
                    OR (work_profile.unit_id IS NULL AND work_profile.business_id IS NULL)
                    OR (? IS NOT NULL AND work_profile.business_id = ?)
                    OR (? IS NOT NULL AND work_profile.business_id IS NULL AND work_profile.unit_id = ?)
                    OR (? IS NULL AND ? IS NOT NULL AND work_profile.unit_id = ?)
                  )
                ORDER BY membership.id DESC
                LIMIT 1
                """,
                (rs, rowNum) -> new EmployeeIdentity(
                    rs.getLong("user_company_id"), rs.getLong("user_id"), rs.getString("employee_name")),
                kiosk.companyId(), userId,
                kiosk.unitId(), kiosk.businessId(),
                kiosk.businessId(), kiosk.businessId(),
                kiosk.unitId(), kiosk.unitId(),
                kiosk.businessId(), kiosk.unitId(), kiosk.unitId())
            .stream().findFirst();
    }

    Optional<EmployeeIdentity> activeCompanyEmployeeForUser(long companyId, long userId) {
        return jdbcTemplate.query(
                """
                SELECT membership.id AS user_company_id, membership.user_id,
                       TRIM(COALESCE(NULLIF(profile.full_name, ''), NULLIF(user.full_name, ''), user.email)) AS employee_name
                FROM user_companies membership
                JOIN users user ON user.id = membership.user_id
                LEFT JOIN user_profiles profile ON profile.user_id = user.id
                JOIN hr_users employee
                  ON employee.id = membership.id AND employee.company_id = membership.company_id
                WHERE membership.company_id = ? AND membership.user_id = ?
                  AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                  AND LOWER(COALESCE(employee.status, 'active')) <> 'terminated'
                ORDER BY membership.id DESC
                LIMIT 1
                """,
                (rs, rowNum) -> new EmployeeIdentity(
                    rs.getLong("user_company_id"), rs.getLong("user_id"), rs.getString("employee_name")),
                companyId, userId)
            .stream().findFirst();
    }

    String scopeLabel(PayableKioskRow kiosk) {
        return jdbcTemplate.query(
                """
                SELECT TRIM(CONCAT_WS(' · ', NULLIF(unit_ref.name, ''), NULLIF(business_ref.name, ''))) AS scope_label
                FROM finance_payable_kiosks payable_kiosk
                LEFT JOIN units unit_ref ON unit_ref.id = payable_kiosk.unit_id
                LEFT JOIN businesses business_ref ON business_ref.id = payable_kiosk.business_id
                WHERE payable_kiosk.company_id = ? AND payable_kiosk.id = ?
                LIMIT 1
                """,
                (rs, rowNum) -> rs.getString("scope_label"), kiosk.companyId(), kiosk.id())
            .stream().findFirst().filter(value -> value != null && !value.isBlank())
            .orElse("Toda la compañía");
    }

    List<EmployeePinCandidate> activeEmployeesForKiosk(PayableKioskRow kiosk) {
        return jdbcTemplate.query(
                """
                SELECT credential.identity_id,
                       TRIM(COALESCE(NULLIF(employee.full_name, ''), employee.email, '')) AS employee_name,
                       credential.secret_hash
                FROM kiosk_identity_credentials credential
                JOIN user_companies membership
                  ON membership.id = credential.identity_id
                 AND membership.company_id = credential.company_id
                JOIN hr_users employee
                  ON employee.id = credential.identity_id
                 AND employee.company_id = credential.company_id
                WHERE credential.company_id = ?
                  AND credential.identity_type = 'EMPLOYEE'
                  AND credential.credential_type = 'PIN'
                  AND credential.status = 'ACTIVE'
                  AND credential.secret_hash IS NOT NULL
                  AND credential.secret_hash <> ''
                  AND LOWER(COALESCE(membership.status, 'active')) IN ('active', 'activo')
                  AND LOWER(COALESCE(employee.status, 'active')) <> 'terminated'
                  AND (
                    (? IS NULL AND ? IS NULL)
                    OR (employee.unit_id IS NULL AND employee.business_id IS NULL)
                    OR (? IS NOT NULL AND employee.business_id = ?)
                    OR (? IS NOT NULL AND employee.unit_id = ? AND employee.business_id IS NULL)
                  )
                ORDER BY credential.identity_id ASC
                """,
                (rs, rowNum) -> new EmployeePinCandidate(
                    rs.getLong("identity_id"), rs.getString("employee_name"), rs.getString("secret_hash")),
                kiosk.companyId(),
                kiosk.unitId(), kiosk.businessId(),
                kiosk.businessId(), kiosk.businessId(),
                kiosk.unitId(), kiosk.unitId());
    }

    boolean payableBelongsToProvider(PayableKioskRow kiosk, long providerId, long expenseId) {
        var count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM finance_expenses
                WHERE company_id = ? AND id = ? AND provider_id = ? AND deleted_at IS NULL
                  AND JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.source')) = 'payable-kiosk'
                  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.kioskId')) AS UNSIGNED) = ?
                """,
                Integer.class,
                kiosk.companyId(),
                expenseId,
                providerId,
                kiosk.id());
        return count != null && count > 0;
    }

    Optional<String> providerCenterPayableCurrency(
            long companyId, long providerId, long expenseId) {
        return jdbcTemplate.query(
                """
                SELECT currency_code
                FROM finance_expenses
                WHERE company_id = ? AND id = ? AND provider_id = ? AND deleted_at IS NULL
                  AND JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.source')) = 'provider-center'
                LIMIT 1
                """,
                (rs, rowNum) -> rs.getString("currency_code"),
                companyId, expenseId, providerId).stream().findFirst();
    }

    boolean payableBelongsToEmployee(PayableKioskRow kiosk, long employeeId, long expenseId) {
        var count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM finance_expenses
                WHERE company_id = ? AND id = ? AND deleted_at IS NULL
                  AND JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.source')) = 'payable-kiosk'
                  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.kioskId')) AS UNSIGNED) = ?
                  AND JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.actorType')) = 'EMPLOYEE'
                  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.actorId')) AS UNSIGNED) = ?
                """,
                Integer.class,
                kiosk.companyId(), expenseId, kiosk.id(), employeeId);
        return count != null && count > 0;
    }

}
