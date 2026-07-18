package com.indice.erp.pos.purchaseorder.kiosk;

import com.indice.erp.kiosk.engine.KioskIdentityCredentialService;
import com.indice.erp.pos.purchaseorder.PurchaseOrderRepository;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class ProcurementSupplierPortalIdentityService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Duration SESSION_LIFETIME = Duration.ofHours(1);

    private final PurchaseOrderRepository repository;
    private final KioskIdentityCredentialService credentials;
    private final BCryptPasswordEncoder passwordEncoder;

    public ProcurementSupplierPortalIdentityService(
            PurchaseOrderRepository repository,
            KioskIdentityCredentialService credentials,
            BCryptPasswordEncoder passwordEncoder) {
        this.repository = repository;
        this.credentials = credentials;
        this.passwordEncoder = passwordEncoder;
    }

    public Map<String, Object> verify(String portalCode, String rawPin) {
        var access = repository.findSupplierPortalAccessByCode(portalCode)
            .orElseThrow(this::invalidAccess);
        return verify(access, rawPin);
    }

    public Map<String, Object> verify(
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            String rawPin) {
        if (!operational(access) || !validPin(access, rawPin)) {
            if (access.expiresAt() != null && !access.expiresAt().isAfter(Instant.now())) {
                repository.markSupplierPortalExpired(access.id());
            }
            throw invalidAccess();
        }

        var token = randomToken();
        var expiresAt = Instant.now().plus(SESSION_LIFETIME);
        if (access.expiresAt() != null && access.expiresAt().isBefore(expiresAt)) {
            expiresAt = access.expiresAt();
        }
        var result = new LinkedHashMap<String, Object>();
        result.put("engine_identity", Map.of("type", "PROVIDER", "id", access.providerId()));
        result.put("kiosk_session_token", token);
        result.put("expires_at", expiresAt.toString());
        return result;
    }

    private boolean operational(PurchaseOrderRepository.SupplierPortalAccessRecord access) {
        return "ACTIVE".equalsIgnoreCase(access.status())
            && (access.expiresAt() == null || access.expiresAt().isAfter(Instant.now()));
    }

    private boolean validPin(
            PurchaseOrderRepository.SupplierPortalAccessRecord access,
            String rawPin) {
        if (rawPin == null || rawPin.isBlank()) {
            return false;
        }
        var value = rawPin.trim();
        var credential = credentials.pinCredential(
            access.companyId(), "PROVIDER", access.providerId()).orElse(null);
        if (credential != null) {
            if (!"ACTIVE".equalsIgnoreCase(credential.status())) {
                return false;
            }
            if (!"LEGACY_MIGRATION".equalsIgnoreCase(credential.origin())) {
                // A deliberately rotated personal PIN is authoritative across every
                // provider kiosk. Legacy hashes must never survive that rotation.
                return credential.secretHash() != null
                    && passwordEncoder.matches(value, credential.secretHash());
            }
            // Migration cannot compare two BCrypt values for raw-PIN equality. Until
            // an explicit personal rotation, preserve the exact per-link credential.
        }
        return access.pinHash() != null
            && !access.pinHash().isBlank()
            && passwordEncoder.matches(value, access.pinHash());
    }

    private SecurityException invalidAccess() {
        return new SecurityException("Supplier portal authentication failed.");
    }

    private String randomToken() {
        var bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
