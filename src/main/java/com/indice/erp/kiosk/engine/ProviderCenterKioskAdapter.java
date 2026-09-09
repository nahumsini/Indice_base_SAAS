package com.indice.erp.kiosk.engine;

import com.indice.erp.finance.payablekiosk.PayableKioskService;
import com.indice.erp.pos.purchaseorder.kiosk.ProcurementProviderCenterService;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/** Read-only coordinator; source data stays projected by Procurement and Finance owners. */
@Component
public class ProviderCenterKioskAdapter implements KioskModuleAdapter {

    private final ProcurementProviderCenterService procurement;
    private final PayableKioskService payables;
    private final ProviderCenterAccessPolicy providerAccess;

    public ProviderCenterKioskAdapter(
            ProcurementProviderCenterService procurement,
            PayableKioskService payables,
            ProviderCenterAccessPolicy providerAccess) {
        this.procurement = procurement;
        this.payables = payables;
        this.providerAccess = providerAccess;
    }

    @Override
    public String ownerModule() {
        return ProviderCenterCapabilities.OWNER_MODULE;
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities() {
        return ProviderCenterCapabilities.descriptors();
    }

    @Override
    public boolean supportsProviderCenter(KioskResolvedDefinition definition) {
        return ProviderCenterCapabilities.KIOSK_TYPE.equals(definition.kioskType());
    }

    @Override
    public boolean providerCenterAccessAllows(
            KioskResolvedDefinition definition, long providerId) {
        return supportsProviderCenter(definition)
            && providerAccess.hasAccess(definition.companyId(), providerId);
    }

    @Override
    public Map<String, Object> bootstrap(KioskExecutionContext context) {
        throw new UnsupportedOperationException("Provider tracking requires a Provider Center session.");
    }

    @Override
    public Map<String, Object> providerBootstrap(KioskExecutionContext context) {
        var providerId = requireContext(context);
        return tracking(context.definition().companyId(), providerId);
    }

    @Override
    public KioskAuthorization authorize(
            KioskExecutionContext context, KioskActionRequest request) {
        if (!ProviderCenterCapabilities.TRACKING_READ.equals(request.capabilityKey())) {
            return KioskAuthorization.deny("Unsupported Provider Center capability.");
        }
        try {
            var providerId = requireContext(context);
            return providerCenterAccessAllows(context.definition(), providerId)
                ? KioskAuthorization.allow()
                : KioskAuthorization.deny("Provider tracking access is unavailable.");
        } catch (RuntimeException invalid) {
            return KioskAuthorization.deny("Provider Center session is required.");
        }
    }

    @Override
    public Map<String, Object> execute(
            KioskExecutionContext context, KioskActionRequest request) {
        throw new UnsupportedOperationException("Provider tracking requires a Provider Center session.");
    }

    @Override
    public Map<String, Object> executeProvider(
            KioskExecutionContext context, KioskActionRequest request) {
        var providerId = requireContext(context);
        if (!ProviderCenterCapabilities.TRACKING_READ.equals(request.capabilityKey())) {
            throw new IllegalArgumentException("Unsupported Provider Center capability.");
        }
        return tracking(context.definition().companyId(), providerId);
    }

    private Map<String, Object> tracking(long companyId, long providerId) {
        var result = new LinkedHashMap<String, Object>();
        result.putAll(procurement.tracking(companyId, providerId));
        result.putAll(payables.providerCenterTracking(companyId, providerId));
        result.put("privacy", Map.of(
            "internal_accounts_visible", false,
            "internal_notes_visible", false,
            "approver_identities_visible", false));
        return Map.copyOf(result);
    }

    private long requireContext(KioskExecutionContext context) {
        if (context == null || context.definition() == null || context.session() == null
                || !ownerModule().equals(context.ownerModule())
                || !KioskExecutionChannels.PROVIDER_MULTI_KIOSK.equals(context.channel())
                || !"PROVIDER".equals(context.session().identityType())
                || context.session().companyId() != context.definition().companyId()
                || context.session().kioskDefinitionId() != context.definition().id()
                || !supportsProviderCenter(context.definition())) {
            throw new SecurityException("Provider Center session is required.");
        }
        return context.session().identityId();
    }
}
