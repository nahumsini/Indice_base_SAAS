package com.indice.erp.finance.payablekiosk;

import com.indice.erp.finance.payablekiosk.dto.PublicPayableRequest;
import com.indice.erp.finance.payablekiosk.dto.PublicProviderRegistrationRequest;
import java.math.BigDecimal;
import java.sql.Statement;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
class PayableKioskPublicRepository {

    private final JdbcTemplate jdbcTemplate;

    PayableKioskPublicRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
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

    long insertPayable(PayableKioskRow kiosk, Long providerId, PublicPayableRequest request, String customJson, String metadataJson) {
        var keyHolder = new GeneratedKeyHolder();
        var folio = "CXP-" + LocalDate.now().getYear() + "-" + Long.toString(System.currentTimeMillis()).substring(7);
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement(
                    """
                    INSERT INTO finance_expenses (
                      company_id, unit_id, business_id, folio, provider_id, concept, description,
                      expense_type, subtotal_amount, tax_amount, total_amount, paid_amount,
                      balance_amount, currency_code, expense_date, due_date, requested_by_user_id,
                      status, payment_status, attachment_count, custom_fields_json, metadata_json
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, 'VARIABLE', ?, ?, ?, 0, ?, ?, ?, ?, NULL,
                      'APPROVED', ?, 0, ?, ?)
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
            statement.setString(12, PayableKioskRules.normalizeCurrency(request.currencyCode()));
            statement.setObject(13, LocalDate.now());
            statement.setObject(14, request.dueDate());
            statement.setString(15, paymentStatusFor(request.dueDate()));
            statement.setString(16, customJson);
            statement.setString(17, metadataJson);
            return statement;
        }, keyHolder);
        return keyHolder.getKey() == null ? 0L : keyHolder.getKey().longValue();
    }

    private String paymentStatusFor(LocalDate dueDate) {
        return dueDate != null && dueDate.isBefore(LocalDate.now()) ? "OVERDUE" : "UNPAID";
    }

    boolean providerAvailable(PayableKioskRow kiosk, Long providerId) {
        var count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM finance_providers
                WHERE company_id = ? AND id = ? AND deleted_at IS NULL
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

    boolean payableBelongsToKiosk(PayableKioskRow kiosk, long expenseId) {
        var count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM finance_expenses
                WHERE company_id = ?
                  AND id = ?
                  AND deleted_at IS NULL
                  AND JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.source')) = 'payable-kiosk'
                  AND CAST(JSON_UNQUOTE(JSON_EXTRACT(metadata_json, '$.kioskId')) AS UNSIGNED) = ?
                """,
                Integer.class,
                kiosk.companyId(),
                expenseId,
                kiosk.id());
        return count != null && count > 0;
    }

    List<Map<String, Object>> publicProviders(PayableKioskRow kiosk) {
        return jdbcTemplate.query(
                """
                SELECT id, name
                FROM finance_providers
                WHERE company_id = ? AND deleted_at IS NULL AND status = 'ACTIVE'
                  AND (? IS NULL OR id = ? OR unit_id IS NULL OR unit_id = ?)
                  AND (? IS NULL OR business_id IS NULL OR business_id = ?)
                ORDER BY name ASC
                """,
                (rs, rowNum) -> Map.of("id", rs.getLong("id"), "name", rs.getString("name")),
                kiosk.companyId(),
                kiosk.providerId(),
                kiosk.providerId(),
                kiosk.unitId(),
                kiosk.businessId(),
                kiosk.businessId());
    }
}
