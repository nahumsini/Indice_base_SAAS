package com.indice.erp.pos.returns;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.ticket.TicketRepository;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import static com.indice.erp.pos.returns.PosReturnDtos.*;

@Repository
public class PosReturnRepository {
    private final JdbcTemplate jdbc;
    private final TicketRepository tickets;
    public PosReturnRepository(JdbcTemplate jdbc, TicketRepository tickets) { this.jdbc = jdbc; this.tickets = tickets; }

    public Response get(PosContext context, long id) {
        var rows = jdbc.query("""
            SELECT r.*, ticket.ticket_number FROM pos_returns r JOIN pos_tickets ticket
              ON ticket.company_id = r.company_id AND ticket.id = r.ticket_id
            WHERE r.company_id = ? AND r.id = ?
            """, (rs, row) -> new Response(rs.getLong("id"), rs.getLong("ticket_id"), rs.getString("ticket_number"),
                rs.getLong("shift_id"), rs.getString("status"), rs.getString("reason"),
                rs.getBigDecimal("total_amount"), rs.getString("currency_code"),
                rs.getTimestamp("completed_at") == null ? null : rs.getTimestamp("completed_at").toInstant(), List.of()),
                context.companyId(), id);
        if (rows.isEmpty()) throw PosApiException.notFound("Devolución no disponible.");
        var result = rows.getFirst();
        tickets.findById(context, result.ticketId()).orElseThrow(() -> PosApiException.notFound("Ticket fuera de tu alcance."));
        var payments = jdbc.query("""
            SELECT * FROM pos_return_payments WHERE company_id = ? AND return_id = ? ORDER BY id
            """, (rs, row) -> new Payment(rs.getLong("id"), rs.getLong("payment_id"), rs.getString("payment_method"),
                rs.getBigDecimal("amount"), rs.getString("currency_code"), rs.getString("status"),
                rs.getString("provider_refund_id"), rs.getString("evidence_reference")), context.companyId(), id);
        return new Response(result.id(), result.ticketId(), result.ticketNumber(), result.shiftId(), result.status(),
                result.reason(), result.totalAmount(), result.currency(), result.completedAt(), payments);
    }

    public Long activeForTicket(long company, long ticket) {
        return jdbc.query("SELECT id FROM pos_returns WHERE company_id = ? AND active_ticket_id = ?",
                (rs, row) -> rs.getLong(1), company, ticket).stream().findFirst().orElse(null);
    }

    public Response activeForTicket(PosContext context, long ticket) {
        tickets.findById(context, ticket).orElseThrow(() -> PosApiException.notFound("Ticket fuera de tu alcance."));
        var id = activeForTicket(context.companyId(), ticket);
        return id == null ? null : get(context, id);
    }

    public List<Candidate> candidates(PosContext context, long shift, String search) {
        if (search == null) search = "";
        if (search.length() > 120) throw PosApiException.badRequest("La búsqueda es demasiado larga.");
        var params = new java.util.ArrayList<Object>();
        params.add(context.companyId()); params.add(shift);
        params.add("%" + search.trim() + "%");
        com.indice.erp.pos.PosSqlSupport.appendScopeParams(params, context.scope());
        return jdbc.query("""
            SELECT ticket.id, ticket.ticket_number, ticket.total_amount, ticket.currency_code, ticket.status
            FROM pos_tickets ticket JOIN pos_shifts shift
              ON shift.company_id = ticket.company_id AND shift.id = ticket.shift_id
            WHERE ticket.company_id = ? AND ticket.shift_id = ? AND ticket.ticket_number LIKE ?
              AND ticket.deleted_at IS NULL AND shift.status = 'OPEN'
              AND """ + com.indice.erp.pos.PosSqlSupport.scopePredicate("ticket", context.scope()) + """
            ORDER BY ticket.id DESC LIMIT 100
            """, (rs, row) -> new Candidate(rs.getLong("id"), rs.getString("ticket_number"),
                    rs.getBigDecimal("total_amount"), rs.getString("currency_code"), rs.getString("status")), params.toArray());
    }

}
