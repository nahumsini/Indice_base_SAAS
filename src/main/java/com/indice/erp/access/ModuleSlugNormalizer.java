package com.indice.erp.access;

import java.util.Locale;

public final class ModuleSlugNormalizer {

    private ModuleSlugNormalizer() {
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

        return switch (normalized) {
            case "home_panel", "panel_inicial", "panelinicial", "configcenter" -> "config_center";
            case "humanresources" -> "human_resources";
            case "caja_chica" -> "petty_cash";
            case "point_of_sale", "punto_de_venta", "punto_venta" -> "pos";
            case "sales" -> "crm";
            case "processes_tasks", "process_tasks", "procesos_tareas" -> "processes";
            case "kpi" -> "kpis";
            default -> normalized;
        };
    }
}
