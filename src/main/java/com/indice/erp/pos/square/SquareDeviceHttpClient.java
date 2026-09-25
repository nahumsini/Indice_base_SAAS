package com.indice.erp.pos.square;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
class SquareDeviceHttpClient {
    private final SquareRestClient client;
    SquareDeviceHttpClient(SquareRestClient client) { this.client = client; }
    List<SquareTerminalDtos.SquareLocation> locations(String token) {
        var root = client.get("/v2/locations", token);
        var values = new ArrayList<SquareTerminalDtos.SquareLocation>();
        root.path("locations").forEach(node -> values.add(new SquareTerminalDtos.SquareLocation(
            SquareProviderIdentifiers.text(node.path("id"),128), SquareJsonValues.text(node, "name"),
            SquareJsonValues.text(node, "currency"), SquareJsonValues.text(node, "country"))));
        return List.copyOf(values);
    }
    SquareTerminalGateway.DeviceCode create(String token, String key, String location, String name) {
        var device = new LinkedHashMap<String, Object>();
        device.put("name", name); device.put("product_type", "TERMINAL_API");
        device.put("location_id", location);
        var node = client.post("/v2/devices/codes", token,
            Map.of("idempotency_key", key, "device_code", device)).path("device_code");
        return new SquareTerminalGateway.DeviceCode(SquareProviderIdentifiers.text(node.path("id"),128),
            SquareJsonValues.text(node, "code"), SquareJsonValues.text(node, "status"),
            SquareProviderIdentifiers.text(node.path("device_id"),255),
            SquareJsonValues.instant(SquareJsonValues.text(node, "pair_by")));
    }
}
