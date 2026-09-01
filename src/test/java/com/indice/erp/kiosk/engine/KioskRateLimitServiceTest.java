package com.indice.erp.kiosk.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.lang.reflect.Method;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

class KioskRateLimitServiceTest {

    private static final int AGGREGATE_MAXIMUM_ATTEMPTS = 30;
    private static final long AGGREGATE_WINDOW_SECONDS = 1_800;

    @Test
    void persistsEveryAttemptOutsideTheActionTransaction() throws Exception {
        Method method = KioskRateLimitService.class.getMethod(
            "requireAllowed",
            KioskRateLimitType.class,
            KioskExecutionContext.class,
            java.util.Map.class
        );

        var transaction = method.getAnnotation(Transactional.class);

        assertThat(transaction).isNotNull();
        assertThat(transaction.propagation()).isEqualTo(Propagation.REQUIRES_NEW);
    }

    @Test
    void differentPinGuessesShareTheSameUnauthenticatedChallengeBucket() throws Exception {
        Method method = KioskRateLimitService.class.getDeclaredMethod(
            "unauthenticatedSignal", KioskRateLimitType.class, Map.class);
        method.setAccessible(true);
        var service = service(null);

        var first = method.invoke(
            service, KioskRateLimitType.PIN_VERIFICATION, Map.of("pin", "111111"));
        var second = method.invoke(
            service, KioskRateLimitType.PIN_VERIFICATION, Map.of("pin", "999999"));

        assertThat(first).isEqualTo("pin-challenge").isEqualTo(second);
    }

    @Test
    void personalPinBucketIsSharedByEveryKioskGrantedToTheSamePerson() {
        var jdbc = mock(org.springframework.jdbc.core.JdbcTemplate.class);
        var service = service(jdbc);
        when(jdbc.queryForList(anyString(), eq(String.class), eq(17L)))
            .thenReturn(List.of("PROVIDER:91"));
        when(jdbc.queryForList(anyString(), eq(String.class), eq(18L)))
            .thenReturn(List.of("PROVIDER:91"));

        var first = service.stablePersonalPinScopeHash(context(17L, 7L));
        var second = service.stablePersonalPinScopeHash(context(18L, 7L));

        assertThat(first).isEqualTo(second);
    }

    @Test
    void personalPinBucketsDoNotCrossPeopleOrCompanies() {
        var jdbc = mock(org.springframework.jdbc.core.JdbcTemplate.class);
        var service = service(jdbc);
        when(jdbc.queryForList(anyString(), eq(String.class), eq(17L)))
            .thenReturn(List.of("PROVIDER:91"));
        when(jdbc.queryForList(anyString(), eq(String.class), eq(18L)))
            .thenReturn(List.of("PROVIDER:92"));
        when(jdbc.queryForList(anyString(), eq(String.class), eq(19L)))
            .thenReturn(List.of("PROVIDER:91"));

        var first = service.stablePersonalPinScopeHash(context(17L, 7L));

        assertThat(service.stablePersonalPinScopeHash(context(18L, 7L)))
            .isNotEqualTo(first);
        assertThat(service.stablePersonalPinScopeHash(context(19L, 8L)))
            .isNotEqualTo(first);
    }

    @Test
    void personalPinBucketFailsClosedWithoutExactlyOneGrantedIdentity() {
        var jdbc = mock(org.springframework.jdbc.core.JdbcTemplate.class);
        var service = service(jdbc);
        when(jdbc.queryForList(anyString(), eq(String.class), eq(17L)))
            .thenReturn(List.of());
        when(jdbc.queryForList(anyString(), eq(String.class), eq(18L)))
            .thenReturn(List.of("PROVIDER:91", "PROVIDER:92"));

        assertThatThrownBy(() -> service.stablePersonalPinScopeHash(context(17L, 7L)))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("missing or ambiguous");
        assertThatThrownBy(() -> service.stablePersonalPinScopeHash(context(18L, 7L)))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("missing or ambiguous");
    }

