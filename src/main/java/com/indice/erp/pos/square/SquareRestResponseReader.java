package com.indice.erp.pos.square;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Component;

@Component
class SquareRestResponseReader {
    private final ObjectMapper mapper;
    private final int limit;
    @Autowired SquareRestResponseReader(ObjectMapper mapper, SquareTransportProperties properties) {
        this(mapper, Math.clamp(properties.getMaxResponseBytes(), 1_024, 1_048_576));
    }
    SquareRestResponseReader(ObjectMapper mapper, int limit) {
        this.mapper = mapper; this.limit = limit;
    }
    JsonNode read(ClientHttpResponse response, boolean mutation) throws IOException {
        int status = response.getStatusCode().value();
        if (status < 200 || status >= 300) throw new SquareGatewayException("Square request failed.",
            !mutation || ambiguous(status), status, null);
        var type = response.getHeaders().getContentType();
        if (type != null && !MediaType.APPLICATION_JSON.isCompatibleWith(type))
            throw new SquareGatewayException("Square returned an unsupported content type.", true, null);
        byte[] bytes = response.getBody().readNBytes(limit + 1);
        if (bytes.length > limit)
            throw new SquareGatewayException("Square response exceeded its safe size.", true, null);
        try { return bytes.length == 0 ? mapper.createObjectNode() : mapper.readTree(bytes); }
        catch (Exception invalid) {
            throw new SquareGatewayException("Square returned invalid JSON.", true, invalid);
        }
    }
    static boolean ambiguous(int status) {
        return status == 408 || status == 409 || status == 425 || status == 429 || status >= 500;
    }
}
