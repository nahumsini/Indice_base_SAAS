package com.indice.erp.pos.kiosk;

import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskAuthorization;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskModuleAdapter;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskValidationResult;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/** Single extensible adapter for all kiosk types owned by Point of Sale. */
@Component
public class PointOfSaleKioskAdapter implements KioskModuleAdapter {

    private final Map<String, PointOfSaleKioskExperience> experiencesByType;
    private final Map<String, PointOfSaleKioskExperience> experiencesByCapability;
    private final Set<KioskCapabilityDescriptor> capabilities;

    public PointOfSaleKioskAdapter(List<PointOfSaleKioskExperience> experiences) {
        var byType = new LinkedHashMap<String, PointOfSaleKioskExperience>();
        var byCapability = new LinkedHashMap<String, PointOfSaleKioskExperience>();
        var allCapabilities = new LinkedHashSet<KioskCapabilityDescriptor>();
        for (var experience : experiences) {
            var previousType = byType.putIfAbsent(experience.kioskType(), experience);
            if (previousType != null) {
                throw new IllegalStateException("Duplicate POS kiosk experience: " + experience.kioskType());
            }
            for (var capability : experience.capabilities()) {
                if (!PointOfSaleKioskCapabilities.OWNER_MODULE.equals(capability.ownerModule())) {
                    throw new IllegalStateException("POS kiosk capability has another owner: "
                        + capability.versionedKey());
                }
                var previousCapability = byCapability.putIfAbsent(capability.versionedKey(), experience);
                if (previousCapability != null) {
                    throw new IllegalStateException("Duplicate POS kiosk capability: "
                        + capability.versionedKey());
                }
                allCapabilities.add(capability);
            }
        }
        // Autocobro currently reuses the proven self-service catalog runtime.
        // Keep a single capability owner while exposing it under both POS kiosk types.
        var selfService = byType.get(PointOfSaleKioskCapabilities.SELF_SERVICE_TYPE);
        if (selfService != null) {
            byType.putIfAbsent(PointOfSaleKioskCapabilities.SELF_CHECKOUT_TYPE, selfService);
        }
        experiencesByType = Map.copyOf(byType);
        experiencesByCapability = Map.copyOf(byCapability);
        capabilities = Set.copyOf(allCapabilities);
    }

    @Override
    public String ownerModule() {
        return PointOfSaleKioskCapabilities.OWNER_MODULE;
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities() {
        return capabilities;
    }

    @Override
    public Set<KioskCapabilityDescriptor> capabilities(KioskResolvedDefinition definition) {
        var experience = definition == null ? null : experiencesByType.get(definition.kioskType());
        return experience == null ? Set.of() : experience.capabilities();
    }

    @Override
    public Map<String, Object> bootstrap(KioskExecutionContext context) {
        return requireExperience(context).bootstrap(context);
    }

    @Override
    public KioskAuthorization authorize(KioskExecutionContext context, KioskActionRequest request) {
        return requireExperience(context, request).authorize(context, request);
    }

    @Override
    public KioskValidationResult validate(KioskExecutionContext context, KioskActionRequest request) {
        return requireExperience(context, request).validate(context, request);
    }

    @Override
    public Map<String, Object> execute(KioskExecutionContext context, KioskActionRequest request) {
        return requireExperience(context, request).execute(context, request);
    }

    private PointOfSaleKioskExperience requireExperience(KioskExecutionContext context) {
        if (!ownerModule().equals(context.ownerModule()) || context.definition() == null) {
            throw new IllegalArgumentException("Resolved Point of Sale kiosk context is required.");
        }
        var experience = experiencesByType.get(context.definition().kioskType());
        if (experience == null) {
            throw new IllegalArgumentException("Unsupported Point of Sale kiosk type.");
        }
        return experience;
    }

    private PointOfSaleKioskExperience requireExperience(
            KioskExecutionContext context,
            KioskActionRequest request) {
        var experience = requireExperience(context);
        var registered = experiencesByCapability.get(request.versionedCapabilityKey());
        if (registered == null || registered != experience || !experience.supports(request.capabilityKey())) {
            throw new SecurityException("Kiosk capability is not available for this Point of Sale kiosk.");
        }
        return experience;
    }
}
