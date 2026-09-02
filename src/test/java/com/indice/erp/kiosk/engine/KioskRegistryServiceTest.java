package com.indice.erp.kiosk.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class KioskRegistryServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private KioskPayloadProtectionService payloadProtection;

    private KioskRegistryService service;

    @BeforeEach
    void setUp() {
        service = new KioskRegistryService(
            jdbcTemplate, new ObjectMapper(), payloadProtection);
    }

    @Test
    void resolvesByHashWithoutSendingRawTokenToPersistence() throws Exception {
        var persistedHash = new AtomicReference<String>();
        stubDefinition(KioskDefinitionStatus.ACTIVE, null, persistedHash);

        var definition = service.resolvePublic("PROCESS_TASKS", "raw-public-token");

        assertThat(definition.id()).isEqualTo(17L);
        assertThat(persistedHash.get()).hasSize(64).doesNotContain("raw-public-token");
    }

    @Test
    void expiredDefinitionIsMaterializedRevokesSessionsAndLooksMissingPublicly() throws Exception {
        stubDefinition(KioskDefinitionStatus.ACTIVE, Instant.now().minusSeconds(5), new AtomicReference<>());

        assertThatThrownBy(() -> service.resolvePublic("PROCESS_TASKS", "raw-public-token"))
            .isInstanceOf(KioskUnavailableException.class)
            .hasMessage("Kiosk not found.");

        verify(jdbcTemplate).update(
            org.mockito.ArgumentMatchers.contains("SET status = 'EXPIRED'"), any(Object[].class));
        verify(jdbcTemplate).update(
            org.mockito.ArgumentMatchers.contains("UPDATE kiosk_sessions"), any(Object[].class));
        verify(jdbcTemplate, atLeastOnce()).update(
            org.mockito.ArgumentMatchers.contains("INSERT INTO kiosk_audit_events"), any(Object[].class));
    }

    @Test
    void disabledAndUnknownDefinitionsShareTheSamePublicFailure() throws Exception {
        stubDefinition(KioskDefinitionStatus.DISABLED, null, new AtomicReference<>());
        assertThatThrownBy(() -> service.resolvePublic("PROCESS_TASKS", "disabled-token"))
            .isInstanceOf(KioskUnavailableException.class)
            .hasMessage("Kiosk not found.");

        org.mockito.Mockito.reset(jdbcTemplate);
        org.mockito.BDDMockito.given(jdbcTemplate.query(
            anyString(), any(RowMapper.class), any(Object[].class))).willReturn(List.of());
        assertThatThrownBy(() -> service.resolvePublic("PROCESS_TASKS", "unknown-token"))
            .isInstanceOf(KioskUnavailableException.class)
            .hasMessage("Kiosk not found.");
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void rotatingPublicAccessStoresOnlyProtectedRecoveryMaterialAndRevokesOldSessions() {
        var definition = new KioskResolvedDefinition(
            17L, 7L, "POINT_OF_SALE", "self_service", 31L,
            "SELF-31", "Autoservicio", KioskDefinitionStatus.ACTIVE,
            2L, 3L, 5L, KioskAccessLevel.PUBLIC, null, "oldhint", false, 1, 1);
        org.mockito.BDDMockito.given(jdbcTemplate.query(
            anyString(), any(RowMapper.class), any(Object[].class)))
            .willReturn(List.of(definition));
        org.mockito.BDDMockito.given(payloadProtection.protect("new-public-token"))
            .willReturn("enc.v1.protected");

        service.replacePublicToken(7L, "POINT_OF_SALE", 31L, "new-public-token", 8L);

        verify(payloadProtection).protect("new-public-token");
        verify(jdbcTemplate).update(
            org.mockito.ArgumentMatchers.contains("protected_public_token"), any(Object[].class));
        verify(jdbcTemplate).update(
            org.mockito.ArgumentMatchers.contains("UPDATE kiosk_sessions"), any(Object[].class));
        verify(jdbcTemplate, never()).update(
            org.mockito.ArgumentMatchers.contains("new-public-token"), any(Object[].class));
    }

    @Test
    void resolvesCollidingLegacyIdsWithTheKioskTypeAsPartOfTheIdentity() {
        var definition = new KioskResolvedDefinition(
            17L, 7L, "POINT_OF_SALE", "self_checkout", 31L,
            "CHECKOUT-31", "Autocobro", KioskDefinitionStatus.ACTIVE,
            2L, 3L, 5L, KioskAccessLevel.PUBLIC, null, "hint", false, 1, 1);
        org.mockito.BDDMockito.given(jdbcTemplate.query(
            anyString(), any(RowMapper.class), any(Object[].class)))
            .willReturn(List.of(definition));

        var resolved = service.requireByLegacyReference(
            7L, "POINT_OF_SALE", "self_checkout", 31L);

        assertThat(resolved.kioskType()).isEqualTo("self_checkout");
        var sql = ArgumentCaptor.forClass(String.class);
        var parameters = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate).query(sql.capture(), any(RowMapper.class), parameters.capture());
        assertThat(sql.getValue()).contains("definition.kiosk_type = ?");
        assertThat(parameters.getValue())
            .containsExactly(7L, "POINT_OF_SALE", 31L, "self_checkout");
    }

    @Test
    void repairsMissingRecoveryMaterialOnlyThroughEveryTenantScopedCoordinate() throws Exception {
        var rawToken = "legacy-attendance-token";
        stubLegacyRecoveryMaterial(sha256(rawToken), null, true);
        org.mockito.BDDMockito.given(payloadProtection.protect(rawToken))
            .willReturn("enc.v1.repaired");
        org.mockito.BDDMockito.given(jdbcTemplate.update(
            org.mockito.ArgumentMatchers.contains("SET protected_public_token = ?"),
            any(Object[].class))).willReturn(1);

        assertThat(service.repairLegacyPublicTokenRecoveryMaterial(
            7L, 17L, "HUMAN_RESOURCES", "business_unit", 31L, rawToken)).isTrue();

        var sql = ArgumentCaptor.forClass(String.class);
        var parameters = ArgumentCaptor.forClass(Object[].class);
        verify(jdbcTemplate, times(2)).query(
            sql.capture(), any(RowMapper.class), parameters.capture());
        var materialQueryIndex = sql.getAllValues().stream()
            .map(String::strip)
            .toList()
            .indexOf(sql.getAllValues().stream()
                .filter(value -> value.contains("FOR UPDATE"))
                .findFirst().orElseThrow().strip());
        assertThat(sql.getAllValues().get(materialQueryIndex))
            .contains("id = ? AND company_id = ? AND owner_module = ?")
            .contains("kiosk_type = ? AND legacy_reference_id = ?")
            .contains("FOR UPDATE");
        assertThat(parameters.getAllValues().get(materialQueryIndex))
            .containsExactly(17L, 7L, "HUMAN_RESOURCES", "business_unit", 31L);
        verify(jdbcTemplate).update(
            org.mockito.ArgumentMatchers.contains("AND public_token_hash = ?"),
            org.mockito.ArgumentMatchers.eq("enc.v1.repaired"),
            org.mockito.ArgumentMatchers.eq(17L),
            org.mockito.ArgumentMatchers.eq(7L),
            org.mockito.ArgumentMatchers.eq("HUMAN_RESOURCES"),
            org.mockito.ArgumentMatchers.eq("business_unit"),
            org.mockito.ArgumentMatchers.eq(31L),
            org.mockito.ArgumentMatchers.eq(sha256(rawToken)));
        verify(jdbcTemplate).update(
            org.mockito.ArgumentMatchers.contains("INSERT INTO kiosk_audit_events"),
            org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.eq(17L),
            org.mockito.ArgumentMatchers.eq(17L),
            org.mockito.ArgumentMatchers.eq(7L),
            org.mockito.ArgumentMatchers.eq("HUMAN_RESOURCES"),
            org.mockito.ArgumentMatchers.eq("KIOSK_TOKEN_RECOVERY_MATERIAL_REPAIRED"),
            org.mockito.ArgumentMatchers.eq("SUCCEEDED"),
            org.mockito.ArgumentMatchers.eq("SYSTEM"),
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.any(java.sql.Timestamp.class));
        verify(jdbcTemplate, never()).update(
            org.mockito.ArgumentMatchers.contains("UPDATE kiosk_sessions"), any(Object[].class));
    }

    @Test
    void validatesAndNeverOverwritesExistingProtectedRecoveryMaterial() throws Exception {
        var rawToken = "legacy-attendance-token";
        stubLegacyRecoveryMaterial(sha256(rawToken), "enc.v1.existing", false);
        org.mockito.BDDMockito.given(payloadProtection.reveal("enc.v1.existing"))
            .willReturn(rawToken);

        assertThat(service.repairLegacyPublicTokenRecoveryMaterial(
            7L, 17L, "HUMAN_RESOURCES", "business_unit", 31L, rawToken)).isTrue();

        verify(payloadProtection, never()).protect(anyString());
        verify(jdbcTemplate, never()).update(
            org.mockito.ArgumentMatchers.contains("SET protected_public_token = ?"),
            any(Object[].class));
        verify(jdbcTemplate, never()).update(
            org.mockito.ArgumentMatchers.contains("INSERT INTO kiosk_audit_events"),
            any(Object[].class));
    }

    @Test
    void invalidExistingProtectedMaterialFailsClosedWithoutBeingOverwritten() throws Exception {
        var rawToken = "legacy-attendance-token";
        stubLegacyRecoveryMaterial(sha256(rawToken), "enc.v1.existing", true);
        org.mockito.BDDMockito.given(payloadProtection.reveal("enc.v1.existing"))
            .willReturn("different-token");

        assertThat(service.repairLegacyPublicTokenRecoveryMaterial(
            7L, 17L, "HUMAN_RESOURCES", "business_unit", 31L, rawToken)).isFalse();

        verify(payloadProtection, never()).protect(anyString());
        verify(jdbcTemplate, never()).update(
            org.mockito.ArgumentMatchers.contains("SET protected_public_token = ?"),
            any(Object[].class));
        verify(jdbcTemplate, never()).update(
            org.mockito.ArgumentMatchers.contains("INSERT INTO kiosk_audit_events"),
            any(Object[].class));
    }

    @Test
    void rejectsLegacyMaterialWhenItsHashDoesNotMatch() throws Exception {
        stubLegacyRecoveryMaterial(sha256("different-token"), null, true);

        assertThat(service.repairLegacyPublicTokenRecoveryMaterial(
            7L, 17L, "HUMAN_RESOURCES", "business_unit", 31L,
            "legacy-attendance-token")).isFalse();

        verify(payloadProtection, never()).protect(anyString());
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void rejectsCrossTenantDefinitionEvenIfPersistenceReturnedAnInconsistentRow() {
        var foreignDefinition = new KioskResolvedDefinition(
            17L, 8L, "HUMAN_RESOURCES", "business_unit", 31L,
            "RH-01", "Acceso ajeno", KioskDefinitionStatus.ACTIVE,
            2L, 3L, 4L, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", true, 1, 1);
        org.mockito.BDDMockito.given(jdbcTemplate.query(
            anyString(), any(RowMapper.class), any(Object[].class)))
            .willReturn(List.of(foreignDefinition));

        assertThat(service.repairLegacyPublicTokenRecoveryMaterial(
            7L, 17L, "HUMAN_RESOURCES", "business_unit", 31L,
            "legacy-attendance-token")).isFalse();

        verify(payloadProtection, never()).protect(anyString());
        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void directRecoveryRejectsProtectedMaterialWhosePlaintextHashDoesNotMatch() throws Exception {
        var rawToken = "legacy-attendance-token";
        stubLegacyRecoveryMaterial(sha256(rawToken), "enc.v1.existing", true);
        org.mockito.BDDMockito.given(payloadProtection.reveal("enc.v1.existing"))
            .willReturn("different-token");

        assertThatThrownBy(() -> service.recoverPublicToken(
            7L, "HUMAN_RESOURCES", "business_unit", 31L))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("integrity validation");

        verify(jdbcTemplate, never()).update(anyString(), any(Object[].class));
    }

    @Test
    void repairRunsInAnIndependentTransaction() throws Exception {
        var transaction = KioskRegistryService.class.getMethod(
            "repairLegacyPublicTokenRecoveryMaterial",
            long.class, long.class, String.class, String.class,
            long.class, String.class)
            .getAnnotation(org.springframework.transaction.annotation.Transactional.class);

        assertThat(transaction).isNotNull();
        assertThat(transaction.propagation())
            .isEqualTo(org.springframework.transaction.annotation.Propagation.REQUIRES_NEW);
    }

    @Test
    void recoveryAvailabilityFastPathIsANonLockingTenantScopedRead() {
        org.mockito.BDDMockito.given(jdbcTemplate.queryForObject(
            anyString(), org.mockito.ArgumentMatchers.eq(Integer.class), any(Object[].class)))
            .willReturn(1);

        assertThat(service.publicTokenRecoverable(7L, 17L)).isTrue();

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).queryForObject(
            sql.capture(), org.mockito.ArgumentMatchers.eq(Integer.class),
            org.mockito.ArgumentMatchers.eq(17L), org.mockito.ArgumentMatchers.eq(7L));
        assertThat(sql.getValue())
            .contains("id = ? AND company_id = ?")
            .doesNotContain("FOR UPDATE");
        verify(jdbcTemplate, never()).query(
            org.mockito.ArgumentMatchers.contains("FOR UPDATE"),
            any(RowMapper.class), any(Object[].class));
    }

    @Test
    void legacyUpsertCanOnlyFillEmptyMaterialForTheSamePublicHash() {
        var definition = legacyDefinition();
        org.mockito.BDDMockito.given(jdbcTemplate.query(
            anyString(), any(RowMapper.class), any(Object[].class)))
            .willReturn(List.of(definition));
        org.mockito.BDDMockito.given(payloadProtection.protect("legacy-attendance-token"))
            .willReturn("enc.v1.repaired");

        service.registerLegacyDefinitionWithLocation(
            7L, "HUMAN_RESOURCES", "business_unit", 31L,
            "RH-01", "Acceso principal", "active", 2L, 3L, 4L, null,
            "legacy-attendance-token", true, KioskAccessLevel.CONTROLLED,
            "human-resources", "es-MX", 8L);

        var sql = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate, atLeastOnce()).update(sql.capture(), any(Object[].class));
        assertThat(sql.getAllValues()).anySatisfy(statement -> assertThat(statement)
            .contains("protected_public_token = CASE")
            .contains("protected_public_token IS NULL OR protected_public_token = ''")
            .contains("legacy_token_recoverable = 1")
            .contains("public_token_hash = VALUES(public_token_hash)")
            .contains("ELSE protected_public_token"));
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void stubLegacyRecoveryMaterial(
            String publicTokenHash,
            String protectedPublicToken,
            boolean legacyTokenRecoverable) throws Exception {
        var definition = legacyDefinition();
        var materialRow = mock(ResultSet.class);
        org.mockito.BDDMockito.given(materialRow.getString("public_token_hash"))
            .willReturn(publicTokenHash);
        org.mockito.BDDMockito.given(materialRow.getString("protected_public_token"))
            .willReturn(protectedPublicToken);
        org.mockito.BDDMockito.given(materialRow.getBoolean("legacy_token_recoverable"))
            .willReturn(legacyTokenRecoverable);
        org.mockito.BDDMockito.given(jdbcTemplate.query(
            anyString(), any(RowMapper.class), any(Object[].class))).willAnswer(invocation -> {
                var statement = String.valueOf((Object) invocation.getArgument(0));
                if (statement.contains("SELECT public_token_hash")) {
                    var mapper = (RowMapper) invocation.getArgument(1);
                    return List.of(mapper.mapRow(materialRow, 0));
                }
                return List.of(definition);
            });
    }

    private KioskResolvedDefinition legacyDefinition() {
        return new KioskResolvedDefinition(
            17L, 7L, "HUMAN_RESOURCES", "business_unit", 31L,
            "RH-01", "Acceso principal", KioskDefinitionStatus.ACTIVE,
            2L, 3L, 4L, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", true, 1, 1);
    }

    private String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception impossible) {
            throw new IllegalStateException(impossible);
        }
    }

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void stubDefinition(
            KioskDefinitionStatus status,
            Instant expiresAt,
            AtomicReference<String> persistedHash) throws Exception {
        var rs = mock(ResultSet.class);
        org.mockito.BDDMockito.given(rs.getLong("id")).willReturn(17L);
        org.mockito.BDDMockito.given(rs.getLong("company_id")).willReturn(7L);
        org.mockito.BDDMockito.given(rs.getString("owner_module")).willReturn("PROCESS_TASKS");
        org.mockito.BDDMockito.given(rs.getString("kiosk_type")).willReturn("task_access");
        org.mockito.BDDMockito.given(rs.getObject("legacy_reference_id", Long.class)).willReturn(31L);
        org.mockito.BDDMockito.given(rs.getString("code")).willReturn("TASKS");
        org.mockito.BDDMockito.given(rs.getString("name")).willReturn("Tasks");
        org.mockito.BDDMockito.given(rs.getString("status")).willReturn(status.name());
        org.mockito.BDDMockito.given(rs.getObject("unit_id", Long.class)).willReturn(2L);
        org.mockito.BDDMockito.given(rs.getObject("business_id", Long.class)).willReturn(3L);
        org.mockito.BDDMockito.given(rs.getObject("location_id", Long.class)).willReturn(null);
        org.mockito.BDDMockito.given(rs.getString("access_level")).willReturn("CONTROLLED");
        org.mockito.BDDMockito.given(rs.getTimestamp("expires_at"))
            .willReturn(expiresAt == null ? null : Timestamp.from(expiresAt));
        org.mockito.BDDMockito.given(rs.getString("public_token_hint")).willReturn("kenhint");
        org.mockito.BDDMockito.given(rs.getBoolean("legacy_token_recoverable")).willReturn(false);
        org.mockito.BDDMockito.given(rs.getInt("configuration_version")).willReturn(1);
        org.mockito.BDDMockito.given(rs.getInt("adapter_version")).willReturn(1);

        org.mockito.BDDMockito.given(jdbcTemplate.query(
            anyString(), any(RowMapper.class), any(Object[].class))).willAnswer(invocation -> {
                var arguments = invocation.getArguments();
                var last = arguments[arguments.length - 1];
                if (last instanceof Object[] values && values.length > 0) {
                    last = values[values.length - 1];
                }
                persistedHash.set(String.valueOf(last));
                var mapper = (RowMapper) invocation.getArgument(1);
                return List.of(mapper.mapRow(rs, 0));
            });
    }
}
