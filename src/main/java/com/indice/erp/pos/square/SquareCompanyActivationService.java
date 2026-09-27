package com.indice.erp.pos.square;

import com.indice.erp.platformadmin.*;
import java.time.Clock;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SquareCompanyActivationService {
    private final PlatformAdminAccessService access; private final PlatformAuditService audit;
    private final SquareActivationStore store; private final SquareLiveActivationPolicy policy; private final Clock clock;
    public SquareCompanyActivationService(PlatformAdminAccessService access, PlatformAuditService audit,
            SquareActivationStore store, SquareLiveActivationPolicy policy, Clock clock) {
        this.access=access; this.audit=audit; this.store=store; this.policy=policy; this.clock=clock;
    }
    @Transactional(readOnly=true)
    public SquareActivationDtos.Status status(long actor,long company) { requireRoot(actor); return view(require(company)); }
    @Transactional
    public SquareActivationDtos.Status change(long actor,long company,SquareActivationDtos.Change request) {
        requireRoot(actor);
        if (request==null || request.expectedVersion()==null) throw new IllegalArgumentException("Expected version is required.");
        var state=SquareActivationState.parse(request.state()); var reason=reason(request.reason()); var current=require(company);
        if (current.version()!=request.expectedVersion()) throw new IllegalStateException("Square activation changed concurrently.");
        if (state.allowsCharges() && (!"CONNECTED".equals(current.connectionState()) || current.merchantId()==null
                || current.merchantId().isBlank() || !current.eligibleLocation()))
            throw new IllegalStateException("A connected Square merchant with an eligible linked location is required.");
        boolean replay=current.state()==state && java.util.Objects.equals(current.reason(),reason);
        var updated=replay?current:store.change(current,state,actor,reason,request.expectedVersion(),clock.instant());
        audit.record(actor,"SQUARE_LIVE_ACTIVATION_CHANGED","COMPANY",String.valueOf(company),company,"SUCCESS",
            Map.of("previousState",current.activationState(),"state",state.name(),"environment","production",
                "reason",reason,"previousVersion",current.version(),"version",updated.version(),"replay",replay));
        return view(updated);
    }
    private SquareActivationStore.Record require(long company) { return store.find(company,"production")
        .orElseThrow(() -> new NoSuchElementException("Production Square connection was not found.")); }
    private void requireRoot(long actor) { var authority=access.require(actor,"PLATFORM_ACCOUNTS_WRITE");
        if (!"PLATFORM_ROOT".equals(authority.role())) throw new PlatformAdminForbiddenException("Platform Root access is required."); }
    private String reason(String value) { var clean=value==null?"":value.trim();
        if (clean.length()<8 || clean.length()>500) throw new IllegalArgumentException("Activation reason must contain 8 to 500 characters."); return clean; }
    private SquareActivationDtos.Status view(SquareActivationStore.Record value) { return new SquareActivationDtos.Status(
        value.companyId(),value.environment(),value.connectionState(),value.activationState(),value.changedAt(),value.activatedAt(),
        value.suspendedAt(),value.reason(),value.version(),policy.allows(value)); }
}
