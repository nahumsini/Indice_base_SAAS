package com.indice.erp.kiosk.engine;

import java.security.SecureRandom;
import java.util.LinkedHashMap;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Root-only administration of provider identities published by one Provider Center. */
@Service
public class ProviderCenterAccessAdminService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private final JdbcTemplate jdbcTemplate;
    private final BCryptPasswordEncoder passwordEncoder;
    private final KioskIdentityCredentialService credentials;

    public ProviderCenterAccessAdminService(
            JdbcTemplate jdbcTemplate,
            BCryptPasswordEncoder passwordEncoder,
            KioskIdentityCredentialService credentials) {
        this.jdbcTemplate = jdbcTemplate;
        this.passwordEncoder = passwordEncoder;
        this.credentials = credentials;
    }

    public Map<String, Object> list(long companyId, long multiKioskId) {
        requireProviderCenter(companyId, multiKioskId, false);
        var items = jdbcTemplate.query(
            """
                SELECT provider.id, provider.name, provider.email, provider.status,
                       provider.unit_id, COALESCE(unit_ref.name, '') AS unit_name,
                       provider.business_id, COALESCE(business_ref.name, '') AS business_name,
                       credential.status AS credential_status,
                       credential.credential_origin,
                       credential.created_at AS credential_created_at,
                       credential.rotated_at AS credential_rotated_at
                FROM finance_providers provider
                LEFT JOIN units unit_ref
                  ON unit_ref.id = provider.unit_id AND unit_ref.company_id = provider.company_id
                LEFT JOIN businesses business_ref
                  ON business_ref.id = provider.business_id AND business_ref.company_id = provider.company_id
                LEFT JOIN kiosk_identity_credentials credential
                  ON credential.company_id = provider.company_id
                 AND credential.identity_type = 'PROVIDER'
                 AND credential.identity_id = provider.id
                 AND credential.credential_type = 'PIN'
                WHERE provider.company_id = ? AND provider.deleted_at IS NULL
                ORDER BY provider.status = 'ACTIVE' DESC, provider.name, provider.id
                """,
            (rs, rowNum) -> {
                var row = new LinkedHashMap<String, Object>();
                var activeProvider = "ACTIVE".equals(rs.getString("status"));
                var pinActive = "ACTIVE".equals(rs.getString("credential_status"))
                    && KioskIdentityCredentialService.PROVIDER_CENTER_ORIGIN.equals(
                        rs.getString("credential_origin"));
                var unitId = rs.getObject("unit_id", Long.class);
                var businessId = rs.getObject("business_id", Long.class);
                row.put("provider_id", rs.getLong("id"));
                row.put("name", rs.getString("name"));
                row.put("email", value(rs.getString("email")));
                row.put("provider_status", rs.getString("status"));
                row.put("unit_id", unitId);
                row.put("unit_name", value(rs.getString("unit_name")));
                row.put("business_id", businessId);
                row.put("business_name", value(rs.getString("business_name")));
                row.put("scope_ready", unitId != null && businessId != null);
                row.put("pin_ready", activeProvider && pinActive);
                row.put("credential_status", value(rs.getString("credential_status")));
                var createdAt = rs.getTimestamp("credential_created_at");
                var rotatedAt = rs.getTimestamp("credential_rotated_at");
                row.put("credential_created_at", createdAt == null ? "" : createdAt.toInstant().toString());
                row.put("credential_rotated_at", rotatedAt == null ? "" : rotatedAt.toInstant().toString());
                return Collections.unmodifiableMap(row);
            }, companyId);
        return Map.of("items", items);
    }

    @Transactional
    public Map<String, Object> issueOrRotate(
            long companyId, long multiKioskId, long providerId, long actorUserId) {
        requireProviderCenter(companyId, multiKioskId, true);
        var provider = requireActiveProviderForUpdate(companyId, providerId);
        if (provider.unitId() == null || provider.businessId() == null) {
            throw new IllegalArgumentException(
                "Asigna unidad y negocio al proveedor antes de generar su NIP.");
        }
        var pin = uniquePin(companyId, provider);
        credentials.rotateProviderCenterPin(companyId, providerId, passwordEncoder.encode(pin));
        audit(companyId, multiKioskId, providerId, actorUserId, "PROVIDER_CENTER_PIN_ROTATED");
        return Map.of(
            "provider_id", providerId,
            "provider_name", provider.name(),
            "pin", pin,
            "pin_ready", true,
            "shown_once", true);
    }

    @Transactional
    public Map<String, Object> revoke(
            long companyId, long multiKioskId, long providerId, long actorUserId) {
        requireProviderCenter(companyId, multiKioskId, false);
        requireProvider(companyId, providerId);
        credentials.revokeProviderCenterPin(companyId, providerId);
        audit(companyId, multiKioskId, providerId, actorUserId, "PROVIDER_CENTER_PIN_REVOKED");
        return Map.of("provider_id", providerId, "pin_ready", false, "success", true);
    }

    private ProviderAdminRow requireActiveProviderForUpdate(long companyId, long providerId) {
        return jdbcTemplate.query(
            """
                SELECT id, name, unit_id, business_id
                FROM finance_providers
                WHERE company_id = ? AND id = ? AND status = 'ACTIVE' AND deleted_at IS NULL
                LIMIT 1 FOR UPDATE
                """,
            (rs, rowNum) -> new ProviderAdminRow(
                rs.getLong("id"), rs.getString("name"),
                rs.getObject("unit_id", Long.class), rs.getObject("business_id", Long.class)),
            companyId, providerId).stream().findFirst()
            .orElseThrow(() -> new IllegalArgumentException(
                "Activa el proveedor antes de generar su NIP."));
    }

    private void requireProvider(long companyId, long providerId) {
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM finance_providers WHERE company_id = ? AND id = ? AND deleted_at IS NULL",
            Integer.class, companyId, providerId);
        if (count == null || count != 1) throw new KioskUnavailableException();
    }

    private void requireProviderCenter(long companyId, long multiKioskId, boolean requireActive) {
        var statuses = requireActive ? "('ACTIVE')" : "('ACTIVE', 'DISABLED')";
        var count = jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM multi_kiosk_definitions WHERE company_id = ? AND id = ? "
                + "AND audience_type = 'PROVIDER' AND status IN " + statuses,
            Integer.class, companyId, multiKioskId);
        if (count == null || count != 1) throw new KioskUnavailableException();
    }

    private String uniquePin(long companyId, ProviderAdminRow provider) {
        var competingHashes = jdbcTemplate.query(
            """
                SELECT credential.secret_hash
                FROM finance_providers other_provider
                INNER JOIN kiosk_identity_credentials credential
                  ON credential.company_id = other_provider.company_id
                 AND credential.identity_type = 'PROVIDER'
                 AND credential.identity_id = other_provider.id
                 AND credential.credential_type = 'PIN'
                 AND credential.status = 'ACTIVE'
                 AND credential.credential_origin = 'PROVIDER_CENTER_ADMIN'
                WHERE other_provider.company_id = ? AND other_provider.id <> ?
                  AND other_provider.status = 'ACTIVE' AND other_provider.deleted_at IS NULL
                  AND LOWER(TRIM(other_provider.name)) = LOWER(TRIM(?))
                """,
            (rs, rowNum) -> rs.getString("secret_hash"),
            companyId, provider.id(), provider.name());
        for (var attempt = 0; attempt < 100; attempt++) {
            var pin = String.format("%06d", RANDOM.nextInt(1_000_000));
            if (competingHashes.stream().noneMatch(hash -> passwordEncoder.matches(pin, hash))) {
                return pin;
            }
        }
        throw new IllegalStateException("No fue posible generar un NIP único. Intenta nuevamente.");
    }

    private void audit(
            long companyId, long multiKioskId, long providerId,
            long actorUserId, String eventType) {
        jdbcTemplate.update(
            """
                INSERT INTO multi_kiosk_audit_events (
                    event_id, multi_kiosk_id, historical_multi_kiosk_id, company_id,
                    event_type, outcome, actor_type, actor_id, snapshot_json, retain_until
                ) VALUES (?, ?, ?, ?, ?, 'SUCCEEDED', 'USER', ?,
                          JSON_OBJECT('provider_id', ?, 'access_population', 'PROVIDER_NAME_PIN'),
                          TIMESTAMPADD(DAY, 365, CURRENT_TIMESTAMP))
                """,
            UUID.randomUUID().toString(), multiKioskId, multiKioskId, companyId,
            eventType, actorUserId, providerId);
    }

    private String value(String value) {
        return value == null ? "" : value;
    }

    private record ProviderAdminRow(long id, String name, Long unitId, Long businessId) {
    }
}
