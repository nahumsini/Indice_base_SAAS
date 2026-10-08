package com.indice.erp.scheduling;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.billing.lifecycle.CommercialLifecycleAccessService;
import com.indice.erp.billing.lifecycle.CommercialAccessRestrictedException;
import com.indice.erp.kiosk.engine.*;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Map;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** A published alias is an address, not authentication or authority supplied by the visitor. */
@RestController
@RequestMapping("/api/v1/public/scheduling")
public class SchedulingPublicController {
    public record PublicAddress(String token) { }
    private final SchedulingRepository repository;
    private final KioskPayloadProtectionService protection;
    private final KioskRegistryService registry;
    private final KioskRateLimitService limits;
    private final KioskEngineFeatureFlags flags;
    private final ModuleAccessService modules;
    private final CommercialLifecycleAccessService lifecycle;
    public SchedulingPublicController(SchedulingRepository repository,KioskPayloadProtectionService protection,
        KioskRegistryService registry,KioskRateLimitService limits,KioskEngineFeatureFlags flags,
        ModuleAccessService modules,CommercialLifecycleAccessService lifecycle){
        this.repository=repository;this.protection=protection;this.registry=registry;this.limits=limits;
        this.flags=flags;this.modules=modules;this.lifecycle=lifecycle;
    }
    @GetMapping("/{alias}") public ResponseEntity<PublicAddress> resolve(@PathVariable String alias,HttpServletRequest request){
        limits.requireAllowed(KioskRateLimitType.BOOTSTRAP,KioskExecutionContext.publicLink("SCHEDULING",
            "alias-resolution",KioskClientNetworkSignal.from(request),"public-address"),Map.of());
        if(!alias.matches("[a-z0-9][a-z0-9-]{2,79}")||!flags.registryEnabled()||!flags.sessionsEnabled()
            ||!flags.auditEnabled()||!flags.adapterEnabled("SCHEDULING"))throw new KioskUnavailableException();
        var page=repository.publishedPage(alias).orElseThrow(KioskUnavailableException::new);
        if(!modules.companyCanAccess(page.companyId(),"scheduling"))throw new KioskUnavailableException();
        try {lifecycle.requireRead(page.companyId());}catch(CommercialAccessRestrictedException restricted){throw new KioskUnavailableException();}
        String token=protection.reveal(page.protectedToken());
        var definition=registry.resolvePublic("SCHEDULING",token);
        if(!"booking_page".equals(definition.kioskType())||definition.companyId()!=page.companyId()
            ||definition.legacyReferenceId()==null||definition.legacyReferenceId()!=page.id())throw new KioskUnavailableException();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(new PublicAddress(token));
    }
}
