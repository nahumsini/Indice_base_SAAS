package com.indice.erp.kiosk.engine;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Component;

@Component
public class KioskAdapterRegistry {

    private final Map<String, KioskModuleAdapter> adaptersByOwner;
    private final Map<String, KioskCapabilityDescriptor> capabilitiesByVersionedKey;

    public KioskAdapterRegistry(List<KioskModuleAdapter> adapters) {
        var owners = new LinkedHashMap<String, KioskModuleAdapter>();
        var capabilities = new LinkedHashMap<String, KioskCapabilityDescriptor>();

        for (var adapter : adapters) {
            var previousAdapter = owners.putIfAbsent(adapter.ownerModule(), adapter);
            if (previousAdapter != null) {
                throw new IllegalStateException("Duplicate kiosk adapter for owner module: " + adapter.ownerModule());
            }

            for (var capability : adapter.capabilities()) {
                if (!adapter.ownerModule().equals(capability.ownerModule())) {
                    throw new IllegalStateException(
                        "Kiosk capability owner does not match adapter: " + capability.versionedKey());
                }
                var previousCapability = capabilities.putIfAbsent(capability.versionedKey(), capability);
                if (previousCapability != null) {
                    throw new IllegalStateException(
                        "Duplicate kiosk capability: " + capability.versionedKey());
                }
            }
        }

        adaptersByOwner = Map.copyOf(owners);
        capabilitiesByVersionedKey = Map.copyOf(capabilities);
    }

    public Collection<KioskModuleAdapter> adapters() {
        return adaptersByOwner.values();
    }

    public Collection<KioskCapabilityDescriptor> capabilities() {
        return capabilitiesByVersionedKey.values();
    }

    public KioskModuleAdapter requireAdapter(String ownerModule) {
        var adapter = adaptersByOwner.get(ownerModule);
        if (adapter == null) {
            throw new NoSuchElementException("No kiosk adapter is registered for module: " + ownerModule);
        }
        return adapter;
    }

    public KioskCapabilityDescriptor requireCapability(String versionedKey) {
        var capability = capabilitiesByVersionedKey.get(versionedKey);
        if (capability == null) {
            throw new NoSuchElementException("No kiosk capability is registered: " + versionedKey);
        }
        return capability;
    }
}
