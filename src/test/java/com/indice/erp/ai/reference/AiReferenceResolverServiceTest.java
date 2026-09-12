package com.indice.erp.ai.reference;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.ai.access.AiToolAuthorizationService;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.PageRequest;
import com.indice.erp.ai.reference.AiReferenceResolverContracts.FundReference;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.dashboard.OrganizationReadService;
import com.indice.erp.dashboard.OrganizationReadService.BusinessReference;
import com.indice.erp.dashboard.OrganizationReadService.OrganizationStructure;
import com.indice.erp.dashboard.OrganizationReadService.UnitReference;
import com.indice.erp.finance.FinanceAccessService;
import com.indice.erp.finance.paymentaccounts.PaymentAccountService;
import com.indice.erp.finance.paymentaccounts.PaymentAccountStatus;
import com.indice.erp.finance.paymentaccounts.PaymentAccountType;
import com.indice.erp.finance.paymentaccounts.dto.PaymentAccountListResponse;
import com.indice.erp.finance.paymentaccounts.dto.PaymentAccountResponse;
import com.indice.erp.finance.pettycash.PettyCashService;
import com.indice.erp.finance.shared.FinanceContext;
import com.indice.erp.finance.shared.FinanceScope;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Arrays;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AiReferenceResolverServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-12T04:00:00Z");
    private static final AuthSessionUser USER = new AuthSessionUser(3L, 23L, 41L, "Reader", "admin");

    @Mock private AiToolAuthorizationService authorizationService;
    @Mock private OrganizationReadService organizationReadService;
    @Mock private FinanceAccessService financeAccessService;
    @Mock private PaymentAccountService paymentAccountService;
    @Mock private PettyCashService pettyCashService;

    private AiReferenceResolverService service;

    @BeforeEach
    void setUp() {
        service = new AiReferenceResolverService(
            authorizationService,
            organizationReadService,
            financeAccessService,
            paymentAccountService,
            pettyCashService,
            Clock.fixed(NOW, ZoneOffset.UTC)
        );
    }

    @Test
    void organizationReferencesUseOpaqueCursorAndCompleteAuthorizedTotal() {
        when(authorizationService.canReadOrganizationStructure(USER)).thenReturn(true);
        when(organizationReadService.visibleStructure(USER)).thenReturn(new OrganizationStructure(
            List.of(
                new UnitReference(10L, "North", "active"),
                new UnitReference(20L, "South", "active")
            ),
            List.of(new BusinessReference(101L, 10L, "North store", "North", "active")),
            "CORPORATE_OFFICE"
        ));

        var first = service.listUnitsAndBusinesses(USER, new PageRequest(null, 2, null));
        var second = service.listUnitsAndBusinesses(USER, new PageRequest(null, 2, first.nextCursor()));

        assertEquals(2, first.returnedCount());
        assertEquals(3, first.totalCount());
        assertTrue(first.hasMore());
        assertNotNull(first.nextCursor());
        assertFalse(first.nextCursor().contains("2"));
        assertEquals(1, second.returnedCount());
        assertFalse(second.hasMore());
    }

    @Test
    void paymentAccountsUseOnlyTheServerResolvedFinanceScope() {
        var context = financeContext();
        when(authorizationService.canReadPaymentAccounts(USER)).thenReturn(true);
        when(financeAccessService.resolvePaymentAccountContext(USER)).thenReturn(Optional.of(context));
        var account = new PaymentAccountResponse(
            77L, 23L, 10L, 101L, "Main bank", PaymentAccountType.BANK, "MXN",
            BigDecimal.ZERO, new BigDecimal("1500.00"), PaymentAccountStatus.ACTIVE,
            null, 3L, null, NOW, null, null, 0L, null, null
        );
        when(paymentAccountService.list(context)).thenReturn(new PaymentAccountListResponse(List.of(account), 1));

        var result = service.listPaymentAccounts(USER, new PageRequest("bank", 10, null));

        assertEquals(1, result.totalCount());
        assertEquals(77L, result.items().getFirst().id());
        assertEquals("BUSINESS_OFFICE", result.scopeType());
        verify(paymentAccountService).list(context);
    }

    @Test
    void fundResolverUsesReadOnlyOwnerContractAndOmitsKioskCredentials() {
        var context = financeContext();
        when(authorizationService.canReadPettyCash(USER)).thenReturn(true);
        when(financeAccessService.resolveContext(USER)).thenReturn(Optional.of(context));
        when(pettyCashService.listFunds(context)).thenReturn(List.of());

        var result = service.listFunds(USER, null);

        assertEquals(0, result.totalCount());
        assertFalse(Arrays.stream(FundReference.class.getRecordComponents())
            .anyMatch(component -> component.getName().toLowerCase().contains("kiosk")));
        verify(pettyCashService).listFunds(context);
        verify(pettyCashService, never()).workspace(context);
    }

    @Test
    void revokedCurrentPermissionFailsBeforeCallingAnOwnerService() {
        when(authorizationService.canReadOrganizationStructure(USER)).thenReturn(false);

        assertThrows(SecurityException.class, () -> service.getMyBusinessContext(USER));

        verifyNoInteractions(organizationReadService, financeAccessService, paymentAccountService, pettyCashService);
    }

    @Test
    void invalidOrOutOfRangeCursorFailsClosed() {
        when(authorizationService.canReadOrganizationStructure(USER)).thenReturn(true);
        assertThrows(
            IllegalArgumentException.class,
            () -> service.listUnitsAndBusinesses(USER, new PageRequest(null, 25, "not-a-cursor"))
        );
    }

    private FinanceContext financeContext() {
        return new FinanceContext(3L, 23L, "Reader", "admin", true, FinanceScope.businessOffice(10L, 101L));
    }
}
