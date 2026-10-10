package com.indice.erp.maintenance;

import java.util.Map;
import static com.indice.erp.maintenance.MaintenancePolicy.require;

/** SQL identifiers come only from these maps; client input is never concatenated. */
final class MaintenanceSort {
    private MaintenanceSort() {}
    private static String priority(String column) {
        return "FIELD(" + column + ",'LOW','NORMAL','HIGH','CRITICAL')";
    }
    static String clause(String kind, String field, String direction) {
        Map<String, String> columns = switch (kind) {
            case "assets" -> Map.of("name","a.name","type","a.asset_type","location","a.location",
                "criticality",priority("a.criticality"),"status","a.active");
            case "requests" -> Map.of("title","r.title","asset","COALESCE(a.name,r.location)",
                "status","r.status","priority",priority("r.priority"),"created","r.created_at");
            case "orders" -> Map.of("title","o.title","asset","a.name","status","o.status",
                "priority",priority("o.priority"),"assignee","u.full_name","due","o.due_at");
            case "plans" -> Map.of("title","p.title","asset","a.name","recurrence","p.frequency",
                "next","p.next_date","status","p.active");
            default -> throw new IllegalArgumentException();
        };
        require(columns.containsKey(field) && (direction.equals("asc") || direction.equals("desc")),
            "maintenance_sort_invalid");
        String alias = switch (kind) { case "assets" -> "a"; case "requests" -> "r"; case "orders" -> "o"; default -> "p"; };
        return " ORDER BY " + columns.get(field) + (direction.equals("asc") ? " ASC," : " DESC,") + alias + ".id ASC";
    }
}
