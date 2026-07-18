package com.indice.erp.kiosk.engine;

import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class KioskAdapterRegistryTest {

    @Test
    void indexesAdaptersAndVersionedCapabilities() {
        var capability = descriptor("tasks.read", "PROCESS_TASKS");
        var adapter = adapter("PROCESS_TASKS", capability);
        var registry = new KioskAdapterRegistry(java.util.List.of(adapter));

        assertThat(registry.requireAdapter("PROCESS_TASKS")).isSameAs(adapter);
        assertThat(registry.requireCapability("tasks.read@1")).isEqualTo(capability);
        assertThat(registry.adapters()).containsExactly(adapter);
        assertThat(registry.capabilities()).containsExactly(capability);
    }

    @Test
    void rejectsDuplicateModuleAdapters() {
        var first = adapter("PROCESS_TASKS", descriptor("tasks.read", "PROCESS_TASKS"));
        var second = adapter("PROCESS_TASKS", descriptor("tasks.create", "PROCESS_TASKS"));

        assertThatThrownBy(() -> new KioskAdapterRegistry(java.util.List.of(first, second)))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("Duplicate kiosk adapter");
    }

    @Test
    void rejectsCapabilitiesOwnedByAnotherModule() {
        var adapter = adapter("PROCESS_TASKS", descriptor("tasks.read", "PETTY_CASH"));

        assertThatThrownBy(() -> new KioskAdapterRegistry(java.util.List.of(adapter)))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("owner does not match");
    }

    @Test
    void reportsMissingRegistrations() {
        var registry = new KioskAdapterRegistry(java.util.List.of());

        assertThatThrownBy(() -> registry.requireAdapter("UNKNOWN"))
            .isInstanceOf(java.util.NoSuchElementException.class);
        assertThatThrownBy(() -> registry.requireCapability("unknown@1"))
            .isInstanceOf(java.util.NoSuchElementException.class);
    }

    private KioskCapabilityDescriptor descriptor(String key, String owner) {
        return new KioskCapabilityDescriptor(
            key,
            1,
            owner,
            KioskOperationPolicy.INFORMATION_ONLY,
            KioskAccessLevel.CONTROLLED,
            false,
            false
        );
    }

    private KioskModuleAdapter adapter(String owner, KioskCapabilityDescriptor... capabilities) {
        return new KioskModuleAdapter() {
            @Override
            public String ownerModule() {
                return owner;
            }

            @Override
            public Set<KioskCapabilityDescriptor> capabilities() {
                return Set.of(capabilities);
            }

            @Override
            public Map<String, Object> bootstrap(KioskExecutionContext context) {
                return Map.of();
            }

            @Override
            public Map<String, Object> execute(KioskExecutionContext context, KioskActionRequest request) {
                return Map.of();
            }
        };
    }
}
