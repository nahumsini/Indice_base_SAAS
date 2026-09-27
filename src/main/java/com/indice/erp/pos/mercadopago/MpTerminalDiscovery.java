package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class MpTerminalDiscovery {
    private final MpHttpClient client;
    private final ObjectMapper mapper;

    List<MpProviderDtos.Terminal> list(String token) {
        var found = new ArrayList<MpProviderDtos.Terminal>();
        for (int offset = 0; offset < 1000; offset += 50) {
            var page = client.request("GET", "/terminals/v1/list?limit=50&offset=" + offset, token, null, null);
            var rows = page.path("data").path("terminals");
            if (!rows.isArray() || rows.size() > 50) throw new MpGatewayException(0, true);
            rows.forEach(row -> found.add(parse(row)));
            if (rows.size() < 50 || offset + 50 >= page.path("paging").path("total").asInt(Integer.MAX_VALUE)) return found;
        }
        throw new MpGatewayException(0, true);
    }
    MpProviderDtos.Terminal configure(String token, String id) {
        if (!supported(id)) throw new MpGatewayException(0, false);
        var body = mapper.createObjectNode();
        body.putArray("terminals").addObject().put("id", id).put("operating_mode", "PDV");
        var response = client.request("PATCH", "/terminals/v1/setup", token, body.toString(), null);
        var rows = response.path("terminals");
        if (!rows.isArray() || rows.size() != 1 || !id.equals(rows.get(0).path("id").asText())
            || !"PDV".equals(rows.get(0).path("operating_mode").asText())) throw new MpGatewayException(0, true);
        return parse(rows.get(0));
    }
    static boolean supported(String id) { return id != null && id.matches("(NEWLAND_N950|PAX_A910)__[A-Za-z0-9]{1,80}"); }
    private MpProviderDtos.Terminal parse(JsonNode node) {
        try { return mapper.treeToValue(node, MpProviderDtos.Terminal.class); }
        catch (Exception exception) { throw new MpGatewayException(0, true); }
    }
}
