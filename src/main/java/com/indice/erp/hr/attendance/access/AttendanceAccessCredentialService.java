package com.indice.erp.hr.attendance.access;

import com.indice.erp.hr.attendance.kiosk.AttendanceKioskTokenService;
import com.indice.erp.hr.attendance.models.AccessMethodRow;
import java.security.SecureRandom;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import static com.indice.erp.hr.shared.HrPayloadUtils.isBlank;
import static com.indice.erp.hr.shared.HrPayloadUtils.nullable;


@Service
class AttendanceAccessCredentialService {

    private static final int GENERATED_PIN_BOUND = 100_000;
    private static final int GENERATED_PIN_MAX_ATTEMPTS = 200;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final AttendanceAccessRepository repository;
    private final AttendanceKioskTokenService kioskTokenService;
    private final BCryptPasswordEncoder passwordEncoder;

    AttendanceAccessCredentialService(
        AttendanceAccessRepository repository,
        AttendanceKioskTokenService kioskTokenService,
        BCryptPasswordEncoder passwordEncoder
    ) {
        this.repository = repository;
        this.kioskTokenService = kioskTokenService;
        this.passwordEncoder = passwordEncoder;
    }

    String normalizeEnabledAuthMethod(String value) {
        var normalized = value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
        return switch (normalized) {
            case "", "manual", "manual_override" -> "manual_override";
            case "pin" -> "pin";
            case "badge", "badge_code" -> "badge";
            case "password" -> "password";
            case "facial_recognition", "face", "face_id" -> "facial_recognition";
            default -> throw new IllegalArgumentException("Unsupported auth_method.");
        };
    }

    String normalizePublicKioskAuthMethod(String value, List<String> allowedMethods) {
        var normalized = normalizeEnabledAuthMethod(value);
        if (!allowedMethods.contains(normalized)) {
            throw new IllegalArgumentException("Public kiosk auth_method must be pin.");
        }
        return normalized;
    }

    String generateUniquePin(long companyId, Long excludedMethodId) {
        for (var attempt = 0; attempt < GENERATED_PIN_MAX_ATTEMPTS; attempt++) {
            var pin = String.format("%05d", SECURE_RANDOM.nextInt(GENERATED_PIN_BOUND));
            var credentialRef = kioskTokenService.pinCredentialReference(companyId, pin);
            if (!repository.pinCredentialReferenceExists(companyId, credentialRef, excludedMethodId)) {
                return pin;
            }
        }
        throw new IllegalStateException("Unable to generate a unique user PIN.");
    }

    String normalizePinCode(String rawPin) {
        var pin = nullable(rawPin);
        if (pin == null || !pin.matches("\\d{5}")) {
            throw new IllegalArgumentException("PIN must be 5 numbers.");
        }
        return pin;
    }

    String pinCredentialReference(long companyId, String pin) {
        return kioskTokenService.pinCredentialReference(companyId, pin);
    }

    String encodeSecret(String secretRaw) {
        return passwordEncoder.encode(secretRaw);
    }

    String resolveSecretHash(AccessMethodRow existing, String methodType, String secretRaw) {
        if (!"pin".equals(methodType) && !"password".equals(methodType)) {
            return null;
        }
        if (secretRaw != null) {
            return passwordEncoder.encode(secretRaw);
        }
        if (existing != null && existing.secretHash() != null) {
            return existing.secretHash();
        }
        throw new IllegalArgumentException("secret is required for pin and password methods.");
    }

    boolean credentialMatches(String rawCredential, String secretHash) {
        return rawCredential != null && secretHash != null && passwordEncoder.matches(rawCredential, secretHash);
    }

    boolean matchesPin(long companyId, String credentialPayload, AccessMethodRow method) {
        var credentialRef = kioskTokenService.pinCredentialReference(companyId, credentialPayload);
        return method.secretHash() != null
            && !method.secretHash().isBlank()
            && (method.credentialRef() == null || method.credentialRef().isBlank() || Objects.equals(method.credentialRef(), credentialRef))
            && passwordEncoder.matches(credentialPayload, method.secretHash());
    }
}
