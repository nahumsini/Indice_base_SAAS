package com.indice.erp.configcenter;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.BDDMockito.given;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import java.util.List;
import java.util.Map;
import java.util.Optional;
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
    private ConfigCenterService configCenterService;

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
                    "module_slugs", List.of("config_center")
                )
            ),
            "catalog", Map.of(
                "businesses", List.of(Map.of("id", 5L, "name", "Spring Biz A")),
                "modules", List.of(Map.of("slug", "config_center", "name", "Panel Inicial"))
            )
        );

        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(configCenterService.getUsers(7L)).willReturn(payload);

        mockMvc.perform(get("/api/v1/config-center/users"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.users[0].email").value("demo@example.com"))
            .andExpect(jsonPath("$.catalog.businesses[0].name").value("Spring Biz A"))
            .andExpect(jsonPath("$.catalog.modules[0].slug").value("config_center"));
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
        given(configCenterService.saveEmpresa(org.mockito.ArgumentMatchers.eq(7L), anyMap()))
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
        given(configCenterService.saveCurrentUser(org.mockito.ArgumentMatchers.eq(1L), org.mockito.ArgumentMatchers.eq("admin"), anyMap()))
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
        given(configCenterService.saveStructure(org.mockito.ArgumentMatchers.eq(7L), anyMap()))
            .willThrow(new IllegalArgumentException("At least one unit is required in multi mode."));

        mockMvc.perform(put("/api/v1/config-center/business-structure")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "estructura": "multi",
                      "map": []
                    }
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.message").value("At least one unit is required in multi mode."));
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
        given(configCenterService.inviteUser(org.mockito.ArgumentMatchers.eq(7L), org.mockito.ArgumentMatchers.eq(1L), anyMap()))
            .willReturn(inviteResult);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post("/api/v1/config-center/users/invite")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "name": "Pending Invite",
                      "email": "invite@example.com",
                      "role": "user"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.email").value("invite@example.com"))
            .andExpect(jsonPath("$.invite_link").value("http://localhost/invite/abcdef123456"));
    }
}
