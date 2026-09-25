package com.indice.erp.pos.mercadopago;
import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import java.sql.Timestamp;
import java.time.Clock;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
@Repository
@RequiredArgsConstructor
class MpTerminalVerificationLeaseStore {
    private final MpTerminalStore terminals;
    private final JdbcTemplate jdbc;
    private final Clock clock;
    @Transactional public MpTerminalVerificationClaim claim(PosContext context, MpTerminal initial) {
        var current = terminals.require(context, initial.id(), true);
        MpTerminalVerificationProof.from(initial).requireSame(current);
        try { MpTerminalEligibility.requireReady(current, current.cashRegisterId());
            return new MpTerminalVerificationClaim(current, null); }
        catch (PosApiException ignored) { }
        if (active(current)) throw PosApiException.serviceUnavailable("Point terminal verification is already running.");
        String lease = UUID.randomUUID().toString();
        jdbc.update("UPDATE pos_mercado_pago_terminals SET verification_lease_id=?,verification_lease_until=? "
            + "WHERE company_id=? AND id=?", lease, Timestamp.from(clock.instant().plusSeconds(90)),
            context.companyId(), current.id());
        return new MpTerminalVerificationClaim(current, lease);
    }
    @Transactional public void complete(MpTerminalVerificationClaim claim) { clear(claim, null); }
    @Transactional public void failed(MpTerminalVerificationClaim claim) { clear(claim, "PROVIDER_UNAVAILABLE"); }
    private void clear(MpTerminalVerificationClaim claim, String failure) {
        String state = failure == null ? "verification_status" : "IF(verification_status='UNAVAILABLE','UNAVAILABLE','STALE')";
        jdbc.update("UPDATE pos_mercado_pago_terminals SET verification_lease_id=NULL,verification_lease_until=NULL,"
            + "verification_status=" + state + ",verification_failure_code=COALESCE(?,verification_failure_code),"
            + "version=version+IF(? IS NULL,0,1) WHERE company_id=? AND id=? AND verification_lease_id=?",
            failure, failure, claim.terminal().companyId(), claim.terminal().id(), claim.leaseId());
    }
    private boolean active(MpTerminal terminal) {
        return terminal.verificationLeaseId() != null && terminal.verificationLeaseUntil() != null
            && terminal.verificationLeaseUntil().isAfter(clock.instant());
    }
}
