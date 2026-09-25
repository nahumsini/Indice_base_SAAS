package com.indice.erp.pos.square;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

@Component
class SquareRestClient {
    private final RestClient client;
    private final SquareRestResponseReader responses;
    @Autowired SquareRestClient(SquareTerminalProperties terminal, SquareTransportProperties properties,
            RestClient.Builder builder, SquareRestResponseReader responses) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(Math.clamp(properties.getConnectTimeoutSeconds(), 1, 30)));
        factory.setReadTimeout(Duration.ofSeconds(Math.clamp(properties.getRequestTimeoutSeconds(), 1, 60)));
        this.client = builder.baseUrl(terminal.apiBaseUrl()).requestFactory(factory)
            .defaultHeader("Square-Version", terminal.getApiVersion()).build();
        this.responses = responses;
    }
    SquareRestClient(RestClient client, ObjectMapper mapper, int limit) {
        this(client, new SquareRestResponseReader(mapper, limit));
    }
    private SquareRestClient(RestClient client, SquareRestResponseReader responses) {
        this.client = client; this.responses = responses;
    }
    JsonNode get(String path, String token, Object... values) { return execute(false,
        () -> client.get().uri(path, values).headers(h -> bearer(h, token))
            .exchange((q, r) -> responses.read(r, false)));
    }
    JsonNode post(String path, String token, Object body, Object... values) { return execute(true,
        () -> client.post().uri(path, values).headers(h -> bearer(h, token)).contentType(MediaType.APPLICATION_JSON)
            .body(body).exchange((q, r) -> responses.read(r, true)));
    }
    private JsonNode execute(boolean mutation, java.util.function.Supplier<JsonNode> request) {
        try { return request.get(); }
        catch (SquareGatewayException known) { throw known; }
        catch (ResourceAccessException unavailable) { throw new SquareGatewayException("Square is unavailable.", true, unavailable); }
        catch (RuntimeException failure) { throw new SquareGatewayException("Square request could not be verified.", true, failure); }
    }
    static boolean ambiguous(int status) { return SquareRestResponseReader.ambiguous(status); }
    private void bearer(org.springframework.http.HttpHeaders headers, String token) {
        if (token != null && !token.isBlank()) headers.setBearerAuth(token);
    }
}
