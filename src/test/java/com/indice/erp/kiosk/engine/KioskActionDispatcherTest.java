package com.indice.erp.kiosk.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.dao.DuplicateKeyException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.doThrow;

@ExtendWith(MockitoExtension.class)
class KioskActionDispatcherTest {

    @Mock
    private KioskAdapterRegistry registry;

    @Mock
    private KioskActionAuditService auditService;

    @Mock
    private KioskRateLimitService rateLimitService;

    @Mock
    private KioskRegistryService definitionRegistry;

    @Mock
    private KioskSessionService sessionService;

    @Mock
    private KioskFileIntentService fileIntentService;

    @Mock
    private KioskEngineFeatureFlags featureFlags;

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private KioskModuleAdapter adapter;

    private KioskActionDispatcher dispatcher;
    private KioskExecutionContext context;

    @BeforeEach
    void setUp() {
        dispatcher = new KioskActionDispatcher(
            registry, definitionRegistry, sessionService, fileIntentService, featureFlags, auditService,
            rateLimitService, jdbcTemplate, new ObjectMapper(),
            new KioskPayloadProtectionService(
                "dispatcher-kiosk-payload-test-secret-1234"));
        context = KioskExecutionContext.publicLink("PROCESS_TASKS", "secret-device-token");
        lenient().when(registry.requireAdapter("PROCESS_TASKS")).thenReturn(adapter);
        given(featureFlags.registryEnabled()).willReturn(true);
        given(featureFlags.sessionsEnabled()).willReturn(true);
        given(featureFlags.auditEnabled()).willReturn(true);
        lenient().when(featureFlags.adapterEnabled("PROCESS_TASKS")).thenReturn(true);
        var definition = new KioskResolvedDefinition(
            17L, 7L, "PROCESS_TASKS", "task_access", 31L, "TASKS", "Tasks",
            KioskDefinitionStatus.ACTIVE, 2L, 3L, null, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", false, 1, 1);
        lenient().when(definitionRegistry.resolvePublic("PROCESS_TASKS", "secret-device-token"))
            .thenReturn(definition);
        lenient().when(definitionRegistry.capabilityEnabled(
            org.mockito.ArgumentMatchers.eq(17L), any()))
            .thenReturn(true);
        lenient().when(sessionService.requireSession(any(), any(), any(), anyString()))
            .thenReturn(new KioskSessionPrincipal(
                "session-1", 17L, 7L, "EMPLOYEE", 9L, java.util.Set.of(),
                java.time.Instant.now().plusSeconds(600)));
        lenient().when(adapter.authorize(any(), any())).thenReturn(KioskAuthorization.allow());
        lenient().when(adapter.validate(any(), any())).thenReturn(KioskValidationResult.success());
        lenient().when(auditService.beginAction(any(), any(), any(), any())).thenReturn("action-1");
    }

    @Test
    void dispatchesReadCapabilityAndAuditsWithoutIdempotencyStorage() {
        var capability = capability("tasks.read", false);
        var request = KioskActionRequest.of("tasks.read", Map.of("identification_token", "secret"));
        var response = Map.<String, Object>of("items", java.util.List.of());
        given(registry.requireCapability("tasks.read@1")).willReturn(capability);
        given(adapter.execute(any(), org.mockito.ArgumentMatchers.same(request))).willReturn(response);

        assertThat(dispatcher.dispatch(context, request, null)).isSameAs(response);

        then(jdbcTemplate).should(never()).update(anyString(), any(Object[].class));
        then(auditService).should().recordSuccess(
            anyString(), any(), any(), any(), any(), org.mockito.ArgumentMatchers.same(response),
            org.mockito.ArgumentMatchers.eq(false));
    }

    @Test
    void reservesAndCompletesIdempotencyForMutation() {
        var capability = capability("task.create", true);
        var request = KioskActionRequest.of("task.create", Map.of("title", "Inspect"));
        var response = Map.<String, Object>of("task", Map.of("id", 41));
        given(registry.requireCapability("task.create@1")).willReturn(capability);
        given(adapter.execute(any(), org.mockito.ArgumentMatchers.same(request))).willReturn(response);
        given(jdbcTemplate.update(anyString(), any(Object[].class))).willReturn(1);

        assertThat(dispatcher.dispatch(context, request, "action-123")).isSameAs(response);

        then(jdbcTemplate).should(atLeastOnce()).update(anyString(), any(Object[].class));
        then(adapter).should().execute(any(), org.mockito.ArgumentMatchers.same(request));
        then(auditService).should().recordSuccess(
            anyString(), any(), any(), any(), any(), org.mockito.ArgumentMatchers.same(response),
            org.mockito.ArgumentMatchers.eq(false));
        var completedValues = ArgumentCaptor.forClass(Object[].class);
        then(jdbcTemplate).should().update(
            org.mockito.ArgumentMatchers.contains("SET status = 'COMPLETED'"),
            completedValues.capture());
        assertThat(String.valueOf(completedValues.getValue()[0]))
            .contains("_protected_response", KioskPayloadProtectionService.PREFIX)
            .doesNotContain("\"task\"", "\"id\":41");
    }

    @Test
    void scopesUnauthenticatedIdempotencyToTheBrowserWithoutPersistingPublicPiiHashes() throws Exception {
        var capability = capability(
            "catalog.request.create", true, KioskAccessLevel.PUBLIC);
        var request = KioskActionRequest.of(
            "catalog.request.create", Map.of("email", "person@example.test"));
        given(registry.requireCapability("catalog.request.create@1")).willReturn(capability);
        given(adapter.execute(any(), org.mockito.ArgumentMatchers.same(request)))
            .willReturn(Map.of("accepted", true));
        given(jdbcTemplate.update(anyString(), any(Object[].class))).willReturn(1);

        dispatcher.dispatch(context, request, "public-request-1");

        var reservation = ArgumentCaptor.forClass(Object[].class);
        then(jdbcTemplate).should().update(
            org.mockito.ArgumentMatchers.contains("INSERT INTO kiosk_engine_idempotency"),
            reservation.capture());
        assertThat(String.valueOf(reservation.getValue()[3]))
            .isEqualTo(sha256("browser:unknown"))
            .isNotEqualTo(sha256("person@example.test"));
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void replaysCompletedMutationWithoutExecutingTheModuleAgainAndAuditsReplay() throws Exception {
        var capability = capability("task.create", true);
        var request = KioskActionRequest.of("task.create", Map.of("title", "Inspect"));
        var storedResponse = "{\"task\":{\"id\":41}}";
        var fingerprint = sha256("task.create@1\nnull\n{\"title\":\"Inspect\"}");
        var rs = org.mockito.Mockito.mock(java.sql.ResultSet.class);
        given(rs.getString("request_fingerprint")).willReturn(fingerprint);
        given(rs.getString("status")).willReturn("COMPLETED");
        given(rs.getString("response_json")).willReturn(storedResponse);
        given(rs.getTimestamp("expires_at"))
            .willReturn(Timestamp.from(Instant.now().plusSeconds(600)));
        given(registry.requireCapability("task.create@1")).willReturn(capability);
        given(jdbcTemplate.update(
            org.mockito.ArgumentMatchers.contains("INSERT INTO kiosk_engine_idempotency"),
            any(Object[].class))).willThrow(new DuplicateKeyException("duplicate"));
        given(jdbcTemplate.query(
            org.mockito.ArgumentMatchers.contains("SELECT request_fingerprint"),
            any(RowMapper.class), any(Object[].class))).willAnswer(invocation -> {
                var mapper = (RowMapper) invocation.getArgument(1);
                return java.util.List.of(mapper.mapRow(rs, 0));
            });

        var replay = dispatcher.dispatch(context, request, "action-123");

        assertThat(replay).isEqualTo(Map.of("task", Map.of("id", 41)));
        then(adapter).should(never()).execute(any(), any());
        then(auditService).should().recordSuccess(
            anyString(), any(), any(), any(), any(),
            org.mockito.ArgumentMatchers.eq(replay), org.mockito.ArgumentMatchers.eq(true));
    }

    @Test
    void rejectsMutationWithoutIdempotencyKey() {
        var capability = capability("task.create", true);
        var request = KioskActionRequest.of("task.create", Map.of("title", "Inspect"));
        given(registry.requireCapability("task.create@1")).willReturn(capability);

        assertThatThrownBy(() -> dispatcher.dispatch(context, request, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Idempotency-Key is required");

        then(adapter).should(never()).execute(any(), any());
        then(auditService).should().recordRejected(
            any(), any(), any(), any(), any(IllegalArgumentException.class));
    }

    @Test
    void criticalSuccessAuditFailurePreventsMutationConfirmationWithoutASecondAuditWrite() {
        var capability = capability("task.complete", true);
        var request = KioskActionRequest.forResource("task.complete", 41L, Map.of());
        var response = Map.<String, Object>of("completed", true);
        var auditFailure = new IllegalStateException("critical audit unavailable");
        given(registry.requireCapability("task.complete@1")).willReturn(capability);
        given(adapter.execute(any(), org.mockito.ArgumentMatchers.same(request))).willReturn(response);
        given(jdbcTemplate.update(anyString(), any(Object[].class))).willReturn(1);
        org.mockito.Mockito.doThrow(auditFailure).when(auditService).recordSuccess(
            anyString(), any(), any(), any(), any(),
            org.mockito.ArgumentMatchers.same(response), org.mockito.ArgumentMatchers.eq(false));

        assertThatThrownBy(() -> dispatcher.dispatch(context, request, "complete-41"))
            .isSameAs(auditFailure);

        then(adapter).should().execute(any(), org.mockito.ArgumentMatchers.same(request));
        then(auditService).should(never()).recordFailure(
            anyString(), any(), any(), any(), any(), any());
    }

    @Test
    void rejectsOversizedIdempotencyKeyAndAuditsFailure() {
        var capability = capability("task.create", true);
        var request = KioskActionRequest.of("task.create", Map.of("title", "Inspect"));
        given(registry.requireCapability("task.create@1")).willReturn(capability);

        assertThatThrownBy(() -> dispatcher.dispatch(context, request, "x".repeat(129)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("too long");

        then(adapter).should(never()).execute(any(), any());
        then(auditService).should().recordRejected(
            any(), any(), any(), any(), any(IllegalArgumentException.class));
    }

    @Test
    void auditsAdapterFailureWithoutExposingAccessReference() {
        var capability = capability("tasks.read", false);
        var request = KioskActionRequest.of("tasks.read", Map.of());
        var failure = new IllegalArgumentException("Denied");
        given(registry.requireCapability("tasks.read@1")).willReturn(capability);
        given(adapter.execute(any(), org.mockito.ArgumentMatchers.same(request))).willThrow(failure);

        assertThatThrownBy(() -> dispatcher.dispatch(context, request, null)).isSameAs(failure);

        then(auditService).should().recordFailure(
            anyString(), any(), any(), any(), any(), org.mockito.ArgumentMatchers.same(failure)
        );
    }

    @Test
    void publicCapabilityDoesNotRequireSessionEvenWhenDefinitionIsControlled() {
        var capability = capability("providers.registration.submit", false, KioskAccessLevel.PUBLIC);
        var request = KioskActionRequest.of("providers.registration.submit", Map.of("name", "Proveedor Norte"));
        var response = Map.<String, Object>of("providerId", 91L);
        given(registry.requireCapability("providers.registration.submit@1")).willReturn(capability);
        given(adapter.execute(any(), org.mockito.ArgumentMatchers.same(request))).willReturn(response);

        assertThat(dispatcher.dispatch(context, request, null)).isSameAs(response);

        then(sessionService).should(never()).requireSession(any(), any(), any(), anyString());
        then(adapter).should().authorize(
            org.mockito.ArgumentMatchers.argThat(candidate -> candidate.session() == null),
            org.mockito.ArgumentMatchers.same(request));
    }

    @Test
    void consumesTheRateLimitBeforeSynchronizingCapabilityMetadata() {
        var capability = capability("catalog.read", false, KioskAccessLevel.PUBLIC);
        var request = KioskActionRequest.of("catalog.read", Map.of());
        given(registry.requireCapability("catalog.read@1")).willReturn(capability);
        given(adapter.execute(any(), org.mockito.ArgumentMatchers.same(request)))
            .willReturn(Map.of("items", java.util.List.of()));

        dispatcher.dispatch(context, request, null);

        var order = inOrder(rateLimitService, definitionRegistry);
        order.verify(rateLimitService).requireAllowed(
            eq(KioskRateLimitType.QUERY), any(), any());
        order.verify(definitionRegistry).synchronizeCapabilities(any(), any());
    }

    @Test
    void identityWithPersonalPinScopeUsesTheNonRotatablePersonBucket() {
        var capability = new KioskCapabilityDescriptor(
            "process-tasks.identity.verify", 1, "PROCESS_TASKS",
            KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED,
            false, true, Map.of("stablePinScope", "PERSON"), Map.of(), Map.of());
        var request = KioskActionRequest.of(
            "process-tasks.identity.verify", Map.of("pin", "123456"));
        var throttleFailure = new KioskRateLimitExceededException(60);
        given(registry.requireCapability("process-tasks.identity.verify@1"))
            .willReturn(capability);
        lenient().when(adapter.capabilities(any())).thenReturn(java.util.Set.of(capability));
        doThrow(throttleFailure).when(rateLimitService)
            .requireStablePersonalPinAllowed(any());

        assertThatThrownBy(() -> dispatcher.dispatch(context, request, null))
            .isSameAs(throttleFailure);

        then(rateLimitService).should().requireStablePersonalPinAllowed(any());
        then(rateLimitService).should(never()).requireStablePinAllowed(any());
        then(adapter).should(never()).execute(any(), any());
    }

    @Test
    void humanResourcesIdentityKeepsTheModuleTokenSeparateFromTheEngineSessionToken() {
        var browserReference = "attendance-browser-reference-1234567890";
        var hrContext = KioskExecutionContext.publicLink(
            "HUMAN_RESOURCES", "attendance-device-token", "network", browserReference);
        var definition = new KioskResolvedDefinition(
            23L, 7L, "HUMAN_RESOURCES", "attendance", 31L, "ATTENDANCE", "Attendance",
            KioskDefinitionStatus.ACTIVE, 2L, 3L, null, KioskAccessLevel.CONTROLLED,
            null, "attendance", false, 1, 1);
        var capability = new KioskCapabilityDescriptor(
            "attendance.identity.verify", 1, "HUMAN_RESOURCES",
            KioskOperationPolicy.DIRECT, KioskAccessLevel.CONTROLLED,
            false, true);
        var request = KioskActionRequest.of(
            "attendance.identity.verify", Map.of("credential_payload", "12345"));
        var expiresAt = Instant.now().plusSeconds(180);
        var moduleToken = "attendance-module-identification-token";
        var engineToken = "attendance-engine-session-token";
        var principal = new KioskSessionPrincipal(
            "attendance-session", 23L, 7L, "EMPLOYEE", 19L,
            java.util.Set.of(capability.versionedKey()), expiresAt);
        var moduleResponse = Map.<String, Object>of(
            "identification_token", moduleToken,
            "expires_at", expiresAt.toString(),
            "user", Map.of("id", 19L));

        given(registry.requireAdapter("HUMAN_RESOURCES")).willReturn(adapter);
        given(featureFlags.adapterEnabled("HUMAN_RESOURCES")).willReturn(true);
        given(definitionRegistry.resolvePublic(
            "HUMAN_RESOURCES", "attendance-device-token")).willReturn(definition);
        given(definitionRegistry.capabilityEnabled(23L, capability)).willReturn(true);
        given(registry.requireCapability(capability.versionedKey())).willReturn(capability);
        given(adapter.capabilities(definition)).willReturn(java.util.Set.of(capability));
        given(adapter.execute(any(), org.mockito.ArgumentMatchers.same(request)))
            .willReturn(moduleResponse);
        given(sessionService.createControlledSessionLaunch(
            eq(definition), eq("EMPLOYEE"), eq(19L), eq(browserReference),
            eq(java.util.Set.of(capability.versionedKey())), eq(expiresAt)))
            .willReturn(new KioskSessionLaunch(principal, engineToken));

        var response = dispatcher.dispatch(hrContext, request, null);

        assertThat(response)
            .containsEntry("identification_token", moduleToken)
            .containsEntry("kiosk_session_token", engineToken)
            .containsEntry("kiosk_session_id", "attendance-session")
            .doesNotContainKeys("engine_session", "engine_identity");
        then(sessionService).should(never()).createControlledSession(
            any(), anyString(), org.mockito.ArgumentMatchers.anyLong(), anyString(),
            anyString(), any(), any());
    }

    private KioskCapabilityDescriptor capability(String key, boolean mutation) {
        return capability(key, mutation, KioskAccessLevel.CONTROLLED);
    }

    private KioskCapabilityDescriptor capability(
            String key,
            boolean mutation,
            KioskAccessLevel accessLevel) {
        var descriptor = new KioskCapabilityDescriptor(
            key,
            1,
            "PROCESS_TASKS",
            mutation ? KioskOperationPolicy.DIRECT : KioskOperationPolicy.INFORMATION_ONLY,
            accessLevel,
            mutation,
            false
        );
        lenient().when(adapter.capabilities(any())).thenReturn(java.util.Set.of(descriptor));
        return descriptor;
    }

    private String sha256(String value) throws Exception {
        return HexFormat.of().formatHex(
            MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
    }
}
