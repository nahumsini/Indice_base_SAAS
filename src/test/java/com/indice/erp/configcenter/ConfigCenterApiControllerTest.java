package com.indice.erp.configcenter;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doThrow;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.billing.seats.SeatCapacityExceededException;
import com.indice.erp.billing.seats.SeatService.SeatSnapshot;
import com.indice.erp.config.AppWebProperties;
import com.indice.erp.configcenter.ConfigCenterAccessService.ConfigCenterTab;
import com.indice.erp.hr.HrAccessDeniedException;
import com.indice.erp.location.GoogleMapsCoordinateExtractor;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(ConfigCenterApiController.class)
class ConfigCenterApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @MockBean
    private ConfigCenterAccessService accessService;

    @MockBean
    private ConfigCenterService configCenterService;

    @MockBean
    private GoogleMapsCoordinateExtractor googleMapsCoordinateExtractor;

    @MockBean
    private InvitationEmailService invitationEmailService;

    @MockBean
    private InvitationSeatCoordinator invitationSeatCoordinator;

    @MockBean
    private AppWebProperties appWebProperties;

    @BeforeEach
    void allowConfigCenterAccessByDefault() {
        given(accessService.canAccess(any(AuthSessionUser.class), any(ConfigCenterTab.class))).willReturn(true);
        given(accessService.canAccessAny(any(AuthSessionUser.class), any(ConfigCenterTab[].class))).willReturn(true);
    }

    @Test
    void currentUserReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/config-center/current-user"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void usersReturnsCatalogPayloadForAuthenticatedSession() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");
        var payload = Map.of(
            "users", List.of(
                Map.of(
                    "id", 1L,
                    "email", "demo@example.com",
                    "nombres", "Usuario",
                    "apellidos", "Demo",
                    "role", "admin",
                    "status", "active",
                    "scope_type", "corporate_office",
                    "module_slugs", List.of("config_center")
                )
            ),
            "catalog", Map.of(
                "units", List.of(Map.of("id", 1L, "name", "Corporate office")),
                "businesses", List.of(Map.of("id", 5L, "name", "Spring Biz A")),
                "modules", List.of(Map.of("slug", "config_center", "name", "Panel Inicial"))
            )
        );

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(configCenterService.getUsers(currentUser)).willReturn(payload);

        mockMvc.perform(get("/api/v1/config-center/users"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.users[0].email").value("demo@example.com"))
            .andExpect(jsonPath("$.catalog.units[0].name").value("Corporate office"))
            .andExpect(jsonPath("$.catalog.businesses[0].name").value("Spring Biz A"))
            .andExpect(jsonPath("$.catalog.modules[0].slug").value("config_center"));
    }

    @Test
    void usersReturnsForbiddenForNormalUser() throws Exception {
        var currentUser = new AuthSessionUser(2L, 7L, "Usuario Demo", "user");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(accessService.canAccess(currentUser, ConfigCenterTab.USERS)).willReturn(false);

        mockMvc.perform(get("/api/v1/config-center/users"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void usersReturnsSelfPayloadForNormalUserWithUsersTabAccess() throws Exception {
        var currentUser = new AuthSessionUser(2L, 7L, "Usuario Demo", "user");
        var payload = Map.of(
            "users", List.of(Map.of("id", 2L, "email", "demo@example.com")),
            "catalog", Map.of("units", List.of(), "businesses", List.of(), "modules", List.of())
        );

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(accessService.canAccess(currentUser, ConfigCenterTab.USERS)).willReturn(true);
        given(configCenterService.getUsers(currentUser)).willReturn(payload);

        mockMvc.perform(get("/api/v1/config-center/users"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.users[0].id").value(2));
    }

    @Test
    void saveCompanyReturnsWrappedPayloadForAuthenticatedSession() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");
        var savedPayload = Map.<String, Object>of(
            "nombre_empresa", "Empresa Demo Spring",
            "industria", "Retail",
            "descripcion", "Updated description"
        );

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(configCenterService.saveEmpresa(org.mockito.ArgumentMatchers.eq(7L), org.mockito.ArgumentMatchers.eq(1L), anyMap()))
            .willReturn(savedPayload);

        mockMvc.perform(put("/api/v1/config-center/company")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "nombre_empresa": "Empresa Demo Spring",
                      "industria": "Retail",
                      "descripcion": "Updated description"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.logo").isEmpty())
            .andExpect(jsonPath("$.data.nombre_empresa").value("Empresa Demo Spring"))
            .andExpect(jsonPath("$.message").value("Company data saved"));
    }

    @Test
    void companyReturnsScopedPayloadForAuthenticatedSession() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(configCenterService.getEmpresa(currentUser)).willReturn(Map.of(
            "id", 7L,
            "nombre_empresa", "Empresa Demo Spring",
            "colaboradores", 4,
            "map", List.of(
                Map.of(
                    "name", "North Unit",
                    "legacy_unit_id", 12L,
                    "businesses", List.of(
                        Map.of("name", "North Biz", "legacy_business_id", 21L)
                    )
                )
            )
        ));

        mockMvc.perform(get("/api/v1/config-center/company"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.nombre_empresa").value("Empresa Demo Spring"))
            .andExpect(jsonPath("$.colaboradores").value(4))
            .andExpect(jsonPath("$.map[0].legacy_unit_id").value(12))
            .andExpect(jsonPath("$.map[0].businesses[0].legacy_business_id").value(21));
    }

    @Test
    void saveCurrentUserReturnsUpdatedUserPayload() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");
        var savedUser = Map.<String, Object>ofEntries(
            Map.entry("id", 1L),
            Map.entry("email", "demo@example.com"),
            Map.entry("nombres", "Usuario Spring Demo"),
            Map.entry("apellidos", "Activo"),
            Map.entry("primer_nombre", "Usuario Spring Demo"),
            Map.entry("apellido_paterno", "Activo"),
            Map.entry("telefono", "+1 555-0100"),
            Map.entry("country", "CA"),
            Map.entry("preferred_language", "en-US"),
            Map.entry("avatar_url", ""),
            Map.entry("role", "admin")
        );

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(configCenterService.saveCurrentUser(
            org.mockito.ArgumentMatchers.eq(7L),
            org.mockito.ArgumentMatchers.eq(1L),
            org.mockito.ArgumentMatchers.eq("admin"),
            anyMap()
        ))
            .willReturn(savedUser);

        mockMvc.perform(put("/api/v1/config-center/current-user")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "primer_nombre": "Usuario",
                      "segundo_nombre": "Spring",
                      "apellido_paterno": "Demo",
                      "apellido_materno": "Activo",
                      "telefono": "+1 555-0100",
                      "country": "CA",
                      "preferred_language": "en-US"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.email").value("demo@example.com"))
            .andExpect(jsonPath("$.telefono").value("+1 555-0100"))
            .andExpect(jsonPath("$.country").value("CA"))
            .andExpect(jsonPath("$.preferred_language").value("en-US"));
    }

    @Test
    void saveStructureReturnsBadRequestWhenValidationFails() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(configCenterService.saveStructure(org.mockito.ArgumentMatchers.eq(currentUser), anyMap()))
            .willThrow(new IllegalArgumentException("radius_meters must be greater than zero."));

        mockMvc.perform(put("/api/v1/config-center/business-structure")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "estructura": "multi",
                      "map": [
                        {
                          "name": "Unit",
                          "businesses": [
                            {
                              "name": "Business",
                              "latitude": 25.6866140,
                              "longitude": -100.3161130,
                              "radius_meters": 0
                            }
                          ]
                        }
                      ]
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("radius_meters must be greater than zero."));
    }

    @Test
    void saveStructureReturnsForbiddenWhenCurrentScopeCannotWriteWholeStructure() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(configCenterService.saveStructure(org.mockito.ArgumentMatchers.eq(currentUser), anyMap()))
            .willThrow(new HrAccessDeniedException("Forbidden"));

        mockMvc.perform(put("/api/v1/config-center/business-structure")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "estructura": "multi",
                      "map": []
                    }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void extractCoordinatesReturnsSharedGoogleMapsResult() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(googleMapsCoordinateExtractor.extractCoordinatesFromMapLink(anyMap()))
            .willReturn(Map.of(
                "latitude", 19.432608,
                "longitude", -99.133209,
                "resolved_url", "https://www.google.com/maps/@19.432608,-99.133209,17z"
            ));

        mockMvc.perform(post("/api/v1/config-center/locations/extract-coordinates")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "map_url": "https://www.google.com/maps/@19.432608,-99.133209,17z"
                    }
                    """))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.latitude").value(19.432608))
            .andExpect(jsonPath("$.longitude").value(-99.133209))
            .andExpect(jsonPath("$.resolved_url").value("https://www.google.com/maps/@19.432608,-99.133209,17z"));
    }

    @Test
    void inviteUserReturnsInviteLink() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");
        var inviteResult = Map.<String, Object>of(
            "email", "invite@example.com",
            "full_name", "Pending Invite",
            "token", "abcdef123456"
        );

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(appWebProperties.resolveInvitationBaseUrl()).willReturn("");
        given(appWebProperties.getAllowedOrigins()).willReturn(List.of("http://localhost:5173"));
        given(invitationSeatCoordinator.invite(
            org.mockito.ArgumentMatchers.eq(7L),
            org.mockito.ArgumentMatchers.eq(1L),
            org.mockito.ArgumentMatchers.eq("admin"),
            anyMap()
        ))
            .willReturn(inviteResult);
        given(invitationEmailService.sendInvitation(anyString(), anyString(), anyString()))
            .willReturn(InvitationEmailResult.sentSuccessfully());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/config-center/users/invite")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Pending Invite",
                      "email": "invite@example.com",
                      "role": "user",
                      "unit_id": 3,
                      "business_id": 9,
                      "module_slugs": ["config_center"],
                      "tab_permission_keys": ["config_center.profile"]
                    }
                    """)
                .header("Referer", "http://localhost:5173/dashboard/users"))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.email").value("invite@example.com"))
            .andExpect(jsonPath("$.invite_link").value("http://localhost:5173/invite/abcdef123456"))
            .andExpect(jsonPath("$.email_sent").value(true))
            .andExpect(jsonPath("$.email_status").value("sent"));
    }

    @Test
    void inviteUserReturnsConflictWhenSeatsAreFull() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(invitationSeatCoordinator.invite(
            org.mockito.ArgumentMatchers.eq(7L),
            org.mockito.ArgumentMatchers.eq(1L),
            org.mockito.ArgumentMatchers.eq("admin"),
            anyMap()
        )).willThrow(seatLimitError());

        mockMvc.perform(post("/api/v1/config-center/users/invite")
                .contentType(APPLICATION_JSON)
                .content("{\"name\":\"Pending\",\"email\":\"pending@example.com\"}"))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.code").value("SEAT_CAPACITY_EXCEEDED"))
            .andExpect(jsonPath("$.seats.limit").value(5))
            .andExpect(jsonPath("$.seats.available").value(0));
    }

    @Test
    void inviteUserReturnsForbiddenForNormalUser() throws Exception {
        var currentUser = new AuthSessionUser(2L, 7L, "Usuario Demo", "user");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(accessService.canAccess(currentUser, ConfigCenterTab.USERS)).willReturn(false);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/config-center/users/invite")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Pending Invite",
                      "email": "invite@example.com",
                      "role": "user"
                    }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void inviteUserReturnsForbiddenForReadOnlyNormalUserWithUsersTabAccess() throws Exception {
        var currentUser = new AuthSessionUser(2L, 7L, "Usuario Demo", "user");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(accessService.canAccess(currentUser, ConfigCenterTab.USERS)).willReturn(true);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/config-center/users/invite")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Pending Invite",
                      "email": "invite@example.com",
                      "role": "user"
                    }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void updateUserRequiresValidCsrfToken() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        doThrow(new IllegalArgumentException("Invalid CSRF token."))
            .when(sessionCsrfService)
            .requireCsrf(any(), org.mockito.ArgumentMatchers.isNull());

        mockMvc.perform(put("/api/v1/config-center/users/2")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "role": "user",
                      "status": "active",
                      "unit_id": 1,
                      "business_id": 2,
                      "module_slugs": ["config_center"],
                      "tab_permission_keys": ["config_center.users"]
                    }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));
    }

    @Test
    void saveStructureReturnsForbiddenWhenBusinessStructureTabIsDenied() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(accessService.canAccess(currentUser, ConfigCenterTab.BUSINESS_STRUCTURE)).willReturn(false);

        mockMvc.perform(put("/api/v1/config-center/business-structure")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "estructura": "multi",
                      "map": []
                    }
                    """))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void companyReturnsForbiddenWhenCompanyTabsAreDenied() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(accessService.canAccessAny(
            org.mockito.ArgumentMatchers.eq(currentUser),
            org.mockito.ArgumentMatchers.eq(ConfigCenterTab.BUSINESS_STRUCTURE),
            org.mockito.ArgumentMatchers.eq(ConfigCenterTab.BUSINESS_PROFILE)
        )).willReturn(false);

        mockMvc.perform(get("/api/v1/config-center/company"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void deleteUserRemovesCompanyAccess() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(configCenterService.deleteUser(7L, 1L, "admin", 5L))
            .willReturn(Map.of("success", true, "deleted", true));

        mockMvc.perform(delete("/api/v1/config-center/users/5"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.deleted").value(true));
    }

    @Test
    void deleteUserRejectsCurrentSessionUser() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(configCenterService.deleteUser(7L, 1L, "admin", 1L))
            .willThrow(new IllegalArgumentException("You cannot deactivate your own user."));

        mockMvc.perform(delete("/api/v1/config-center/users/1"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("You cannot deactivate your own user."));
    }

    @Test
    void deleteInvitationCancelsPendingInvitation() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(invitationSeatCoordinator.delete(7L, 1L, "admin", 12L))
            .willReturn(Map.of("success", true, "deleted", true));

        mockMvc.perform(delete("/api/v1/config-center/users/invitations/12"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.deleted").value(true));
    }

    private SeatCapacityExceededException seatLimitError() {
        return new SeatCapacityExceededException(
            "The company has reached its seat limit. Purchase another seat before inviting this user.",
            new SeatSnapshot(7L, true, 5, 0, 0, 5, 0)
        );
    }
}
