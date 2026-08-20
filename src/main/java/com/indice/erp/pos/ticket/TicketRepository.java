package com.indice.erp.pos.ticket;

import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import com.indice.erp.kpis.currency.KpiMoneyAmount;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class TicketRepository {

    private final JdbcTemplate jdbcTemplate;
    private final TicketMapper mapper;

    public TicketRepository(JdbcTemplate jdbcTemplate, TicketMapper mapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.mapper = mapper;
    }

    public List<TicketRecord> findAll(PosContext context) {
        var params = scopedParams(context);
        return jdbcTemplate.query(ticketSelect() + """
            WHERE ticket.company_id = ? AND ticket.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("ticket", context.scope()) + """
            ORDER BY ticket.completed_at DESC, ticket.id DESC
            LIMIT 300
            """, mapper::mapTicket, params.toArray());
    }

    public List<KpiMoneyAmount> summarizeCompletedSalesBetween(
            PosContext context,
            Instant fromInclusive,
            Instant toExclusive) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        params.add(Timestamp.from(fromInclusive));
        params.add(Timestamp.from(toExclusive));
        PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbcTemplate.query("""
            SELECT SUM(ticket.total_amount) AS amount, ticket.currency_code AS currency
            FROM pos_tickets ticket
            WHERE ticket.company_id = ? AND ticket.deleted_at IS NULL
              AND ticket.status = 'COMPLETED'
              AND ticket.completed_at >= ? AND ticket.completed_at < ?
              AND """ + PosSqlSupport.scopePredicate("ticket", context.scope()) + """
            GROUP BY ticket.currency_code
            ORDER BY ticket.currency_code
            """, (rs, rowNum) -> new KpiMoneyAmount(
                rs.getBigDecimal("amount"),
                rs.getString("currency")
            ), params.toArray());
    }

    public Optional<TicketRecord> findById(PosContext context, long ticketId) {
        var params = scopedParams(context);
        params.add(1, ticketId);
        return jdbcTemplate.query(ticketSelect() + """
            WHERE ticket.company_id = ? AND ticket.id = ? AND ticket.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("ticket", context.scope()),
            mapper::mapTicket, params.toArray()).stream().findFirst();
    }

    public List<TicketItemRecord> findItems(PosContext context, long ticketId) {
        var params = scopedParams(context);
        params.add(1, ticketId);
        return jdbcTemplate.query("""
            SELECT item.*
            FROM pos_ticket_items item
            JOIN pos_tickets ticket ON ticket.id = item.ticket_id
            WHERE item.company_id = ? AND ticket.id = ? AND ticket.deleted_at IS NULL
              AND """ + PosSqlSupport.scopePredicate("ticket", context.scope()) + """
            ORDER BY item.id ASC
            """, mapper::mapItem, params.toArray());
    }

    public boolean existsTicketNumber(PosContext context, String ticketNumber) {
        var count = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM pos_tickets
            WHERE company_id = ? AND ticket_number = ? AND deleted_at IS NULL
            """, Long.class, context.companyId(), ticketNumber);
        return count != null && count > 0;
    }

    public TicketRecord insert(PosContext context, TicketInsertCommand command) {
        var keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            var statement = connection.prepareStatement("""
                INSERT INTO pos_tickets
                (company_id, unit_id, business_id, warehouse_id, cash_register_id, shift_id, customer_id,
                 sales_record_id, ticket_number, status, channel, currency_code, subtotal_amount,
                 discount_amount, tax_amount, total_amount, paid_amount, balance_amount,
                 customer_name_snapshot, customer_tax_id_snapshot, notes, completed_at, created_by_user_id,
                 metadata_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'POS', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?, ?)
                """, Statement.RETURN_GENERATED_KEYS);
            bindTicket(statement, context, command);
            return statement;
        }, keyHolder);
        return findById(context, keyHolder.getKey().longValue()).orElseThrow();
    }

    public List<TicketItemRecord> insertItems(PosContext context, long ticketId, List<TicketItemInsertCommand> items) {
        jdbcTemplate.batchUpdate("""
            INSERT INTO pos_ticket_items
            (company_id, ticket_id, product_id, sku_snapshot, product_name_snapshot, product_type_snapshot,
             quantity, unit_price, discount_amount, tax_amount, line_total_amount, currency_code, metadata_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, items, items.size(), (statement, item) -> {
            statement.setLong(1, context.companyId());
            statement.setLong(2, ticketId);
            statement.setObject(3, item.productId());
            statement.setString(4, item.skuSnapshot());
            statement.setString(5, item.productNameSnapshot());
            statement.setString(6, item.productTypeSnapshot());
            statement.setBigDecimal(7, item.quantity());
            statement.setBigDecimal(8, item.unitPrice());
            statement.setBigDecimal(9, item.discountAmount());
            statement.setBigDecimal(10, item.taxAmount());
            statement.setBigDecimal(11, item.lineTotalAmount());
            statement.setString(12, item.currencyCode());
            statement.setString(13, item.metadataJson());
        });
        return findItems(context, ticketId);
    }

    private String ticketSelect() {
        return "SELECT ticket.* FROM pos_tickets ticket ";
    }

    private ArrayList<Object> scopedParams(PosContext context) {
        var params = new ArrayList<Object>();
        params.add(context.companyId());
        PosSqlSupport.appendScopeParams(params, context.scope());
        return params;
    }

    private void bindTicket(java.sql.PreparedStatement statement, PosContext context, TicketInsertCommand command)
            throws java.sql.SQLException {
        var index = 1;
        statement.setLong(index++, context.companyId());
        statement.setObject(index++, command.unitId());
        statement.setObject(index++, command.businessId());
        statement.setLong(index++, command.warehouseId());
        statement.setLong(index++, command.cashRegisterId());
        statement.setLong(index++, command.shiftId());
        statement.setObject(index++, command.customerId());
        statement.setObject(index++, command.salesRecordId());
        statement.setString(index++, command.ticketNumber());
        statement.setString(index++, command.status().name());
        statement.setString(index++, command.currencyCode());
        statement.setBigDecimal(index++, command.subtotalAmount());
        statement.setBigDecimal(index++, command.discountAmount());
        statement.setBigDecimal(index++, command.taxAmount());
        statement.setBigDecimal(index++, command.totalAmount());
        statement.setBigDecimal(index++, command.paidAmount());
        statement.setBigDecimal(index++, command.balanceAmount());
        statement.setString(index++, command.customerNameSnapshot());
        statement.setString(index++, command.customerTaxIdSnapshot());
        statement.setString(index++, command.notes());
        statement.setLong(index++, command.createdByUserId());
        statement.setString(index, command.metadataJson());
    }
}