    @Test
    void stableNetworkBucketCannotBeRotatedWithBrowserStateOrPayload() {
        var service = service(null);
        var definition = new KioskResolvedDefinition(
            17L, 7L, "SALES", "public_catalog", 31L,
            "CATALOG", "Catalog", KioskDefinitionStatus.ACTIVE, 2L, 3L,
            null, KioskAccessLevel.PUBLIC, null, "hint", false, 1, 1);
        var first = new KioskExecutionContext(
            "SALES", "PUBLIC_LINK", "catalog-token", "203.0.113.7", "browser-a")
            .resolved(definition, null);
        var second = new KioskExecutionContext(
            "SALES", "PUBLIC_LINK", "catalog-token", "203.0.113.7", "browser-b")
            .resolved(definition, null);

        assertThat(service.stableNetworkScopeHash(KioskRateLimitType.MUTATION, first))
            .isEqualTo(service.stableNetworkScopeHash(KioskRateLimitType.MUTATION, second));
        assertThat(service.stableNetworkScopeHash(KioskRateLimitType.FILE, second))
            .isNotEqualTo(service.stableNetworkScopeHash(KioskRateLimitType.MUTATION, first));
    }

    @Test
    void mobileActionBucketsAreSeparatedByAuthoritativeEmployeeIdentity() {
        var service = service(null);
        var definition = new KioskResolvedDefinition(
            17L, 7L, "PROCESS_TASKS", "task_access", 31L,
            "TASKS", "Tasks", KioskDefinitionStatus.ACTIVE, 2L, 3L,
            null, KioskAccessLevel.CONTROLLED, null, "hint", false, 1, 1);
        var firstPrincipal = new KioskSessionPrincipal(
            "session-1", 17L, 7L, "USER", 91L, java.util.Set.of(),
            java.time.Instant.now().plusSeconds(600));
        var secondPrincipal = new KioskSessionPrincipal(
            "session-2", 17L, 7L, "USER", 92L, java.util.Set.of(),
            java.time.Instant.now().plusSeconds(600));
        var first = new KioskExecutionContext(
            "PROCESS_TASKS", KioskExecutionChannels.MOBILE_MULTI_KIOSK,
            "definition:17", "mobile", "shared-browser")
            .resolved(definition, firstPrincipal);
        var second = new KioskExecutionContext(
            "PROCESS_TASKS", KioskExecutionChannels.MOBILE_MULTI_KIOSK,
            "definition:17", "mobile", "shared-browser")
            .resolved(definition, secondPrincipal);

        assertThat(service.requestScopeHash(KioskRateLimitType.MUTATION, first, Map.of()))
            .isNotEqualTo(service.requestScopeHash(KioskRateLimitType.MUTATION, second, Map.of()));
    }

    @Test
    void successfulPinResetsTheKioskNetworkAndBrowserAttemptBuckets() {
        var jdbc = mock(org.springframework.jdbc.core.JdbcTemplate.class);
        var service = service(jdbc);
        var context = context(17L, 7L);

        service.resetSuccessfulPinVerification(context, Map.of("pin", "12345"), "KIOSK");

        var hash = ArgumentCaptor.forClass(String.class);
        verify(jdbc, times(3)).update(
            org.mockito.ArgumentMatchers.contains("DELETE FROM kiosk_engine_rate_limit_buckets"),
            eq("PIN_VERIFICATION"), hash.capture());
        assertThat(hash.getAllValues()).doesNotHaveDuplicates().hasSize(3);
    }

    @Test
    void successfulMultiKioskPinReleasesOnlyItsConsumedAttempt() throws Exception {
        var jdbc = mock(org.springframework.jdbc.core.JdbcTemplate.class);
        var service = service(jdbc);

        service.releaseSuccessfulMultiKioskPinAttempt(7L, 44L, "203.0.113.7");

        var releasedScopes = ArgumentCaptor.forClass(String.class);
        verify(jdbc, times(2)).update(
            org.mockito.ArgumentMatchers.contains(
                "SET request_count = GREATEST(request_count - 1, 0)"),
            eq("PIN_VERIFICATION"), releasedScopes.capture());
        assertThat(releasedScopes.getAllValues()).doesNotHaveDuplicates().hasSize(2);
        verify(jdbc, times(2)).update(
            org.mockito.ArgumentMatchers.contains("AND request_count <= 0"),
            eq("PIN_VERIFICATION"), anyString());

        Method method = KioskRateLimitService.class.getMethod(
            "releaseSuccessfulMultiKioskPinAttempt", long.class, long.class, String.class);
        var transaction = method.getAnnotation(Transactional.class);
        assertThat(transaction).isNotNull();
        assertThat(transaction.propagation()).isEqualTo(Propagation.REQUIRES_NEW);
    }

