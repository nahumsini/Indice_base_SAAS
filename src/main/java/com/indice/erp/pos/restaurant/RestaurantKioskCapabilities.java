package com.indice.erp.pos.restaurant;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskCapabilityDescriptor;
import com.indice.erp.kiosk.engine.KioskOperationPolicy;
import com.indice.erp.pos.kiosk.PointOfSaleKioskCapabilities;
import java.util.List;
import java.util.Map;
import java.util.Set;

public final class RestaurantKioskCapabilities {

    public static final String WAITER_TYPE = "waiter_station";
    public static final String CENTER_TYPE = "table_order_center";
    public static final String KITCHEN_TYPE = "kitchen_display";
    public static final String IDENTITY_VERIFY = "pos.restaurant.identity.verify";
    public static final String WORKSPACE_READ = "pos.restaurant.workspace.read";
    public static final String ORDER_OPEN = "pos.restaurant.order.open";
    public static final String ITEM_ADD = "pos.restaurant.item.add";
    public static final String ROUND_SEND = "pos.restaurant.round.send";
    public static final String ITEM_STATUS = "pos.restaurant.item.status";
    public static final String CHECK_REQUEST = "pos.restaurant.check.request";
    public static final String FLOOR_PLAN_UPDATE = "pos.restaurant.floor-plan.update";

    private static final Set<KioskCapabilityDescriptor> DESCRIPTORS = Set.of(
        descriptor(IDENTITY_VERIFY, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, false, true,
            Map.of("stablePinScope", "KIOSK")),
        descriptor(WORKSPACE_READ, KioskOperationPolicy.INFORMATION_ONLY, KioskAccessLevel.CONTROLLED, false, true, Map.of()),
        descriptor(ORDER_OPEN, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, true, true, Map.of()),
        descriptor(ITEM_ADD, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, true, true, Map.of()),
        descriptor(ROUND_SEND, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, true, true, Map.of()),
        descriptor(ITEM_STATUS, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, true, true, Map.of()),
        descriptor(CHECK_REQUEST, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, true, true, Map.of()),
        descriptor(FLOOR_PLAN_UPDATE, KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED, true, true,
            Map.of(
                "type", "object",
                "required", List.of("tables"),
                "properties", Map.of("tables", Map.of(
                    "type", "array", "minItems", 1, "maxItems", 100
                ))
            ))
    );

    private RestaurantKioskCapabilities() {
    }

    public static Set<KioskCapabilityDescriptor> descriptors() {
        return DESCRIPTORS;
    }

    private static KioskCapabilityDescriptor descriptor(
            String key, KioskOperationPolicy policy, KioskAccessLevel access, boolean mutation,
            boolean sensitive, Map<String, Object> input) {
        return new KioskCapabilityDescriptor(
            key, 1, PointOfSaleKioskCapabilities.OWNER_MODULE, policy, access, mutation, sensitive,
            input, Map.of("type", "object"), Map.of());
    }
}
