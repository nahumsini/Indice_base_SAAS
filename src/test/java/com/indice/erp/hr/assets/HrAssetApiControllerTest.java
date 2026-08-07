package com.indice.erp.hr.assets;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.hr.HrAccessService;
import com.indice.erp.hr.HrAccessService.HrTab;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@WebMvcTest(HrAssetApiController.class)
class HrAssetApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @MockBean
    private HrAssetService hrAssetService;

    @MockBean
    private HrAccessService hrAccessService;

    @BeforeEach
    void allowHrAccessByDefault() {
        given(hrAccessService.canAccessManagementTab(any(AuthSessionUser.class), any(HrTab.class)))
            .willReturn(true);
    }

    @Test
    void listReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/hr/assets"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void listReturnsEnvelopeForAuthenticatedSession() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
        var asset = new LinkedHashMap<String, Object>();
        asset.put("id", 9L);
        asset.put("asset_code", "LT-1001");
        asset.put("status", "assigned");
        asset.put("value_amount", new BigDecimal("45000.00"));

        var result = new LinkedHashMap<String, Object>();
        result.put("rows", List.of(asset));
        result.put("page", 1);
        result.put("size", 20);
        result.put("total_count", 1L);
        result.put("total_pages", 1);
        result.put("summary", Map.of(
            "total_count", 1,
            "assigned_count", 1,
            "available_count", 0,
            "maintenance_count", 0,
            "custody_count", 0,
            "inactive_count", 0,
            "total_value_amount", new BigDecimal("45000.00")
        ));

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAssetService.listAssets(any(AuthSessionUser.class), any(Map.class))).willReturn(result);

        mockMvc.perform(get("/api/v1/hr/assets"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.items[0].asset_code").value("LT-1001"))
            .andExpect(jsonPath("$.summary.assigned_count").value(1));
    }

    @Test
    void userListUsesAssignedAssetScopeWhenReadableTabIsAllowed() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, 776L, "Nahum", "user");
        var asset = new LinkedHashMap<String, Object>();
        asset.put("id", 9L);
        asset.put("asset_code", "LT-SELF");
        asset.put("status", "assigned");
        asset.put("value_amount", new BigDecimal("1200.00"));

        var result = new LinkedHashMap<String, Object>();
        result.put("rows", List.of(asset));
        result.put("page", 1);
        result.put("size", 20);
        result.put("total_count", 1L);
        result.put("total_pages", 1);
        result.put("summary", Map.of(
            "total_count", 1,
            "assigned_count", 1,
            "available_count", 0,
            "maintenance_count", 0,
            "custody_count", 0,
            "inactive_count", 0,
            "total_value_amount", new BigDecimal("1200.00")
        ));

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAccessService.canAccessManagementTab(currentUser, HrTab.ASSETS)).willReturn(false);
        given(hrAccessService.canAccessReadableTab(currentUser, HrTab.ASSETS)).willReturn(true);
        given(hrAssetService.listAssignedAssets(any(AuthSessionUser.class), any(Map.class))).willReturn(result);

        mockMvc.perform(get("/api/v1/hr/assets"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.items[0].asset_code").value("LT-SELF"));
    }

    @Test
    void listReturnsForbiddenWhenAssetsTabIsDenied() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAccessService.canAccessManagementTab(currentUser, HrTab.ASSETS)).willReturn(false);

        mockMvc.perform(get("/api/v1/hr/assets"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void writeEndpointsRejectMissingCsrfBeforeCallingService() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser()));
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService)
            .requireCsrf(any(), eq(null));

        for (var request : assetWriteRequests()) {
            mockMvc.perform(request)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Invalid CSRF token."));
        }

        verifyNoInteractions(hrAssetService);
    }

    @Test
    void createReturnsCreatedAsset() throws Exception {
        var currentUser = currentUser();
        var asset = new LinkedHashMap<String, Object>();
        asset.put("id", 15L);
        asset.put("asset_code", "PHONE-2026");
        asset.put("status", "available");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAssetService.createAsset(any(AuthSessionUser.class), any(Map.class)))
            .willReturn(Map.of("asset", asset));

        mockMvc.perform(post("/api/v1/hr/assets")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "asset_code": "PHONE-2026",
                      "asset_type": "operations",
                      "name": "Operations Phone"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.asset_code").value("PHONE-2026"));

        verify(sessionCsrfService).requireCsrf(any(), eq("csrf-token"));
    }

    @Test
    void changeStatusReturnsBadRequestWhenValidationFails() throws Exception {
        var currentUser = currentUser();

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAssetService.changeStatus(any(AuthSessionUser.class), anyLong(), any(Map.class)))
            .willThrow(new IllegalArgumentException("status must be one of available, assigned, maintenance, custody, or inactive."));

        mockMvc.perform(post("/api/v1/hr/assets/8/status")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "status": "broken"
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("status must be one of available, assigned, maintenance, custody, or inactive."));
    }

    @Test
    void historyReturnsNotFoundWhenAssetDoesNotExist() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAssetService.assetHistory(any(AuthSessionUser.class), anyLong()))
            .willThrow(new NoSuchElementException("Asset not found."));

        mockMvc.perform(get("/api/v1/hr/assets/999/history"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.message").value("Asset not found."));
    }

    @Test
    void photosReturnsAssetPhotoPayloadForAuthenticatedSession() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAssetService.assetPhotos(any(AuthSessionUser.class), anyLong()))
            .willReturn(Map.of(
                "asset_id", 9L,
                "photos", List.of(Map.of(
                    "id", 44L,
                    "asset_id", 9L,
                    "file_name", "laptop-front.jpg",
                    "mime_type", "image/jpeg",
                    "size_bytes", 1200,
                    "data_url", "data:image/jpeg;base64,AAAA",
                    "download_url", "data:image/jpeg;base64,AAAA"
                ))
            ));

        mockMvc.perform(get("/api/v1/hr/assets/9/photos"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.asset_id").value(9))
            .andExpect(jsonPath("$.photos[0].file_name").value("laptop-front.jpg"));
    }

    @Test
    void detailsReturnsForbiddenWhenAssetIsOutsideOperationalScope() throws Exception {
        var currentUser = new AuthSessionUser(1L, 1L, "Scoped Admin", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(hrAssetService.assetDetails(currentUser, 44L))
            .willThrow(new HrAccessDeniedException("Forbidden"));

        mockMvc.perform(get("/api/v1/hr/assets/44"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    private AuthSessionUser currentUser() {
        return new AuthSessionUser(1L, 1L, "Usuario Demo", "admin");
    }

    private List<MockHttpServletRequestBuilder> assetWriteRequests() {
        return List.of(
            post("/api/v1/hr/assets")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"),
            put("/api/v1/hr/assets/8")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"),
            post("/api/v1/hr/assets/8/reassign")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"),
            post("/api/v1/hr/assets/8/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")
        );
    }
}
