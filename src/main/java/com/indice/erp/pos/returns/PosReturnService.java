package com.indice.erp.pos.returns;

import com.indice.erp.finance.reporting.PosReturnAccountingGuard;
import com.indice.erp.pos.*;
import com.indice.erp.pos.payment.PaymentRepository;
import com.indice.erp.pos.shift.ShiftRepository;
import com.indice.erp.pos.status.*;
import com.indice.erp.pos.ticket.TicketRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.pos.returns.PosReturnDtos.*;

@Service
public class PosReturnService {
    private final JdbcTemplate jdbc;
    private final PosReturnRepository returns;
    private final TicketRepository tickets;
    private final PaymentRepository payments;
    private final ShiftRepository shifts;
    private final PosReturnAccountingGuard accounting;
    private final PosReturnInventoryService inventory;
    private final PosReturnPaymentGateway providerPayments;
    @Autowired
    public PosReturnService(JdbcTemplate jdbc, PosReturnRepository returns, TicketRepository tickets,
            PaymentRepository payments, ShiftRepository shifts, PosReturnAccountingGuard accounting,
            PosReturnInventoryService inventory, PosReturnPaymentGateway providerPayments) {
        this.jdbc = jdbc; this.returns = returns; this.tickets = tickets; this.payments = payments;
        this.shifts = shifts; this.accounting = accounting; this.inventory = inventory;
        this.providerPayments = providerPayments;
    }
    public PosReturnService(JdbcTemplate jdbc, PosReturnRepository returns, TicketRepository tickets,
            PaymentRepository payments, ShiftRepository shifts, PosReturnAccountingGuard accounting,
            PosReturnInventoryService inventory) {
        this(jdbc, returns, tickets, payments, shifts, accounting, inventory, null);
    }
    public PosReturnService(PosReturnRepository returns, PosReturnPaymentGateway providerPayments) {
        this(null, returns, null, null, null, null, null, providerPayments);
    }

    public PosReturnSummary find(PosContext context, String reference) {
        return require(context, reference).summary();
    }

    public PosReturnSummary refund(PosContext context, String reference, PosReturnRefundRequest request) {
        var reason = request.reason() == null ? "" : request.reason().trim();
        if (reason.length() < 3) throw PosApiException.badRequest("Refund reason is too short.");
        var sale = requireEligible(context, reference);
        providerPayments.refund(context, sale.providerCode(), sale.intentId(),
            new PosReturnRefundRequest(request.idempotencyKey(), request.amount(), reason));
        return require(context, reference).summary();
    }

    public PosReturnSummary refresh(PosContext context, String reference) {
        var sale = requireEligible(context, reference);
        providerPayments.refresh(context, sale.providerCode(), sale.intentId());
        return require(context, reference).summary();
    }

    PosReturnRecord requireEligible(PosContext context, String reference) {
        var sale = require(context, reference);
        if (!"COMPLETED".equals(sale.ticketStatus()))
            throw PosApiException.conflict("Only completed sales can be refunded.");
        if (sale.intentId() == null)
            throw PosApiException.conflict("This sale has no supported terminal payment.");
        return sale;
    }

    private PosReturnRecord require(PosContext context, String reference) {
        var value = reference == null ? "" : reference.trim().toUpperCase(Locale.ROOT);
        if (value.isEmpty() || value.length() > 80)
            throw PosApiException.badRequest("Sale number is invalid.");
        return returns.find(context, value)
            .orElseThrow(() -> PosApiException.notFound("Sale was not found."));
    }

