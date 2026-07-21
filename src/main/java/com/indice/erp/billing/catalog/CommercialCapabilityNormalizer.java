package com.indice.erp.billing.catalog;

import java.util.Locale;
import java.util.Map;

public final class CommercialCapabilityNormalizer {

    private static final Map<String, String> ALIASES = Map.ofEntries(
        Map.entry("home_panel", "config_center"),
        Map.entry("panel_inicial", "config_center"),
        Map.entry("panelinicial", "config_center"),
        Map.entry("configcenter", "config_center"),
        Map.entry("humanresources", "human_resources"),
        Map.entry("caja_chica", "petty_cash"),
        Map.entry("point_of_sale", "pos"),
        Map.entry("punto_de_venta", "pos"),
        Map.entry("punto_venta", "pos"),
        Map.entry("crm", "sales"),
        Map.entry("cartera", "receivables"),
        Map.entry("accounts_receivable", "receivables"),
        Map.entry("accounts_receivables", "receivables"),
        Map.entry("process_tasks", "processes"),
        Map.entry("processes_tasks", "processes"),
        Map.entry("procesos_tareas", "processes"),
        Map.entry("kpi", "kpis")
    );

    private CommercialCapabilityNormalizer() {
    }

    public static String normalize(String rawValue) {
        if (rawValue == null) {
            return "";
        }
        var normalized = rawValue
            .trim()
            .toLowerCase(Locale.ROOT)
            .replace('-', '_')
            .replace(' ', '_');
        return ALIASES.getOrDefault(normalized, normalized);
    }

    public static Map<String, String> compatibilityAliases() {
        return ALIASES;
    }
}
