package com.indice.erp.face;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Component
public class FaceVerificationClient {

    private final FaceVerificationProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public FaceVerificationClient(FaceVerificationProperties properties, ObjectMapper objectMapper) {
        this.properties = properties;
        this.restClient = RestClient.builder()
            .baseUrl(properties.getServiceBaseUrl())
            .build();
        this.objectMapper = objectMapper;
    }

    public boolean isEnabled() {
        return properties.isEnabled();
    }

    public EnrollResponse enroll(List<CaptureReference> captures) {
        try {
            return restClient.post()
                .uri("/internal/face/enroll")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new EnrollRequest(captures))
                .retrieve()
                .body(EnrollResponse.class);
        } catch (RestClientResponseException ex) {
            throw translateHttpFailure("enrollment", ex);
        } catch (ResourceAccessException ex) {
            throw new FaceVerificationIntegrationException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Face verification service is unavailable.",
                ex
            );
        }
    }

    public VerifyResponse verify(List<CaptureReference> captures, List<List<Double>> enrolledEmbeddings) {
        try {
            return restClient.post()
                .uri("/internal/face/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .body(new VerifyRequest(captures, enrolledEmbeddings))
                .retrieve()
                .body(VerifyResponse.class);
        } catch (RestClientResponseException ex) {
            throw translateHttpFailure("verification", ex);
        } catch (ResourceAccessException ex) {
            throw new FaceVerificationIntegrationException(
                HttpStatus.SERVICE_UNAVAILABLE,
                "Face verification service is unavailable.",
                ex
            );
        }
    }

    private FaceVerificationIntegrationException translateHttpFailure(String action, RestClientResponseException ex) {
        var message = extractMessage(ex);
        var status = ex.getStatusCode();

        if (status.is4xxClientError()) {
            return new FaceVerificationIntegrationException(HttpStatus.BAD_REQUEST, message, ex);
        }

        if ("Internal Server Error".equalsIgnoreCase(message) || message.isBlank()) {
            message = "Face verification service failed during " + action + ".";
        }

        return new FaceVerificationIntegrationException(HttpStatus.BAD_GATEWAY, message, ex);
    }

    private String extractMessage(RestClientResponseException ex) {
        var body = ex.getResponseBodyAsString();
        if (body != null && !body.isBlank()) {
            try {
                JsonNode payload = objectMapper.readTree(body);
                var detail = textNode(payload, "detail");
                if (detail != null && !detail.isBlank()) {
                    return detail;
                }

                var message = textNode(payload, "message");
                if (message != null && !message.isBlank()) {
                    return message;
                }

                if (payload.has("error") && payload.get("error").isObject()) {
                    var nestedMessage = textNode(payload.get("error"), "message");
                    if (nestedMessage != null && !nestedMessage.isBlank()) {
                        return nestedMessage;
                    }
                }
            } catch (Exception ignored) {
                // Fall through to the status text.
            }
        }

        return ex.getStatusText() == null || ex.getStatusText().isBlank()
            ? "Face verification service request failed."
            : ex.getStatusText();
    }

    private String textNode(JsonNode payload, String fieldName) {
        var node = payload.get(fieldName);
        return node != null && node.isTextual() ? node.asText() : null;
    }

    public record CaptureReference(
        String step,
        @JsonProperty("download_url") String downloadUrl
    ) {
    }

    public record EnrollRequest(
        List<CaptureReference> captures
    ) {
    }

    public record EnrollResponse(
        String status,
        List<List<Double>> embeddings,
        @JsonProperty("failure_reason") String failureReason
    ) {
    }

    public record VerifyRequest(
        List<CaptureReference> captures,
        @JsonProperty("enrolled_embeddings") List<List<Double>> enrolledEmbeddings
    ) {
    }

    public record VerifyResponse(
        String status,
        boolean matched,
        @JsonProperty("match_score") Double matchScore,
        @JsonProperty("liveness_passed") boolean livenessPassed,
        @JsonProperty("failure_reason") String failureReason
    ) {
    }
}
