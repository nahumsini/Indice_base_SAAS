package com.indice.erp.pos.selfservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.BootstrapResponse;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketCreateRequest;
import com.indice.erp.pos.selfservice.SelfServiceKioskDtos.PreticketReceiptResponse;
import jakarta.validation.Validator;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class SelfServiceKioskExperienceTest {

    @Test
    void forwardsTheFullResolvedDefinitionAndReturnsOnlyTheMinimalReceipt() {
        var service = mock(SelfServiceKioskService.class);
        var mapper = new ObjectMapper().findAndRegisterModules();
        var experience = new SelfServiceKioskExperience(service, mapper, mock(Validator.class));
        var definition = definition(SelfServiceKioskService.OWNER_MODULE, 7L, 2L, 3L, 11L);
        var context = KioskExecutionContext.publicLink(
            SelfServiceKioskService.OWNER_MODULE, "token").resolved(definition, null);
        var receipt = new PreticketReceiptResponse(
            "SS-20260718-A1B2C3D4", "A1B2C3D4", "PENDING", "MXN", 1,
            new BigDecimal("25.0000"), Instant.parse("2026-07-18T14:00:00Z"));
        given(service.createPreticket(any(KioskResolvedDefinition.class),
            any(PreticketCreateRequest.class))).willReturn(receipt);

        var result = experience.execute(context, KioskActionRequest.of(
            SelfServiceKioskExperience.PRETICKET_CREATE,
            Map.of("customerName", "Ana", "items", List.of(
                Map.of("productId", 91L, "quantity", BigDecimal.ONE)))));

        var captured = ArgumentCaptor.forClass(KioskResolvedDefinition.class);
        verify(service).createPreticket(captured.capture(), any(PreticketCreateRequest.class));
        assertThat(captured.getValue()).isSameAs(definition);
        assertThat(result.keySet()).containsExactlyInAnyOrder(
            "preticketNumber", "claimCode", "status", "currencyCode",
            "itemCount", "discountAmount", "totalAmount", "expiresAt");
        assertThat(result).doesNotContainKeys(
            "id", "kioskId", "cashRegisterId", "customerName", "items");
    }

    @Test
    void rejectsAnotherOwnerBeforeCallingTheSelfServiceDomain() {
        var service = mock(SelfServiceKioskService.class);
        var experience = new SelfServiceKioskExperience(
            service, new ObjectMapper().findAndRegisterModules(), mock(Validator.class));
        var wrong = definition("SALES", 7L, 2L, 3L, 11L);
        var context = KioskExecutionContext.publicLink(
            SelfServiceKioskService.OWNER_MODULE, "token").resolved(wrong, null);

        assertThatThrownBy(() -> experience.bootstrap(context))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("definition is invalid");

        verifyNoInteractions(service);
    }

    @Test
    void bootstrapUsesTheFullDefinitionAndContainsNoInternalScopeIdentifiers() {
        var service = mock(SelfServiceKioskService.class);
        var experience = new SelfServiceKioskExperience(
            service, new ObjectMapper().findAndRegisterModules(), mock(Validator.class));
        var definition = definition(SelfServiceKioskService.OWNER_MODULE, 7L, 2L, 3L, 11L);
        var context = KioskExecutionContext.publicLink(
            SelfServiceKioskService.OWNER_MODULE, "token").resolved(definition, null);
        given(service.bootstrap(definition)).willReturn(new BootstrapResponse(
            "SELF-SERVICE-01", "Autoservicio", "Indice", "Unidad", "Negocio",
            "Almacen", "Caja", "MXN", false, false, 30, 120,
            "PRETICKET_REQUIRES_CASHIER_CONFIRMATION", List.of(), "self_service",
            "READY", true));

        var result = experience.bootstrap(context);

        verify(service).bootstrap(definition);
        assertThat(result).doesNotContainKeys(
            "kioskId", "cashRegisterId", "warehouseId", "unitId", "businessId", "companyId");
        assertThat(result).containsEntry("code", "SELF-SERVICE-01");
    }

    @Test
    void acceptsSelfCheckoutAsTheSharedPublicCatalogRuntime() {
        var service = mock(SelfServiceKioskService.class);
        var experience = new SelfServiceKioskExperience(
            service, new ObjectMapper().findAndRegisterModules(), mock(Validator.class));
        var definition = new KioskResolvedDefinition(
            700L, 7L, SelfServiceKioskService.OWNER_MODULE,
            "self_checkout", 17L, "SELF-CHECKOUT-01", "Autocobro",
            KioskDefinitionStatus.ACTIVE, 2L, 3L, 11L,
            KioskAccessLevel.PUBLIC, null, "hint", false, 1, 1);
        var context = KioskExecutionContext.publicLink(
            SelfServiceKioskService.OWNER_MODULE, "token").resolved(definition, null);
        given(service.bootstrap(definition)).willReturn(new BootstrapResponse(
            "SELF-CHECKOUT-01", "Autocobro", "Indice", "Unidad", "Negocio",
            "Almacen", "Caja", "MXN", false, false, 30, 120,
            "SELF_CHECKOUT_PAYMENT_REQUIRED", List.of(), "self_checkout", "READY", true));

        assertThat(experience.bootstrap(context)).containsEntry("name", "Autocobro");
        verify(service).bootstrap(definition);
    }

    private KioskResolvedDefinition definition(
            String owner,
            long companyId,
            Long unitId,
            Long businessId,
            Long locationId) {
        return new KioskResolvedDefinition(
            700L, companyId, owner, SelfServiceKioskService.KIOSK_TYPE, 17L,
            "SELF-SERVICE-01", "Autoservicio", KioskDefinitionStatus.ACTIVE,
            unitId, businessId, locationId, KioskAccessLevel.PUBLIC, null,
            "hint", false, 1, 1);
    }
}
