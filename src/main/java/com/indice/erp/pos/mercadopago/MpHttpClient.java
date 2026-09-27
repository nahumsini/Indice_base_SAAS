package com.indice.erp.pos.mercadopago;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.time.Duration;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class MpHttpClient {
    private static final HttpClient CLIENT = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER)
        .connectTimeout(Duration.ofSeconds(10)).build();
    private final MpProperties properties;
    private final ObjectMapper mapper;

    JsonNode request(String method, String path, String token, String body, String key) {
        if (!path.startsWith("/") || path.startsWith("//")) throw new IllegalArgumentException("Invalid provider path.");
        try {
            var request = HttpRequest.newBuilder(URI.create("https://api.mercadopago.com" + path))
                .timeout(Duration.ofSeconds(Math.clamp(properties.getRequestTimeoutSeconds(), 1, 30)))
                .header("Accept", "application/json").header("Content-Type", "application/json");
            if (token != null) request.header("Authorization", "Bearer " + token);
            if (key != null) request.header("X-Idempotency-Key", key);
            request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
            var response = CLIENT.send(request.build(), info -> new MpBoundedBodySubscriber(262144));
            int status = response.statusCode();
            if (status < 200 || status >= 300) throw new MpGatewayException(status, uncertain(status));
            byte[] bytes = response.body();
            return bytes.length == 0 ? mapper.createObjectNode() : mapper.readTree(bytes);
        } catch (MpGatewayException exception) { throw exception; }
        catch (InterruptedException exception) {
            Thread.currentThread().interrupt(); throw new MpGatewayException(0, true);
        } catch (Exception exception) { throw new MpGatewayException(0, true); }
    }
    private boolean uncertain(int status) {
        return status >= 500 || status == 408 || status == 409 || status == 425 || status == 429;
    }
}
