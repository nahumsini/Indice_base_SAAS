package com.indice.erp.sales.publiccatalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.billing.lifecycle.CommercialLifecycleAccessService;
import com.indice.erp.config.AppWebProperties;
import com.indice.erp.kiosk.api.KioskPublicV2ExceptionHandler;
import com.indice.erp.kiosk.engine.KioskAccessLevel;
import com.indice.erp.kiosk.engine.KioskDefinitionStatus;
import com.indice.erp.kiosk.engine.KioskEngineFeatureFlags;
import com.indice.erp.kiosk.engine.KioskRateLimitService;
import com.indice.erp.kiosk.engine.KioskRateLimitType;
import com.indice.erp.kiosk.engine.KioskRegistryService;
import com.indice.erp.kiosk.engine.KioskResolvedDefinition;
import com.indice.erp.sales.publiccatalog.SalesPublicCatalogDtos.SharePreview;
import java.util.Base64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(SalesPublicCatalogSharePreviewController.class)
@Import(KioskPublicV2ExceptionHandler.class)
class SalesPublicCatalogSharePreviewControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private KioskRegistryService kioskRegistry;
    @MockBean
    private KioskRateLimitService rateLimitService;
    @MockBean
    private KioskEngineFeatureFlags featureFlags;
    @MockBean
    private CommercialLifecycleAccessService commercialAccess;
    @MockBean
    private SalesPublicCatalogService catalogService;
    @MockBean
    private AppWebProperties webProperties;
    @MockBean
    private SessionAuthService sessionAuthService;

    private KioskResolvedDefinition definition;

    @BeforeEach
    void setUp() {
        definition = new KioskResolvedDefinition(
            17L, 7L, SalesPublicCatalogService.OWNER_MODULE,
            SalesPublicCatalogService.KIOSK_TYPE, 31L, "CAT-31", "Catálogo",
            KioskDefinitionStatus.ACTIVE, 2L, 3L, null, KioskAccessLevel.PUBLIC,
            null, "tokenhint", false, 1, 1);
        given(featureFlags.registryEnabled()).willReturn(true);
        given(featureFlags.sessionsEnabled()).willReturn(true);
        given(featureFlags.auditEnabled()).willReturn(true);
        given(featureFlags.adapterEnabled(SalesPublicCatalogService.OWNER_MODULE)).willReturn(true);
        given(kioskRegistry.resolvePublicForBootstrap(
            SalesPublicCatalogService.OWNER_MODULE, "secret-token")).willReturn(definition);
        given(webProperties.getPublicUrl()).willReturn("https://app.indiceapp.com/");
    }

    @Test
    void rendersCompanyOwnedSocialMetadataWithoutIndiceBranding() throws Exception {
        var logoDataUrl = "data:image/png;base64," + Base64.getEncoder().encodeToString(new byte[] {1, 2, 3});
        given(catalogService.sharePreview(definition)).willReturn(new SharePreview(
            "Empresa <Sol>", logoDataUrl, "Catálogo verano", "Productos para escuelas"));

        mockMvc.perform(get("/api/v2/kiosks/public/secret-token/share-preview")
                .accept(MediaType.TEXT_HTML))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, containsString("no-store")))
            .andExpect(result -> assertThat(result.getResponse().getHeaders(HttpHeaders.VARY))
                .contains(HttpHeaders.USER_AGENT))
            .andExpect(content().string(containsString(
                "<title>Empresa &lt;Sol&gt; - Catálogo de productos</title>")))
            .andExpect(content().string(containsString(
                "content=\"https://app.indiceapp.com/api/v2/kiosks/public/secret-token/company-logo\"")))
            .andExpect(content().string(containsString("Productos para escuelas")))
            .andExpect(content().string(not(containsString("Indice ERP"))));

        then(commercialAccess).should().requireRead(7L);
        then(rateLimitService).should().requireAllowed(
            eq(KioskRateLimitType.BOOTSTRAP), any(), eq(java.util.Map.of()));
        then(kioskRegistry).should().touchPresence(17L);
    }

    @Test
    void servesAnUploadedCompanyLogoAsARealPublicImage() throws Exception {
        var logo = new byte[] {1, 2, 3, 4};
        var logoDataUrl = "data:image/png;base64," + Base64.getEncoder().encodeToString(logo);
        given(catalogService.sharePreview(definition)).willReturn(new SharePreview(
            "Empresa Sol", logoDataUrl, "Catálogo", "Productos"));

        mockMvc.perform(get("/api/v2/kiosks/public/secret-token/company-logo"))
            .andExpect(status().isOk())
            .andExpect(content().contentTypeCompatibleWith(MediaType.IMAGE_PNG))
            .andExpect(header().string(HttpHeaders.CACHE_CONTROL, containsString("no-store")))
            .andExpect(content().bytes(logo));

        then(rateLimitService).should().requireAllowed(
            eq(KioskRateLimitType.QUERY), any(), eq(java.util.Map.of()));
    }

    @Test
    void rejectsAResolvedKioskThatIsNotASalesPublicCatalog() throws Exception {
        var wrongType = new KioskResolvedDefinition(
            17L, 7L, SalesPublicCatalogService.OWNER_MODULE,
            "route_sales", 31L, "ROUTE-31", "Ruta",
            KioskDefinitionStatus.ACTIVE, 2L, 3L, null, KioskAccessLevel.PUBLIC,
            null, "tokenhint", false, 1, 1);
        given(kioskRegistry.resolvePublicForBootstrap(
            SalesPublicCatalogService.OWNER_MODULE, "wrong-token")).willReturn(wrongType);

        mockMvc.perform(get("/api/v2/kiosks/public/wrong-token/share-preview"))
            .andExpect(status().isNotFound());

        then(catalogService).shouldHaveNoInteractions();
    }
}
