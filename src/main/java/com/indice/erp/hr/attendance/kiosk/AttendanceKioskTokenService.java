package com.indice.erp.hr.attendance.kiosk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.Objects;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.nullable;
import static com.indice.erp.hr.shared.HrPayloadUtils.parseLong;
import static com.indice.erp.hr.shared.HrPayloadUtils.safe;


@Service
public class AttendanceKioskTokenService {

    private final ObjectMapper objectMapper;
    private final String tokenSecret;
    private final int identificationTokenTtlSeconds;

    public AttendanceKioskTokenService(
        ObjectMapper objectMapper,
        @Value("${app.hr.kiosk.identification-token-secret:indice-kiosk-identification-secret}") String tokenSecret,
        @Value("${app.hr.kiosk.identification-token-ttl-seconds:120}") int identificationTokenTtlSeconds
    ) {
        this.objectMapper = objectMapper;
        this.tokenSecret = tokenSecret == null || tokenSecret.isBlank()
            ? "indice-kiosk-identification-secret"
            : tokenSecret;
        this.identificationTokenTtlSeconds = Math.max(identificationTokenTtlSeconds, 30);
    }

    public long nextIdentificationExpiryEpochSeconds() {
        return Instant.now().getEpochSecond() + identificationTokenTtlSeconds;
    }

    public String createIdentificationToken(
        String deviceToken,
        long userCompanyId,
        String authMethod,
        long expiresAtEpochSeconds
    ) {
        var payload = Map.of(
            "device_token", deviceToken,
            "user_company_id", userCompanyId,
            "auth_method", authMethod,
            "expires_at_epoch", expiresAtEpochSeconds
        );
        try {
            var encodedPayload = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(objectMapper.writeValueAsBytes(payload));
            return encodedPayload + "." + sign(encodedPayload);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to create kiosk identification token.", ex);
        }
    }

    public PublicKioskIdentificationToken verifyIdentificationToken(String deviceToken, String identificationToken) {
        if (identificationToken == null || identificationToken.isBlank()) {
            throw new IllegalArgumentException("identification_token is required.");
        }

        var segments = identificationToken.split("\\.");
        if (segments.length != 2) {
            throw new IllegalArgumentException("identification_token is invalid.");
        }

        var expectedSignature = sign(segments[0]);
        if (!MessageDigest.isEqual(
            expectedSignature.getBytes(StandardCharsets.UTF_8),
            segments[1].getBytes(StandardCharsets.UTF_8)
        )) {
            throw new IllegalArgumentException("identification_token is invalid.");
        }

        try {
            var payloadJson = Base64.getUrlDecoder().decode(segments[0]);
            var payload = objectMapper.readValue(payloadJson, new TypeReference<Map<String, Object>>() {
            });
            var tokenDevice = safe(String.valueOf(payload.getOrDefault("device_token", "")));
            var authMethod = safe(String.valueOf(payload.getOrDefault("auth_method", "")));
            var userCompanyId = parseLong(payload, "user_company_id");
            var expiresAtEpoch = parseLong(payload, "expires_at_epoch");

            if (userCompanyId == null || userCompanyId <= 0 || expiresAtEpoch == null || expiresAtEpoch <= 0) {
                throw new IllegalArgumentException("identification_token is invalid.");
            }
            if (!Objects.equals(tokenDevice, deviceToken)) {
                throw new IllegalArgumentException("identification_token does not belong to this kiosk.");
            }
            if (Instant.now().getEpochSecond() > expiresAtEpoch) {
                throw new IllegalArgumentException("identification_token has expired.");
            }

            return new PublicKioskIdentificationToken(
                userCompanyId,
                normalizePublicKioskAuthMethod(authMethod),
                expiresAtEpoch
            );
        } catch (IllegalArgumentException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalArgumentException("identification_token is invalid.");
        }
    }

    public String pinCredentialReference(long companyId, String rawPin) {
        var normalizedPin = nullable(rawPin);
        if (normalizedPin == null) {
            throw new IllegalArgumentException("PIN is required.");
        }

        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(tokenSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            var payload = companyId + ":" + normalizedPin;
            var digest = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
            return "pin:v1:" + digest;
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to prepare PIN credential reference.", ex);
        }
    }

    private String sign(String encodedPayload) {
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(tokenSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(mac.doFinal(encodedPayload.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to sign kiosk identification token.", ex);
        }
    }

    private String normalizePublicKioskAuthMethod(String value) {
        var normalized = safe(value).toLowerCase();
        return switch (normalized) {
            case "pin" -> normalized;
            default -> throw new IllegalArgumentException("Unsupported public kiosk auth method.");
        };
    }
}
