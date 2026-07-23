package com.indice.erp.auth;

import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class BasicModuleCatalog {

    public static final String CORE_MODULE = "config_center";

    private static final List<String> SELECTABLE_MODULES = List.of(
        "human_resources",
        "expenses",
        "petty_cash",
        "pos",
        "crm",
        "processes",
        "kpis"
    );

    private static final Map<String, String> ALIASES = Map.of(
        "sales", "crm",
        "finance", "expenses"
    );

    private BasicModuleCatalog() {
    }

    public static List<String> selectableModules() {
        return SELECTABLE_MODULES;
    }

    public static List<String> launchOfferModules() {
        var modules = new ArrayList<String>();
        modules.add(CORE_MODULE);
        modules.addAll(SELECTABLE_MODULES);
        return List.copyOf(modules);
    }

    public static List<String> paidEntitlementModules(Collection<String> selectedModules) {
        var modules = new ArrayList<String>();
        modules.add(CORE_MODULE);
        modules.addAll(normalizeSelectedModules(selectedModules));
        return List.copyOf(modules);
    }

    public static List<String> defaultSelection(int count) {
        return SELECTABLE_MODULES.stream()
            .limit(Math.max(0, Math.min(count, SELECTABLE_MODULES.size())))
            .toList();
    }

    public static List<String> normalizeSelectedModules(Collection<String> values) {
        if (values == null) {
            return List.of();
        }
        var modules = new LinkedHashMap<String, Boolean>();
        for (var value : values) {
            var normalized = normalize(value);
            if (!normalized.isBlank() && SELECTABLE_MODULES.contains(normalized)) {
                modules.put(normalized, Boolean.TRUE);
            }
        }
        return List.copyOf(modules.keySet());
    }

    public static String normalize(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase();
        return ALIASES.getOrDefault(normalized, normalized);
    }
}
