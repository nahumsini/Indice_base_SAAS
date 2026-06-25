package com.indice.erp.pos.payment;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import java.util.ArrayList;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class PaymentRepository {

    private final JdbcTemplate jdbcTemplate;
    private final PaymentMapper mapper;

    public PaymentRepository(JdbcTemplate jdbcTemplate, PaymentMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    public List<PaymentRecord> findByTicketId(PosContext context, long ticketId) {
        var params = scopedParams(context);
        params.add(1, ticketId);
        return jdbcTemplate.query("""
            SELECT payment.*
            FROM pos_payments payment
            JOIN pos_tickets ticket ON ticket.id = payment.ticket_id
            WHERE payment.company_id = ? AND ticket.id = ? AND ticket.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("ticket", context.scope()) + """
            ORDER BY payment.id ASC
            """, mapper::mapRow, params.toArray());
    }

    public List<PaymentRecord> insertAll(PosContext context, long ticketId, List<PaymentInsertCommand> payments) {
        jdbcTemplate.batchUpdate("""
            INSERT INTO pos_payments
            (company_id, ticket_id, shift_id, cash_register_id, payment_method, payment_account_id,
             amount, currency_code, reference, status, created_by_user_id, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, payments, payments.size(), (statement, payment) -> {
            statement.setLong(1, context.companyId());
            statement.setLong(2, ticketId);
            statement.setLong(3, payment.shiftId());
            statement.setLong(4, payment.cashRegisterId());
            statement.setString(5, payment.paymentMethod().name());
            statement.setObject(6, payment.paymentAccountId());
            statement.setBigDecimal(7, payment.amount());
            statement.setString(8, payment.currencyCode());
            statement.setString(9, payment.reference());
            statement.setString(10, payment.status().name());
            statement.setLong(11, payment.createdByUserId());
            statement.setString(12, payment.metadataJson());
        });
        return findByTicketId(context, ticketId);
    }

    private ArrayList<Object> scopedParams(PosContext context) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        PosSqlSupport.appendScopeParams(params, context.scope());
        return params;
    }
}
