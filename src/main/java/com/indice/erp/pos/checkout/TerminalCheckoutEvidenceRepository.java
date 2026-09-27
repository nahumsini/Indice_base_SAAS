package com.indice.erp.pos.checkout;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.PosSqlSupport;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class TerminalCheckoutEvidenceRepository {
    private final JdbcTemplate jdbc;
    TerminalCheckoutEvidenceRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }
    TerminalCheckoutEvidence requireApproved(PosContext context, String provider, long intentId) {
        var table = switch (provider) {
            case "SQUARE" -> "pos_square_terminal_payment_intents";
            case "MERCADO_PAGO" -> "pos_mercado_pago_payment_intents";
            default -> throw PosApiException.badRequest("Unsupported terminal provider.");
        };
        var projection = "SQUARE".equals(provider)
            ? "square_payment_id payment_id, checkout_request_json checkout_json"
            : "payment_id, checkout_json";
        return jdbc.query("SELECT cash_register_id, shift_id, created_by_user_id, created_by_role, "
            + "scope_type, scope_unit_id, scope_business_id, amount, currency_code, " + projection
            + " FROM " + table + " WHERE company_id = ? AND id = ? AND status = 'APPROVED' "
            + "AND pos_ticket_id IS NULL FOR UPDATE", (rs, row) -> new TerminalCheckoutEvidence(
                rs.getLong("cash_register_id"), rs.getLong("shift_id"), rs.getLong("created_by_user_id"),
                rs.getString("created_by_role"), rs.getString("scope_type"),
                PosSqlSupport.nullableLong(rs, "scope_unit_id"), PosSqlSupport.nullableLong(rs, "scope_business_id"),
                rs.getBigDecimal("amount"), rs.getString("currency_code"), rs.getString("payment_id"),
                rs.getString("checkout_json")), context.companyId(), intentId).stream().findFirst()
            .orElseThrow(() -> PosApiException.conflict("Approved terminal attempt is required for checkout."));
    }
}
