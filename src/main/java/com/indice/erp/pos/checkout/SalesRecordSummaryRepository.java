package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosContext;
import java.sql.Statement;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class SalesRecordSummaryRepository {

    private final JdbcTemplate jdbcTemplate;
    private final com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver timeZoneResolver;

    public SalesRecordSummaryRepository(JdbcTemplate jdbcTemplate, com.indice.erp.finance.shared.FinanceBusinessTimeZoneResolver timeZoneResolver) {
        this.jdbcTemplate = jdbcTemplate;
        this.timeZoneResolver = timeZoneResolver;
    }

    public long insert(PosContext context, SalesRecordSummaryCommand command) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO sales_records
                (company_id, unit_id, business_id, contact_id, sale_number, sale_document_reference, customer_name,
                 seller_name, sale_date, total_amount, subtotal, discount_total, tax_total, margin_total,
                 currency, payment_method, payment_reference, payment_evidence_status, commercial_status,
                 finance_status, inventory_status, delivery_status, commission_status,
                 inventory_movement_status, sale_lines_json, notes, metadata_json, created_by_user_id, source_type)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, ?, ?, 'captured',
                        'completed', 'captured', ?, 'pending', 'pending',
                        ?, ?, ?, ?, ?, 'POS')
                """, Statement.RETURN_GENERATED_KEYS);
            bind(statement, context, command);
            return statement;
        }, keyHolder);
        return keyHolder.getKey().longValue();
    }

    private void bind(java.sql.PreparedStatement statement, PosContext context, SalesRecordSummaryCommand command)
            throws java.sql.SQLException {
        var index = 1;
        statement.setLong(index++, context.companyId());
        statement.setObject(index++, command.unitId());
        statement.setObject(index++, command.businessId());
        statement.setObject(index++, command.contactId());
        statement.setString(index++, command.saleNumber());
        statement.setString(index++, command.saleNumber());
        statement.setString(index++, command.customerName());
        statement.setString(index++, command.sellerName());
        statement.setObject(index++, java.time.LocalDate.now(timeZoneResolver.resolve(context.companyId())));
        statement.setBigDecimal(index++, command.totalAmount());
        statement.setBigDecimal(index++, command.subtotalAmount());
        statement.setBigDecimal(index++, command.discountAmount());
        statement.setBigDecimal(index++, command.taxAmount());
        statement.setString(index++, command.currencyCode());
        statement.setString(index++, command.paymentMethod());
        statement.setString(index++, command.paymentReference());
        statement.setString(index++, command.inventoryDeducted() ? "deducted" : "not_deducted");
        statement.setString(index++, command.inventoryDeducted() ? "generated" : "not_generated");
        statement.setString(index++, command.saleLinesJson());
        statement.setString(index++, command.notes());
        statement.setString(index++, command.metadataJson());
        statement.setLong(index, context.userId());
    }
}
