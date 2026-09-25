package com.indice.erp.pos.checkout;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.checkout.dto.PosCheckoutRequest;
import com.indice.erp.pos.checkout.dto.PosCheckoutResponse;
import com.indice.erp.pos.ticket.TicketRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** The retry receipt and all checkout effects commit or roll back together. */
@Service
public class CheckoutExecutionService {
    private final CheckoutService checkout;
    private final TicketRepository tickets;
    private final JdbcTemplate jdbc;
    private final ObjectMapper json;

    public CheckoutExecutionService(CheckoutService checkout, TicketRepository tickets,
            JdbcTemplate jdbc, ObjectMapper json) {
        this.checkout = checkout;
        this.tickets = tickets;
        this.jdbc = jdbc;
        this.json = json;
    }

    @Transactional
    public PosCheckoutResponse execute(PosContext context, String requestKey, PosCheckoutRequest request) {
        // Compatibility for existing API clients; the first-party UI always sends a stable key.
        if (requestKey == null) return checkout.checkout(context, request);
        if (!requestKey.matches("[A-Za-z0-9_-]{16,100}")) {
            throw PosApiException.badRequest("La clave de reintento de la venta no es válida.");
        }
        String fingerprint = fingerprint(request);
        // Use the same company -> shift lock order as returns, closing and accounting.
        jdbc.queryForList("SELECT id FROM companies WHERE id = ? FOR UPDATE", context.companyId());
        jdbc.update("""
            INSERT INTO pos_checkout_requests (company_id, request_key, user_id, request_hash)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE request_key = request_key
            """, context.companyId(), requestKey, context.userId(), fingerprint);
        var receipt = jdbc.queryForObject("""
            SELECT user_id, request_hash, response_json FROM pos_checkout_requests
            WHERE company_id = ? AND request_key = ? FOR UPDATE
            """, (rs, row) -> new Receipt(rs.getLong("user_id"), rs.getString("request_hash"),
                    rs.getString("response_json")), context.companyId(), requestKey);
        if (receipt.userId() != context.userId() || !fingerprint.equals(receipt.fingerprint())) {
            throw PosApiException.conflict("Este intento de cobro ya pertenece a otra operación. Recupera la venta original antes de volver a cobrar.");
        }
        try {
            if (receipt.response() != null) {
                var response = json.readValue(receipt.response(), PosCheckoutResponse.class);
                // Recheck today's scope, even if the original checkout was authorized.
                tickets.findById(context, response.ticket().id())
                        .orElseThrow(() -> PosApiException.notFound("El ticket no está disponible en tu alcance."));
                return response;
            }
            var response = checkout.checkout(context, request);
            jdbc.update("""
                UPDATE pos_checkout_requests SET response_json = CAST(? AS JSON)
                WHERE company_id = ? AND request_key = ?
                """, json.writeValueAsString(response), context.companyId(), requestKey);
            return response;
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("No se pudo conservar el comprobante del cobro.", exception);
        }
    }

    @Transactional(readOnly = true)
    public PosCheckoutResponse recover(PosContext context, String requestKey) {
        String response = jdbc.query("""
            SELECT response_json FROM pos_checkout_requests
            WHERE company_id = ? AND request_key = ? AND user_id = ? AND response_json IS NOT NULL
            """, (rs, row) -> rs.getString(1), context.companyId(), requestKey, context.userId())
                .stream().findFirst().orElseThrow(() -> PosApiException.notFound("El cobro todavía no tiene un ticket confirmado. Reintenta la operación original."));
        try {
            var saved = json.readValue(response, PosCheckoutResponse.class);
            tickets.findById(context, saved.ticket().id())
                    .orElseThrow(() -> PosApiException.notFound("El ticket no está disponible en tu alcance."));
            return saved;
        } catch (JsonProcessingException exception) {
            throw new IllegalStateException("No se pudo recuperar el comprobante del cobro.", exception);
        }
    }

    private String fingerprint(PosCheckoutRequest request) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(json.writeValueAsString(request).getBytes(StandardCharsets.UTF_8)));
        } catch (JsonProcessingException | NoSuchAlgorithmException exception) {
            throw new IllegalStateException("No se pudo identificar el intento de cobro.", exception);
        }
    }

    private record Receipt(long userId, String fingerprint, String response) {}
}
