package com.indice.erp.pos.mercadopago;
import com.indice.erp.platformadmin.*;
import java.time.Clock;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service @RequiredArgsConstructor public class MpCompanyActivationService {
    private final PlatformAdminAccessService access;
    private final PlatformAuditService audit;
    private final MpConnectionStore connections;
    private final MpCompanyActivationStore store;
    private final MpActivationChangePolicy changes;
    private final MpLiveActivationPolicy global;
    private final Clock clock;
    @Transactional(readOnly = true) public MpActivationDtos.Status status(long actor, long company) {
        requireRoot(actor); return view(requireConnection(company));
    }
    @Transactional
    public MpActivationDtos.Status change(long actor, long company, MpActivationDtos.Change request) {
        requireRoot(actor);
        var connection = connections.find(company, "production", true)
            .orElseThrow(() -> new NoSuchElementException("Production Mercado Pago connection was not found."));
        var change = changes.require(request, connection);
        boolean replay = connection.activation().parsedState() == change.state()
            && Objects.equals(connection.activation().reason(), change.reason());
        var activation = replay ? connection.activation()
            : store.change(connection, change.state(), actor, change.reason(), change.expectedVersion(), clock.instant());
        audit.record(actor, "MP_LIVE_ACTIVATION_CHANGED", "COMPANY", String.valueOf(company), company, "SUCCESS",
            Map.of("previousState", connection.activation().state(), "state", change.state().name(),
                "environment", connection.environment(), "reason", change.reason(), "previousVersion", change.expectedVersion(),
                "version", activation.version(), "replay", replay));
        return view(connection, activation);
    }
    private void requireRoot(long actor) {
        var authority = access.require(actor, "PLATFORM_ACCOUNTS_WRITE");
        if (!"PLATFORM_ROOT".equals(authority.role())) throw new PlatformAdminForbiddenException("Platform Root access is required.");
    }
    private MpConnection requireConnection(long company) { return connections.find(company, "production")
        .orElseThrow(() -> new NoSuchElementException("Production Mercado Pago connection was not found.")); }
    private MpActivationDtos.Status view(MpConnection connection) { return view(connection, connection.activation()); }
    private MpActivationDtos.Status view(MpConnection c, MpCompanyActivation a) { return new MpActivationDtos.Status(
        c.companyId(), c.environment(), c.state(), a.state(), a.changedAt(), a.activatedAt(), a.suspendedAt(),
        a.reason(), a.version(), "CONNECTED".equals(c.state()) && global.allows(c.environment(), a.state())); }
}
