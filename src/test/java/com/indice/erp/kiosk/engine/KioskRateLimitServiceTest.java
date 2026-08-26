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
import java.util.List;
import java.util.Map;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

class KioskRateLimitServiceTest {

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
        var service = new KioskRateLimitService(null);

        var first = method.invoke(
            service, KioskRateLimitType.PIN_VERIFICATION, Map.of("pin", "111111"));
        var second = method.invoke(
            service, KioskRateLimitType.PIN_VERIFICATION, Map.of("pin", "999999"));

        assertThat(first).isEqualTo("pin-challenge").isEqualTo(second);
    }

    @Test
    void personalPinBucketIsSharedByEveryKioskGrantedToTheSamePerson() {
        var jdbc = mock(org.springframework.jdbc.core.JdbcTemplate.class);
        var service = new KioskRateLimitService(jdbc);
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
        var service = new KioskRateLimitService(jdbc);
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
        var service = new KioskRateLimitService(jdbc);
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
        var service = new KioskRateLimitService(null);
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
    void successfulPinResetsTheKioskNetworkAndBrowserAttemptBuckets() {
        var jdbc = mock(org.springframework.jdbc.core.JdbcTemplate.class);
        var service = new KioskRateLimitService(jdbc);
        var context = context(17L, 7L);

        service.resetSuccessfulPinVerification(context, Map.of("pin", "12345"), "KIOSK");

        var hash = ArgumentCaptor.forClass(String.class);
        verify(jdbc, times(3)).update(
            org.mockito.ArgumentMatchers.contains("DELETE FROM kiosk_engine_rate_limit_buckets"),
            eq("PIN_VERIFICATION"), hash.capture());
        assertThat(hash.getAllValues()).doesNotHaveDuplicates().hasSize(3);
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