    @Test
    void multiKioskPinBucketIgnoresPinAndBrowserButSeparatesCanonicalNetworks() {
        var service = service(null);

        var first = service.multiKioskPinScopeHash(7L, 44L, "203.0.113.7");

        assertThat(service.multiKioskPinScopeHash(7L, 44L, "203.0.113.7"))
            .isEqualTo(first);
        assertThat(service.multiKioskPinScopeHash(7L, 44L, "203.0.113.8"))
            .isNotEqualTo(first);
        assertThat(service.multiKioskPinScopeHash(7L, 45L, "203.0.113.7"))
            .isNotEqualTo(first);
    }

    @Test
    void rotatingNetworksCannotBypassTheAggregateMultiKioskLimit() {
        var jdbc = new InMemoryRateLimitJdbcTemplate();
        var service = new KioskRateLimitService(jdbc, 6, 901);

        for (var attempt = 1; attempt <= 6; attempt++) {
            service.requireMultiKioskPinAllowed(
                7L, 44L, "203.0.113." + attempt);
        }

        assertThatThrownBy(() -> service.requireMultiKioskPinAllowed(
            7L, 44L, "203.0.113.7"))
            .isInstanceOf(KioskRateLimitExceededException.class);
        assertThat(jdbc.requestCount(
            service.multiKioskAggregatePinScopeHash(7L, 44L))).isEqualTo(7);
    }

    @Test
    void aggregateMultiKioskBudgetsAreIsolatedByTenantAndLauncher() {
        var service = service(null);
        var first = service.multiKioskAggregatePinScopeHash(7L, 44L);

        assertThat(service.multiKioskAggregatePinScopeHash(8L, 44L)).isNotEqualTo(first);
        assertThat(service.multiKioskAggregatePinScopeHash(7L, 45L)).isNotEqualTo(first);
        assertThat(service.multiKioskAggregatePinScopeHash(7L, 44L)).isEqualTo(first);
    }

    @Test
    void aggregateMultiKioskConfigurationFailsClosedWhenItWeakensTheNetworkLayer() {
        assertThatThrownBy(() -> new KioskRateLimitService(
            null, KioskRateLimitType.PIN_VERIFICATION.maximumRequests(),
            AGGREGATE_WINDOW_SECONDS))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("must exceed the per-network limit");
        assertThatThrownBy(() -> new KioskRateLimitService(
            null, AGGREGATE_MAXIMUM_ATTEMPTS,
            KioskRateLimitType.PIN_VERIFICATION.window().getSeconds()))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("must exceed the per-network window");
    }

    private KioskRateLimitService service(org.springframework.jdbc.core.JdbcTemplate jdbc) {
        return new KioskRateLimitService(
            jdbc, AGGREGATE_MAXIMUM_ATTEMPTS, AGGREGATE_WINDOW_SECONDS);
    }

    private static final class InMemoryRateLimitJdbcTemplate
            extends org.springframework.jdbc.core.JdbcTemplate {

        private final Map<String, Integer> requestCounts = new HashMap<>();
        private final Map<String, Instant> windowStarts = new HashMap<>();

        @Override
        public int update(String sql, Object... args) {
            if (sql.contains("INSERT INTO kiosk_engine_rate_limit_buckets")) {
                var scopeHash = String.valueOf(args[1]);
                requestCounts.merge(scopeHash, 1, Integer::sum);
                windowStarts.putIfAbsent(scopeHash, Instant.now());
            }
            return 1;
        }

        @Override
        public <T> T queryForObject(
                String sql,
                org.springframework.jdbc.core.RowMapper<T> rowMapper,
                Object... args) {
            var scopeHash = String.valueOf(args[1]);
            var resultSet = mock(ResultSet.class);
            try {
                when(resultSet.getInt("request_count"))
                    .thenReturn(requestCounts.getOrDefault(scopeHash, 0));
                when(resultSet.getTimestamp("window_started_at"))
                    .thenReturn(Timestamp.from(windowStarts.get(scopeHash)));
                return rowMapper.mapRow(resultSet, 0);
            } catch (SQLException failure) {
                throw new IllegalStateException(failure);
            }
        }

        int requestCount(String scopeHash) {
            return requestCounts.getOrDefault(scopeHash, 0);
        }
    }

    private KioskExecutionContext context(long definitionId, long companyId) {
        var definition = new KioskResolvedDefinition(
            definitionId, companyId, "PROCUREMENT", "supplier_portal", 31L,
            "SUPPLIER", "Supplier", KioskDefinitionStatus.ACTIVE, 2L, 3L,
            null, KioskAccessLevel.CONTROLLED, null, "hint", false, 1, 1);
        return new KioskExecutionContext(
            "PROCUREMENT", "LEGACY_PUBLIC_LINK", "link-token", "network", "browser")
            .resolved(definition, null);
    }
}
