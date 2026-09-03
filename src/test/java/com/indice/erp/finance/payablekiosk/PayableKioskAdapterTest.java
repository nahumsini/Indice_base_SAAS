package com.indice.erp.finance.payablekiosk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.finance.kiosk.FinanceKioskModuleAuditService;
import com.indice.erp.finance.payablekiosk.dto.PublicProviderRegistrationRequest;
import com.indice.erp.finance.payablekiosk.dto.PublicPayableRequest;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskActionRequest;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskExecutionContext;
import com.indice.erp.kiosk.engine.KioskExecutionChannels;
import com.indice.erp.kiosk.engine.KioskIdentityBiometricService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.kiosk.engine.KioskSessionPrincipal;
import jakarta.validation.Validation;
import java.time.Instant;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

@ExtendWith(MockitoExtension.class)
class PayableKioskAdapterTest {

    @Mock
    private PayableKioskService service;

    @Mock
    private FinanceKioskModuleAuditService moduleAudit;

    @Mock
    private KioskIdentityBiometricService biometrics;

    @Mock
    private PayableEmployeeKioskService employeeCenter;

    private PayableKioskAdapter adapter;

    @BeforeEach
    void setUp() {
        var validator = Validation.buildDefaultValidatorFactory().getValidator();
        adapter = new PayableKioskAdapter(
            service, new ObjectMapper(), moduleAudit, validator, biometrics, employeeCenter);
    }

    @Test
    void permitsAnonymousProviderRegistrationAndAuditsItAsReviewRequired() {
        var context = publicContext();
        var request = KioskActionRequest.of(
            PayableKioskCapabilities.PROVIDER_REGISTER,
            Map.of("name", "Proveedor Norte", "email", "ventas@example.com"));
        given(service.registerProvider(eq("payable-token"), any(PublicProviderRegistrationRequest.class)))
            .willReturn(Map.of("providerId", 91L, "status", "PENDING_REVIEW"));

        assertThat(adapter.authorize(context, request).allowed()).isTrue();
        var result = adapter.execute(context, request);

        assertThat(result).containsEntry("providerId", 91L);
        var registration = ArgumentCaptor.forClass(PublicProviderRegistrationRequest.class);
        then(service).should().registerProvider(eq("payable-token"), registration.capture());
        assertThat(registration.getValue().name()).isEqualTo("Proveedor Norte");
        then(moduleAudit).should().success(
            context, "PROVIDER_REGISTRATION_SUBMITTED", "PROVIDER", 91L,
            Map.of("policy", "REVIEW_REQUIRED"));
    }

    @Test
    void providerAndEmployeeSessionsCanSubmitPayablesOrEvidence() {
        var request = KioskActionRequest.of(
            PayableKioskCapabilities.PAYABLE_CREATE,
            Map.of("concept", "Servicio"));

        assertThatThrownBy(() -> adapter.authorize(publicContext(), request).requireAllowed())
            .isInstanceOf(SecurityException.class)
            .hasMessage("Personal kiosk authentication is required.");
        assertThat(adapter.authorize(providerContext(), request).allowed()).isTrue();
        assertThat(adapter.authorize(employeeContext(), request).allowed()).isTrue();
    }

    @Test
    void employeeSubmissionKeepsEmployeeIdentityAndSelectedProviderSeparate() {
        var context = employeeContext();
        var request = KioskActionRequest.of(
            PayableKioskCapabilities.PAYABLE_CREATE,
            Map.of(
                "providerId", 222L,
                "concept", "Servicio",
                "subtotalAmount", 100,
                "taxAmount", 0,
                "totalAmount", 100,
                "currencyCode", "MXN"));
        given(service.createPayableForIdentity(
            eq("payable-token"), eq("EMPLOYEE"), eq(44L), any(PublicPayableRequest.class)))
            .willReturn(Map.of("expenseId", 901L, "status", "DRAFT"));

        var response = adapter.execute(context, request);

        assertThat(response).containsEntry("expenseId", 901L);
        var payload = ArgumentCaptor.forClass(PublicPayableRequest.class);
        then(service).should().createPayableForIdentity(
            eq("payable-token"), eq("EMPLOYEE"), eq(44L), payload.capture());
        assertThat(payload.getValue().providerId()).isEqualTo(222L);
    }

