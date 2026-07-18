package com.indice.erp.sales.publiccatalog;

import com.indice.erp.kiosk.engine.KioskLifecycleHandler;
import com.indice.erp.kiosk.engine.KioskLifecycleTransition;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogAdminAccess.AdminContext;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogAdminAccess.ScopeType;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.StatusRequest;
import org.springframework.stereotype.Component;

/** Functional lifecycle authority for the Sales public catalog. */
@Component
public class SalesPublicCatalogLifecycleHandler implements KioskLifecycleHandler {

    private final SalesPublicCatalogService catalogs;

    public SalesPublicCatalogLifecycleHandler(SalesPublicCatalogService catalogs) {
        this.catalogs = catalogs;
    }

    @Override
    public boolean supports(KioskResolvedDefinition definition) {
        return SalesPublicCatalogService.OWNER_MODULE.equals(definition.ownerModule())
            && SalesPublicCatalogService.KIOSK_TYPE.equals(definition.kioskType());
    }

    @Override
    public void transition(KioskLifecycleTransition transition) {
        var centerContext = new AdminContext(
            transition.actorId(), transition.companyId(), ScopeType.CORPORATE, null, null);
        catalogs.transition(
            centerContext,
            transition.legacyReferenceId(),
            new StatusRequest(transition.target().name(), transition.reason()));
    }
}