    @Transactional(isolation=org.springframework.transaction.annotation.Isolation.READ_COMMITTED)
    public Response prepare(PosContext context, PrepareRequest request) {
        requireAdmin(context);
        // Lock before the first consistent read: MySQL repeatable-read snapshots must not precede a competing refund.
        shifts.lockCompanyForOperation(context);
        if (!request.goodsReceived() || request.reason() == null || request.reason().trim().length() < 5
                || request.reason().trim().length() > 500 || request.requestKey() == null
                || !request.requestKey().matches("[A-Za-z0-9_-]{16,100}"))
            throw PosApiException.badRequest("Confirma la devolución total de los productos e indica un motivo válido.");
        var ticket = tickets.findById(context, request.ticketId()).orElseThrow(() -> PosApiException.notFound("Ticket no disponible."));
        jdbc.queryForList("SELECT id FROM pos_cash_registers WHERE company_id=? AND id=? FOR UPDATE",Long.class,context.companyId(),ticket.cashRegisterId());
        if (ticket.salesRecordId() == null) throw PosApiException.conflict("El ticket no está vinculado a una venta.");
        var priorKey = jdbc.queryForList("SELECT id, ticket_id, reason, created_by_user_id FROM pos_returns WHERE company_id = ? AND request_key = ?",
                context.companyId(), request.requestKey());
        if (!priorKey.isEmpty()) {
            var prior = priorKey.getFirst();
            if (((Number) prior.get("ticket_id")).longValue() != request.ticketId()
                    || ((Number) prior.get("created_by_user_id")).longValue() != context.userId()
                    || !request.reason().trim().equals(prior.get("reason")))
                throw PosApiException.conflict("La clave de devolución pertenece a otra solicitud.");
            return returns.get(context, ((Number) prior.get("id")).longValue());
        }
        Long existing = returns.activeForTicket(context.companyId(), ticket.id());
        if (existing != null) return returns.get(context, existing);
        accounting.lockAndRequireUnpostedSale(context.companyId(), ticket.salesRecordId());
        var shift = shifts.findByIdForUpdate(context, ticket.shiftId()).orElseThrow(() -> PosApiException.notFound("Turno no disponible."));
        if (shift.status() != ShiftStatus.OPEN) throw PosApiException.conflict("El ticket tiene un corte cerrado. Requiere una reversión posterior al corte.");
        jdbc.queryForList("SELECT id FROM pos_tickets WHERE company_id = ? AND id = ? FOR UPDATE", context.companyId(), ticket.id());
        ticket = tickets.findById(context, ticket.id()).orElseThrow();
        if (ticket.status() != TicketStatus.COMPLETED) throw PosApiException.conflict("El ticket ya no está completado.");
        var original = payments.findByTicketId(context, ticket.id());
        var originalCurrency = ticket.currencyCode();
        if (original.isEmpty() || original.stream().anyMatch(p -> p.status() != PaymentStatus.CAPTURED
                || !originalCurrency.equals(p.currencyCode()) || p.amount().signum() <= 0))
            throw PosApiException.conflict("Los pagos originales requieren conciliación.");
        var total = original.stream().map(p -> p.amount()).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(ticket.totalAmount()) != 0) throw PosApiException.conflict("Los pagos no coinciden con el total del ticket.");
        if (original.stream().anyMatch(p -> p.paymentMethod() == PaymentMethod.CREDIT || p.paymentMethod() == PaymentMethod.WALLET))
            throw PosApiException.conflict("Este ticket requiere el flujo de reversión de Cartera o de su monedero. No se sustituirá por efectivo ni saldo a favor.");
        var cash = original.stream().filter(p -> p.paymentMethod() == PaymentMethod.CASH).map(p -> p.amount()).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (cash.compareTo(shift.expectedCashAmount()) > 0) throw PosApiException.conflict("No hay efectivo suficiente en el turno para devolver este ticket.");
        jdbc.update("""
            INSERT INTO pos_returns (company_id, ticket_id, shift_id, sales_record_id, request_key, status,
              reason, currency_code, total_amount, created_by_user_id)
            VALUES (?, ?, ?, ?, ?, 'PREPARED', ?, ?, ?, ?)
            """, context.companyId(), ticket.id(), ticket.shiftId(), ticket.salesRecordId(), request.requestKey(),
                request.reason().trim(), ticket.currencyCode(), ticket.totalAmount(), context.userId());
        long id = jdbc.queryForObject("SELECT id FROM pos_returns WHERE company_id = ? AND request_key = ?",
                Long.class, context.companyId(), request.requestKey());
        for (var payment : original) {
            String provider = null;PosOriginalCardPayments.Payment card=null;
            if (payment.paymentMethod() == PaymentMethod.CARD) {
                if (jdbc.queryForObject("""
                    SELECT COUNT(*) FROM pos_returns r JOIN pos_return_payments p
                      ON p.company_id = r.company_id AND p.return_id = r.id
                    WHERE r.company_id = ? AND r.ticket_id = ? AND p.status IN ('FAILED', 'REJECTED')
                    """, Integer.class, context.companyId(), ticket.id()) > 0)
                    throw PosApiException.conflict("El proveedor rechazó un reembolso de este ticket. Requiere conciliación; no se generará otra solicitud.");
                // The current Square checkout contract permits exactly one full card payment.
                if (original.size() != 1) throw PosApiException.conflict("Los pagos mixtos con tarjeta requieren conciliación con el proveedor.");
                requireNoSeparateRefund(context,ticket.id());
                if (payment.amount().stripTrailingZeros().scale() > 2)
                    throw PosApiException.conflict("El importe de tarjeta no puede representarse exactamente en centavos.");
                card=new PosOriginalCardPayments(jdbc).require(context,ticket.id(),payment.amount(),payment.currencyCode());provider=card.paymentId();
            }
            jdbc.update("""
                INSERT INTO pos_return_payments (company_id, return_id, payment_id, payment_method,
                  amount, currency_code, provider_payment_id, provider_request_key,provider_code,provider_intent_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, context.companyId(), id, payment.id(), payment.paymentMethod().name(), payment.amount(),
                    payment.currencyCode(), provider, provider == null ? null : UUID.randomUUID().toString(),card==null?null:card.provider(),card==null?null:card.intentId());
        }
        inventory.snapshot(context, id, ticket);
        return returns.get(context, id);
    }

    public record Inspection(Response returns, java.util.List<PosReturnInventoryService.StockRestoration> inventory) {}
    @Transactional(readOnly=true)
    public Inspection inspect(PosContext context,long ticketId,String reason) {
        requireAdmin(context);var ticket=tickets.findById(context,ticketId).orElseThrow(()->PosApiException.notFound("Ticket not found."));
        if(ticket.salesRecordId()==null||ticket.status()!=TicketStatus.COMPLETED)throw PosApiException.conflict("A completed sale ticket is required.");
        accounting.requireUnpostedSale(context.companyId(),ticket.salesRecordId());var shift=shifts.findById(context,ticket.shiftId()).orElseThrow(()->PosApiException.notFound("Shift not found."));
        if(shift.status()!=ShiftStatus.OPEN)throw PosApiException.conflict("An original open shift is required.");
        var original=payments.findByTicketId(context,ticket.id());
        if(original.isEmpty()||original.stream().anyMatch(p->p.status()!=PaymentStatus.CAPTURED||!ticket.currencyCode().equals(p.currencyCode())||p.amount().signum()<=0||p.paymentMethod()==PaymentMethod.CREDIT||p.paymentMethod()==PaymentMethod.WALLET))throw PosApiException.conflict("Original tender requires financial reconciliation.");
        if(original.stream().map(p->p.amount()).reduce(BigDecimal.ZERO,BigDecimal::add).compareTo(ticket.totalAmount())!=0)throw PosApiException.conflict("Original payments do not equal ticket total.");
        var cash=original.stream().filter(p->p.paymentMethod()==PaymentMethod.CASH).map(p->p.amount()).reduce(BigDecimal.ZERO,BigDecimal::add);
        if(cash.compareTo(shift.expectedCashAmount())>0)throw PosApiException.conflict("Insufficient original shift cash.");
        for(var payment:original)if(payment.paymentMethod()==PaymentMethod.CARD) {
            requireNoSeparateRefund(context,ticket.id());
            if(original.size()!=1||payment.amount().stripTrailingZeros().scale()>2)throw PosApiException.conflict("Mixed or inexact card tender requires financial reconciliation.");
            new PosOriginalCardPayments(jdbc).require(context,ticket.id(),payment.amount(),payment.currencyCode());
            int prior=jdbc.queryForObject("SELECT COUNT(*) FROM pos_terminal_payment_reversals WHERE company_id=? AND pos_ticket_id=?",Integer.class,context.companyId(),ticket.id());
            if(prior>0)throw PosApiException.conflict("An existing provider refund requires reconciliation before returning stock.");
        }
        var tender=original.stream().map(v->new Payment(0,v.id(),v.paymentMethod().name(),v.amount(),v.currencyCode(),"PENDING",null,null)).toList();
        return new Inspection(new Response(0,ticket.id(),ticket.ticketNumber(),shift.id(),"PREPARED",reason,ticket.totalAmount(),ticket.currencyCode(),null,tender),inventory.inspect(context,ticket));
    }
    @Transactional
    public Response cancelPreparation(PosContext context, long id) {
        var current = lock(context, id);
        if ("CANCELLED".equals(current.status())) return current;
        boolean rejectedByProvider = !current.payments().isEmpty() && current.payments().stream()
                .allMatch(p -> List.of("FAILED", "REJECTED").contains(p.status()));
        if (!"PREPARED".equals(current.status()) && !rejectedByProvider)
            throw PosApiException.conflict("El reembolso ya se inició; no se puede cancelar ni volver a cobrar.");
        int cancelled = jdbc.update("""
            UPDATE pos_returns SET status = 'CANCELLED', cancelled_by_user_id = ?, cancelled_at = CURRENT_TIMESTAMP
            WHERE company_id = ? AND id = ? AND status = ?
            """, context.userId(), context.companyId(), id, current.status());
        if (cancelled != 1) throw PosApiException.conflict("La devolución cambió. Consulta su estado antes de cancelar.");
        return returns.get(context, id);
    }

    @Transactional
    public Response confirmManual(PosContext context, long id, ConfirmRequest request) {
        var current = lock(context, id);
        if ("COMPLETED".equals(current.status())) return current;
        requireActive(current);
        if (current.payments().stream().anyMatch(p -> !List.of("CASH", "TRANSFER").contains(p.paymentMethod())))
            throw PosApiException.conflict("La tarjeta debe confirmarse directamente con el proveedor.");
        var evidenceByPayment = new java.util.HashMap<Long, String>();
        for (var payment : current.payments()) {
            String evidence = null;
            if ("CASH".equals(payment.paymentMethod()) && !request.cashReturned())
                throw PosApiException.badRequest("Confirma la entrega del efectivo al cliente.");
            if ("TRANSFER".equals(payment.paymentMethod())) {
                evidence = request.transferReferences() == null ? null : request.transferReferences().get(payment.paymentId());
                if (evidence == null || evidence.trim().length() < 5 || evidence.trim().length() > 200)
                    throw PosApiException.badRequest("Registra el comprobante de devolución por cada transferencia original.");
                evidence = evidence.trim();
            }
            evidenceByPayment.put(payment.id(), evidence);
        }
        for (var payment : current.payments()) {
            jdbc.update("""
                UPDATE pos_return_payments SET status = 'COMPLETED', evidence_reference = ?,
                  confirmed_by_user_id = ?, confirmed_at = CURRENT_TIMESTAMP
                WHERE company_id = ? AND id = ? AND status = 'PENDING'
                """, evidenceByPayment.get(payment.id()), context.userId(), context.companyId(), payment.id());
        }
        return finish(context, current);
    }

    @Transactional
    public SquareCommand beginSquare(PosContext context, long id) {
        var current = beginOriginalCard(context,id,"SQUARE");
        if(current==null)return null;
        return jdbc.queryForObject("""
            SELECT * FROM pos_return_payments WHERE company_id = ? AND return_id = ?
            """, (rs, row) -> new SquareCommand(rs.getString("provider_payment_id"), rs.getString("provider_request_key"),
                rs.getString("provider_refund_id"), rs.getBigDecimal("amount"), rs.getString("currency_code")),
                context.companyId(), id);
    }

    public String cardProvider(PosContext ctx,long id){requireAdmin(ctx);returns.get(ctx,id);return jdbc.queryForObject("SELECT COALESCE(provider_code,'SQUARE') FROM pos_return_payments WHERE company_id=? AND return_id=? AND payment_method='CARD'",String.class,ctx.companyId(),id);}
    public record CardIdentity(String provider,long intentId,String requestKey) {}
    public CardIdentity cardIdentity(PosContext ctx,long id){
        requireAdmin(ctx);var current=returns.get(ctx,id);
        return jdbc.queryForObject("SELECT COALESCE(p.provider_code,'SQUARE'),COALESCE(p.provider_intent_id,(SELECT i.id FROM pos_square_terminal_payment_intents i WHERE i.company_id=p.company_id AND i.pos_ticket_id=? AND BINARY i.square_payment_id=BINARY p.provider_payment_id)),p.provider_request_key FROM pos_return_payments p WHERE p.company_id=? AND p.return_id=? AND p.payment_method='CARD'",(rs,n)->{var intent=(Number)rs.getObject(2);if(intent==null)throw PosApiException.conflict("Original provider intent unavailable.");return new CardIdentity(rs.getString(1),intent.longValue(),rs.getString(3));},current.ticketId(),ctx.companyId(),id);
    }
    public String cardRequestKey(PosContext ctx,long id){requireAdmin(ctx);returns.get(ctx,id);return jdbc.queryForObject("SELECT provider_request_key FROM pos_return_payments WHERE company_id=? AND return_id=? AND payment_method='CARD'",String.class,ctx.companyId(),id);}
    private Response beginOriginalCard(PosContext context,long id,String provider){
        var current=lock(context,id);if("COMPLETED".equals(current.status()))return null;
        if(!provider.equals(cardProvider(context,id)))throw PosApiException.conflict("The original card provider differs.");
        requireActive(current);
        if (current.payments().size() != 1 || !"CARD".equals(current.payments().getFirst().paymentMethod()))
            throw PosApiException.conflict("Esta devolución no corresponde al pago original de tarjeta.");
        var payment = current.payments().getFirst();
        if (List.of("FAILED", "REJECTED").contains(payment.status()))
            throw PosApiException.conflict("El proveedor no completó el reembolso. Requiere conciliación con el proveedor; no se cambiará el medio de pago.");
        int started = jdbc.update("""
            UPDATE pos_returns SET status = 'PROCESSING', started_by_user_id = COALESCE(started_by_user_id, ?),
              started_at = COALESCE(started_at, CURRENT_TIMESTAMP)
            WHERE company_id = ? AND id = ? AND status IN ('PREPARED', 'PROCESSING')
            """, context.userId(), context.companyId(), id);
        if (started != 1) throw PosApiException.conflict("La devolución cambió. Consulta su estado antes de continuar.");
        return current;
    }
    public record PointCommand(long intentId,String requestKey,BigDecimal amount,String reason){}
    @Transactional
    public PointCommand beginPoint(PosContext context,long id){var current=beginOriginalCard(context,id,"MERCADO_PAGO");if(current==null)return null;return jdbc.queryForObject("SELECT provider_intent_id,provider_request_key,amount FROM pos_return_payments WHERE company_id=? AND return_id=? AND payment_method='CARD'",(rs,n)->new PointCommand(rs.getLong(1),rs.getString(2),rs.getBigDecimal(3),current.reason()),context.companyId(),id);}
    @Transactional
    public Response acceptPoint(PosContext context,long id,long requestId,String providerId){var current=lock(context,id);if(!"MERCADO_PAGO".equals(cardProvider(context,id)))throw PosApiException.conflict("The original card provider differs.");jdbc.update("UPDATE pos_return_payments SET provider_refund_request_id=? WHERE company_id=? AND return_id=? AND provider_code='MERCADO_PAGO'",requestId,context.companyId(),id);return acceptSquare(context,id,providerId,"COMPLETED");}
    @Transactional
    public Response rejectPoint(PosContext context,long id,long requestId,String status){var current=lock(context,id);if(!"MERCADO_PAGO".equals(cardProvider(context,id))||!List.of("FAILED","REJECTED","NOT_SUBMITTED").contains(status))throw PosApiException.conflict("Definitive original Point refund rejection required.");int proof=jdbc.queryForObject("SELECT COUNT(*) FROM pos_mercado_pago_refund_requests q JOIN pos_return_payments p ON p.company_id=q.company_id AND p.provider_intent_id=q.intent_id AND BINARY p.provider_request_key=BINARY q.request_key WHERE q.company_id=? AND q.id=? AND q.status=? AND p.return_id=? AND q.baseline_amount=0 AND q.amount=p.amount AND NOT EXISTS (SELECT 1 FROM pos_terminal_payment_reversals v WHERE v.company_id=q.company_id AND v.provider_code='MERCADO_PAGO' AND v.intent_id=q.intent_id)",Integer.class,context.companyId(),requestId,status,id);if(proof!=1)throw PosApiException.conflict("The original Point rejection cannot be verified.");jdbc.update("UPDATE pos_return_payments SET status=?,provider_refund_request_id=? WHERE company_id=? AND return_id=? AND provider_code='MERCADO_PAGO' AND status='PENDING'",status.equals("NOT_SUBMITTED")?"FAILED":status,requestId,context.companyId(),id);return returns.get(context,id);}
    @Transactional(readOnly=true)
    public Inspection inspectExisting(PosContext context,long id){requireAdmin(context);var r=returns.get(context,id);if(!List.of("PREPARED","PROCESSING").contains(r.status()))throw PosApiException.conflict("An active return is required.");var ticket=tickets.findById(context,r.ticketId()).orElseThrow();accounting.requireUnpostedSale(context.companyId(),ticket.salesRecordId());if(shifts.findById(context,r.shiftId()).orElseThrow().status()!=ShiftStatus.OPEN)throw PosApiException.conflict("The original shift must be open.");return new Inspection(r,inventory.inspect(context,ticket));}

    @Transactional
    public Response acceptSquare(PosContext context, long id, String providerId, String status) {
        var current = lock(context, id);
        if ("COMPLETED".equals(current.status())) return current;
        if (!"PROCESSING".equals(current.status())) throw PosApiException.conflict("La devolución no está en proceso.");
        if (!List.of("PENDING", "COMPLETED", "FAILED", "REJECTED").contains(status) || providerId == null || providerId.isBlank())
            throw PosApiException.conflict("El proveedor no devolvió una confirmación verificable.");
        jdbc.update("""
            UPDATE pos_return_payments SET provider_refund_id = ?, status = ?,
              confirmed_by_user_id = CASE WHEN ? = 'COMPLETED' THEN ? ELSE confirmed_by_user_id END,
              confirmed_at = CASE WHEN ? = 'COMPLETED' THEN CURRENT_TIMESTAMP ELSE confirmed_at END
            WHERE company_id = ? AND return_id = ? AND status = 'PENDING'
            """, providerId, status, status, context.userId(), status, context.companyId(), id);
        return returns.get(context, id);
    }

    @Transactional
    public Response completeConfirmedSquare(PosContext context, long id) {
        var current = lock(context, id);
        if ("COMPLETED".equals(current.status())) return current;
        requireActive(current);
        if (current.payments().isEmpty() || current.payments().stream().anyMatch(p -> !"COMPLETED".equals(p.status())))
            return current;
        return finish(context, current);
    }

    private Response finish(PosContext context, Response current) {
        // Atomic finalization claim also protects callers with an already established transaction snapshot.
        int claimed = jdbc.update("""
            UPDATE pos_returns SET status = 'COMPLETED', completed_at = CURRENT_TIMESTAMP, completed_by_user_id = ?
            WHERE company_id = ? AND id = ? AND status IN ('PREPARED', 'PROCESSING')
            """, context.userId(), context.companyId(), current.id());
        if (claimed != 1) throw PosApiException.conflict("La devolución ya cambió. Consulta su estado antes de continuar.");
        var cash = current.payments().stream().filter(p -> "CASH".equals(p.paymentMethod()))
                .map(Payment::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        int changed = jdbc.update("""
            UPDATE pos_shifts SET expected_cash_amount = expected_cash_amount - ?, version = version + 1,
              updated_by_user_id = ? WHERE company_id = ? AND id = ? AND status = 'OPEN' AND expected_cash_amount >= ?
            """, cash, context.userId(), context.companyId(), current.shiftId(), cash);
        if (changed != 1) throw PosApiException.conflict("El turno no puede entregar el efectivo del reembolso.");
        inventory.restore(context, current.id());
        jdbc.update("UPDATE pos_payments SET status = 'VOIDED' WHERE company_id = ? AND ticket_id = ? AND status = 'CAPTURED'", context.companyId(), current.ticketId());
        jdbc.update("UPDATE pos_tickets SET status = 'CANCELLED', updated_by_user_id = ?, version = version + 1 WHERE company_id = ? AND id = ?",
                context.userId(), context.companyId(), current.ticketId());
        jdbc.update("""
            UPDATE sales_records sale JOIN pos_returns r ON r.company_id = sale.company_id AND r.sales_record_id = sale.id
            SET sale.commercial_status = 'cancelled', sale.inventory_status = 'returned',
                sale.inventory_movement_status = 'reversed', sale.updated_by_user_id = ?
            WHERE r.company_id = ? AND r.id = ?
            """, context.userId(), context.companyId(), current.id());
        return returns.get(context, current.id());
    }

    private Response lock(PosContext context, long id) {
        requireAdmin(context);
        shifts.lockCompanyForOperation(context);
        var current = returns.get(context, id);
        if (List.of("COMPLETED", "CANCELLED").contains(current.status())) return current;
        long sale = jdbc.queryForObject("SELECT sales_record_id FROM pos_returns WHERE company_id = ? AND id = ?", Long.class, context.companyId(), id);
        accounting.lockAndRequireUnpostedSale(context.companyId(), sale);
        var shift = shifts.findByIdForUpdate(context, current.shiftId()).orElseThrow(() -> PosApiException.notFound("Turno no disponible."));
        jdbc.queryForList("SELECT id FROM pos_returns WHERE company_id = ? AND id = ? FOR UPDATE", context.companyId(), id);
        current = returns.get(context, id);
        if (!List.of("COMPLETED", "CANCELLED").contains(current.status()) && shift.status() != ShiftStatus.OPEN)
            throw PosApiException.conflict("La devolución requiere el turno original abierto.");
        return current;
    }
    private void requireActive(Response response) {
        if (!List.of("PREPARED", "PROCESSING").contains(response.status())) throw PosApiException.conflict("La preparación fue cancelada.");
    }
    private void requireAdmin(PosContext context) {
        if (!context.canManageOtherUsers()) throw PosApiException.forbidden("La devolución requiere autorización administrativa.");
    }
    private void requireNoSeparateRefund(PosContext context,long ticket) {
        int count=jdbc.queryForObject("SELECT (SELECT COUNT(*) FROM pos_terminal_payment_reversals WHERE company_id=? AND pos_ticket_id=?) + (SELECT COUNT(*) FROM pos_square_refund_requests r JOIN pos_square_terminal_payment_intents i ON i.company_id=r.company_id AND i.id=r.intent_id WHERE i.company_id=? AND i.pos_ticket_id=? AND r.status NOT IN ('FAILED','REJECTED')) + (SELECT COUNT(*) FROM pos_mercado_pago_refund_requests r JOIN pos_mercado_pago_payment_intents i ON i.company_id=r.company_id AND i.id=r.intent_id WHERE i.company_id=? AND i.pos_ticket_id=? AND r.status NOT IN ('FAILED','REJECTED'))",Integer.class,context.companyId(),ticket,context.companyId(),ticket,context.companyId(),ticket);
        if(count>0)throw PosApiException.conflict("Recover or reconcile the separate provider refund before preparing an original-tender return.");
    }
    public record SquareCommand(String paymentId, String requestKey, String refundId, BigDecimal amount, String currency) {}
}