    @Test
    void mobileEmployeeChannelUsesTheInternalBridgeAndExcludesProviderOnlyCapabilities() {
        var definition = definition();
        var context = mobileEmployeeContext(definition);
        var request = KioskActionRequest.of(
            PayableKioskCapabilities.PAYABLE_CREATE,
            Map.of("providerId", 222L, "concept", "Servicio"));
        given(employeeCenter.supports(definition)).willReturn(true);
        given(employeeCenter.bootstrap(definition, 9L))
            .willReturn(Map.of("scope_label", "Unidad Norte · Negocio Centro"));
        given(employeeCenter.execute(definition, 9L, request))
            .willReturn(Map.of("expenseId", 902L, "status", "DRAFT"));

        assertThat(adapter.supportsEmployeeCenter(definition)).isTrue();
        assertThat(adapter.employeeCenterTabPermissionKeys(definition))
            .containsExactly("expenses.expenses");
        assertThat(adapter.employeeCapabilityTabPermissionKeys(
            definition, capability(PayableKioskCapabilities.PAYABLE_CREATE)))
            .containsExactly("expenses.expenses");
        assertThat(adapter.employeeCapabilityTabPermissionKeys(
            definition, capability(PayableKioskCapabilities.PROVIDER_REGISTER)))
            .isEmpty();
        assertThat(adapter.employeeBootstrap(context))
            .containsEntry("scope_label", "Unidad Norte · Negocio Centro");
        assertThat(adapter.authorize(context, request).allowed()).isTrue();
        assertThat(adapter.executeEmployee(context, request))
            .containsEntry("expenseId", 902L);

        then(employeeCenter).should().bootstrap(definition, 9L);
        then(employeeCenter).should().execute(definition, 9L, request);
        then(service).shouldHaveNoInteractions();
    }

    @Test
    void rejectsInvalidRegistrationBeforeCallingTheModule() {
        var request = KioskActionRequest.of(
            PayableKioskCapabilities.PROVIDER_REGISTER,
            Map.of("name", "Proveedor Norte", "email", "not-an-email"));

        assertThatThrownBy(() -> adapter.execute(publicContext(), request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("email");
        then(service).should(never()).registerProvider(any(), any());
    }

    @Test
    void delegatesFacialEnrollmentOnlyForTheAuthenticatedProviderContext() {
        var context = providerContext();
        var payload = Map.<String, Object>of("consent", true);
        var request = KioskActionRequest.of(PayableKioskCapabilities.FACE_ENROLLMENT_BEGIN, payload);
        given(biometrics.beginEnrollment(context, payload))
            .willReturn(Map.of("enrollmentId", "enrollment-1", "status", "PENDING"));

        assertThat(adapter.authorize(context, request).allowed()).isTrue();
        assertThat(adapter.execute(context, request))
            .containsEntry("enrollmentId", "enrollment-1");
        then(biometrics).should().beginEnrollment(context, payload);

        assertThatThrownBy(() -> adapter.authorize(publicContext(), request).requireAllowed())
            .isInstanceOf(SecurityException.class)
            .hasMessage("Personal kiosk authentication is required.");
    }

    private KioskExecutionContext publicContext() {
        return KioskExecutionContext.publicLink(PayableKioskCapabilities.OWNER_MODULE, "payable-token")
            .resolved(definition(), null);
    }

    private KioskExecutionContext providerContext() {
        var session = new KioskSessionPrincipal(
            "session-provider", 17L, 7L, "PROVIDER", 91L,
            Set.of(PayableKioskCapabilities.PAYABLE_CREATE + "@1"),
            Instant.now().plusSeconds(600));
        return KioskExecutionContext.publicLink(PayableKioskCapabilities.OWNER_MODULE, "payable-token")
            .resolved(definition(), session);
    }

    private KioskExecutionContext employeeContext() {
        var session = new KioskSessionPrincipal(
            "session-employee", 17L, 7L, "EMPLOYEE", 44L,
            Set.of(PayableKioskCapabilities.PAYABLE_CREATE + "@1"),
            Instant.now().plusSeconds(600));
        return KioskExecutionContext.publicLink(PayableKioskCapabilities.OWNER_MODULE, "payable-token")
            .resolved(definition(), session);
    }

    private KioskExecutionContext mobileEmployeeContext(KioskResolvedDefinition definition) {
        var session = new KioskSessionPrincipal(
            "mobile-employee", definition.id(), definition.companyId(), "USER", 9L,
            Set.of(PayableKioskCapabilities.PAYABLE_CREATE + "@1"),
            Instant.now().plusSeconds(600));
        return new KioskExecutionContext(
            PayableKioskCapabilities.OWNER_MODULE,
            KioskExecutionChannels.MOBILE_MULTI_KIOSK,
            "definition:" + definition.id(), "internal", "browser")
            .resolved(definition, session);
    }

    private com.indice.erp.kiosk.engine.KioskCapabilityDescriptor capability(String key) {
        return PayableKioskCapabilities.descriptors().stream()
            .filter(candidate -> candidate.key().equals(key))
            .findFirst()
            .orElseThrow();
    }

    private KioskResolvedDefinition definition() {
        return new KioskResolvedDefinition(
            17L, 7L, PayableKioskCapabilities.OWNER_MODULE, "payable_submission", 31L,
            "PAYABLES", "Payables", KioskDefinitionStatus.ACTIVE, 2L, 3L, null,
            KioskAccessLevel.CONTROLLED, null, "tokenhint", true, 1, 1);
    }
}
