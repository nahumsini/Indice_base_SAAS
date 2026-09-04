package com.indice.erp.finance.pettycash;

import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

@ExtendWith(MockitoExtension.class)
class PettyCashEmployeeKioskServiceTest {

    @Mock private PettyCashPublicKioskService kioskService;
    @Mock private KioskRegistryService registry;
    @Mock private JdbcTemplate jdbcTemplate;

    private PettyCashEmployeeKioskService service;

    @BeforeEach
    void setUp() {
        service = new PettyCashEmployeeKioskService(kioskService, registry, jdbcTemplate);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void responsibleEmployeeCanAccessTheExactFundAcrossPrimaryProfileScope() {
        given(jdbcTemplate.query(
            contains("FROM finance_petty_cash_funds"),
            any(RowMapper.class), any(Object[].class)))
            .willReturn(List.of(501L));

        assertThat(service.accessAllows(definition(), 501L, false)).isTrue();
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void fundAssignedToAnotherEmployeeFailsClosedEvenInsideProfileScope() {
        given(jdbcTemplate.query(
            anyString(), any(RowMapper.class), any(Object[].class)))
            .willReturn(List.of(502L));

        assertThat(service.accessAllows(definition(), 501L, true)).isFalse();
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void unassignedFundKeepsTheNormalOrganizationScopeDecision() {
        given(jdbcTemplate.query(
            anyString(), any(RowMapper.class), any(Object[].class)))
            .willReturn(Collections.singletonList(null));

        assertThat(service.accessAllows(definition(), 501L, true)).isTrue();
        assertThat(service.accessAllows(definition(), 501L, false)).isFalse();
    }

    @Test
    void bootstrapsTheResponsibleEmployeeWithoutExposingTheFundToken() {
        var response = Map.<String, Object>of(
            "authentication", "ENGINE_PIN_SESSION",
            "fund", Map.of("id", 31L));
        given(registry.publicTokenRecoverable(7L, 17L)).willReturn(true);
        given(registry.recoverPublicToken(7L, "PETTY_CASH", "receipt_capture", 31L))
            .willReturn("private-fund-token");
        given(kioskService.employeeBootstrap("private-fund-token", 7L, 501L))
            .willReturn(response);

        assertThat(service.bootstrap(definition(), 501L))
            .isSameAs(response)
            .doesNotContainValue("private-fund-token");
    }

    @Test
    void overwritesClientIdentityBeforeDelegatingToExistingFundOwnershipGuards() {
        var request = KioskActionRequest.of(
            PettyCashKioskCapabilities.RECEIPT_CREATE,
            Map.of(
                "amount", "125.00",
                "concept", "Taxi",
                "identification_token", "attacker-token"));
        var response = Map.<String, Object>of(
            "settlement_line", Map.of("id", 301L),
            "status", "CAPTURED");
        given(registry.publicTokenRecoverable(7L, 17L)).willReturn(true);
        given(registry.recoverPublicToken(7L, "PETTY_CASH", "receipt_capture", 31L))
            .willReturn("private-fund-token");
        given(kioskService.employeeIdentificationToken("private-fund-token", 7L, 501L))
            .willReturn("server-token");
        given(kioskService.publicCreateReceipt(
            org.mockito.ArgumentMatchers.eq("private-fund-token"),
            argThat(payload -> "server-token".equals(payload.get("identification_token"))
                && "125.00".equals(payload.get("amount"))
                && "Taxi".equals(payload.get("concept")))))
            .willReturn(response);
        given(kioskService.employeeMovements("private-fund-token", 7L, 501L))
            .willReturn(Map.of("expenses", java.util.List.of()));

        assertThat(service.execute(definition(), 501L, request))
            .containsEntry("settlement_line", Map.of("id", 301L))
            .containsEntry("expenses", java.util.List.of())
            .doesNotContainValue("private-fund-token")
            .doesNotContainValue("server-token");
    }

    @Test
    void isolatesMovementHistoryForTwoEmployeesAssignedToTheSameFund() {
        var request = KioskActionRequest.of(
            PettyCashKioskCapabilities.MOVEMENTS_READ, Map.of());
        var firstEmployeeHistory = Map.<String, Object>of(
            "expenses", java.util.List.of(Map.of("id", 301L)));
        var secondEmployeeHistory = Map.<String, Object>of(
            "expenses", java.util.List.of(Map.of("id", 302L)));
        given(registry.publicTokenRecoverable(7L, 17L)).willReturn(true);
        given(registry.recoverPublicToken(7L, "PETTY_CASH", "receipt_capture", 31L))
            .willReturn("private-fund-token");
        given(kioskService.employeeMovements("private-fund-token", 7L, 501L))
            .willReturn(firstEmployeeHistory);
        given(kioskService.employeeMovements("private-fund-token", 7L, 502L))
            .willReturn(secondEmployeeHistory);

        assertThat(service.execute(definition(), 501L, request))
            .isSameAs(firstEmployeeHistory)
            .isNotSameAs(secondEmployeeHistory);
        assertThat(service.execute(definition(), 502L, request))
            .isSameAs(secondEmployeeHistory)
            .isNotSameAs(firstEmployeeHistory);

        then(kioskService).should(never()).publicMovements(
            org.mockito.ArgumentMatchers.anyString(),
            org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void replacesLegacyMutationHistoryWithTheAuthenticatedEmployeesHistory() {
        var request = KioskActionRequest.of(
            PettyCashKioskCapabilities.RECEIPT_CREATE,
            Map.of("amount", "125.00", "concept", "Taxi"));
        given(registry.publicTokenRecoverable(7L, 17L)).willReturn(true);
        given(registry.recoverPublicToken(7L, "PETTY_CASH", "receipt_capture", 31L))
            .willReturn("private-fund-token");
        given(kioskService.employeeIdentificationToken("private-fund-token", 7L, 501L))
            .willReturn("server-token");
        given(kioskService.publicCreateReceipt(
            org.mockito.ArgumentMatchers.eq("private-fund-token"),
            org.mockito.ArgumentMatchers.anyMap()))
            .willReturn(Map.of(
                "settlement_line", Map.of("id", 301L),
                "statement", Map.of("verified_expense_amount", "9999.00"),
                "expenses", java.util.List.of(Map.of("id", 999L))));
        given(kioskService.employeeMovements("private-fund-token", 7L, 501L))
            .willReturn(Map.of(
                "expenses", java.util.List.of(Map.of("id", 301L))));

        var response = service.execute(definition(), 501L, request);

        assertThat(response.get("settlement_line")).isEqualTo(Map.of("id", 301L));
        assertThat(response.get("expenses"))
            .isEqualTo(java.util.List.of(Map.of("id", 301L)));
        assertThat(response).doesNotContainKey("statement");
        assertThat(response.toString()).doesNotContain("999");
    }

    @Test
    void rejectsIdentityVerificationBecauseTheParentPinAlreadyIdentifiedTheEmployee() {
        given(registry.publicTokenRecoverable(7L, 17L)).willReturn(true);

        assertThatThrownBy(() -> service.execute(
            definition(), 501L,
            KioskActionRequest.of(
                PettyCashKioskCapabilities.IDENTITY_VERIFY,
                Map.of("pin", "123456"))))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("already provided");
    }

    @Test
    void requiresEmployeeReceiptOwnershipBeforeRegisteringEvidence() {
        var request = KioskActionRequest.forResource(
            PettyCashKioskCapabilities.ATTACHMENT_REGISTER,
            301L,
            Map.of("object_key", "finance/petty-cash/receipt.pdf"));
        var response = Map.<String, Object>of("id", 88L);
        given(registry.publicTokenRecoverable(7L, 17L)).willReturn(true);
        given(registry.recoverPublicToken(7L, "PETTY_CASH", "receipt_capture", 31L))
            .willReturn("private-fund-token");
        given(kioskService.employeeIdentificationToken("private-fund-token", 7L, 501L))
            .willReturn("server-token");
        given(kioskService.publicRegisterAttachment(
            org.mockito.ArgumentMatchers.eq("private-fund-token"),
            org.mockito.ArgumentMatchers.eq(301L),
            org.mockito.ArgumentMatchers.anyMap())).willReturn(response);

        assertThat(service.execute(definition(), 501L, request)).isSameAs(response);

        then(kioskService).should().requireEmployeeOwnedReceipt(
            "private-fund-token", 7L, 501L, 301L);
    }

    @Test
    void failsClosedWhenTheLegacyLinkCannotBeRecovered() {
        given(registry.publicTokenRecoverable(7L, 17L)).willReturn(false);

        assertThat(service.supports(definition())).isFalse();
        assertThatThrownBy(() -> service.bootstrap(definition(), 501L))
            .isInstanceOf(SecurityException.class)
            .hasMessageContaining("not available");
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void repairsAnActiveLegacyFundTokenBeforePublishingItInTheCatalog() {
        given(registry.publicTokenRecoverable(7L, 17L)).willReturn(false, true);
        given(jdbcTemplate.query(
            contains("SELECT kiosk_public_token"),
            any(RowMapper.class), any(Object[].class)))
            .willReturn(List.of("legacy-fund-token"));
        given(registry.repairLegacyPublicTokenRecoveryMaterial(
            7L, 17L, "PETTY_CASH", "receipt_capture", 31L, "legacy-fund-token"))
            .willReturn(true);

        assertThat(service.supports(definition())).isTrue();

        then(registry).should().repairLegacyPublicTokenRecoveryMaterial(
            7L, 17L, "PETTY_CASH", "receipt_capture", 31L, "legacy-fund-token");
        then(registry).should(times(2)).publicTokenRecoverable(7L, 17L);
    }

    @Test
    @SuppressWarnings({"rawtypes", "unchecked"})
    void legacyRepairFailsClosedWhenTheOwnerFundIsNotActive() {
        given(registry.publicTokenRecoverable(7L, 17L)).willReturn(false);
        given(jdbcTemplate.query(
            contains("SELECT kiosk_public_token"),
            any(RowMapper.class), any(Object[].class)))
            .willReturn(List.of());

        assertThat(service.supports(definition())).isFalse();

        then(registry).should(never()).repairLegacyPublicTokenRecoveryMaterial(
            anyLong(), anyLong(), anyString(), anyString(), anyLong(), anyString());
    }

    private KioskResolvedDefinition definition() {
        return new KioskResolvedDefinition(
            17L, 7L, PettyCashKioskCapabilities.OWNER_MODULE,
            PettyCashKioskCapabilities.KIOSK_TYPE, 31L,
            "PETTY-31", "Caja operativa", KioskDefinitionStatus.ACTIVE,
            2L, 3L, null, KioskAccessLevel.CONTROLLED,
            null, "tokenhint", true, 1, 1);
    }
}
