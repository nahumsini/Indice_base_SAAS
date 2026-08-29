package com.indice.erp.configcenter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.indice.erp.auth.AuthSessionUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.storage.DisabledObjectStorageService;
import com.indice.erp.storage.ObjectStorageProperties;
import java.sql.ResultSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@ExtendWith(MockitoExtension.class)
class ConfigCenterServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private BCryptPasswordEncoder passwordEncoder;

    @Mock
    private ConfigCenterScopeAccess scopeAccess;

    @Test
    void deleteUserRejectsCurrentUserBeforeQueryingDatabase() {
        var service = newService();

        var error = assertThrows(
            IllegalArgumentException.class,
            () -> service.deleteUser(1L, 7L, "admin", 7L)
        );

        assertEquals("You cannot deactivate your own user.", error.getMessage());
        verifyNoInteractions(jdbcTemplate);
    }

    @Test
    void getEmpresaReadsConfigCenterSettingsFromCompanySettings() throws Exception {
        var service = newService();

        when(jdbcTemplate.query(
            eq("SELECT id, name, logo_url FROM companies WHERE id = ? LIMIT 1"),
            org.mockito.ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Map<String, Object>>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(1L);
            when(rs.getString("name")).thenReturn("Empresa Demo Spring");
            when(rs.getString("logo_url")).thenReturn(null);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        when(jdbcTemplate.query(
            eq("SELECT settings_json FROM company_settings WHERE company_id = ? LIMIT 1"),
            org.mockito.ArgumentMatchers.<RowMapper<String>>any(),
            eq(1L)
        )).thenReturn(List.of("""
            {
              "config_center": {
                "estructura": "multi",
                "colaboradores": 19,
                "empresa_template": {
                  "industria": "Retail",
                  "descripcion": "Holding demo",
                  "currency": "USD",
                  "timezone": "America/Toronto",
                  "tamano_empresa": "Mediana"
                },
                "map": [
                  {
                    "name": "Unidad",
                    "legacy_unit_id": 4,
                    "telefono": "111",
                    "businesses": [
                      {
                        "name": "farmboy",
                        "legacy_business_id": 9,
                        "email": "farmboy@example.com"
                      }
                    ]
                  }
                ]
              }
            }
            """));

        @SuppressWarnings("unchecked")
        var empresa = (Map<String, Object>) service.getEmpresa(1L);

        assertEquals("Retail", empresa.get("industria"));
        assertEquals("Holding demo", empresa.get("descripcion"));
        assertEquals("USD", empresa.get("moneda"));
        assertEquals("America/Toronto", empresa.get("zona_horaria"));
        assertEquals("Mediana", empresa.get("tamano_empresa"));
        assertEquals(19, empresa.get("colaboradores"));

        @SuppressWarnings("unchecked")
        var map = (List<Map<String, Object>>) empresa.get("map");
        assertEquals(1, map.size());
        assertEquals(4L, map.getFirst().get("legacy_unit_id"));
        @SuppressWarnings("unchecked")
        var businesses = (List<Map<String, Object>>) map.getFirst().get("businesses");
        assertEquals(9L, businesses.getFirst().get("legacy_business_id"));
    }

    @Test
    void actorAwareGetEmpresaDelegatesToScopeAccess() {
        var service = newService();
        var currentUser = new AuthSessionUser(7L, 1L, "Scoped User", "admin");
        var scopedEmpresa = Map.<String, Object>of("nombre_empresa", "Empresa Demo Spring", "colaboradores", 4);

        when(jdbcTemplate.query(
            eq("SELECT id, name, logo_url FROM companies WHERE id = ? LIMIT 1"),
            org.mockito.ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Map<String, Object>>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(1L);
            when(rs.getString("name")).thenReturn("Empresa Demo Spring");
            when(rs.getString("logo_url")).thenReturn(null);
            return List.of(rowMapper.mapRow(rs, 0));
        });
        when(jdbcTemplate.query(
            eq("SELECT settings_json FROM company_settings WHERE company_id = ? LIMIT 1"),
            org.mockito.ArgumentMatchers.<RowMapper<String>>any(),
            eq(1L)
        )).thenReturn(List.of("""
            {
              "config_center": {
                "estructura": "multi",
                "colaboradores": 19,
                "map": []
              }
            }
            """));
        when(scopeAccess.scopeEmpresa(eq(currentUser), org.mockito.ArgumentMatchers.anyMap())).thenReturn(scopedEmpresa);

        var result = service.getEmpresa(currentUser);

        assertEquals(scopedEmpresa, result);
        verify(scopeAccess).scopeEmpresa(eq(currentUser), org.mockito.ArgumentMatchers.anyMap());
    }

    @Test
    void getEmpresaKeepsExplicitEmptyStructureMap() throws Exception {
        var service = newService();

        when(jdbcTemplate.query(
            eq("SELECT id, name, logo_url FROM companies WHERE id = ? LIMIT 1"),
            org.mockito.ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Map<String, Object>>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(1L);
            when(rs.getString("name")).thenReturn("Empresa Demo Spring");
            when(rs.getString("logo_url")).thenReturn(null);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        when(jdbcTemplate.query(
            eq("SELECT settings_json FROM company_settings WHERE company_id = ? LIMIT 1"),
            org.mockito.ArgumentMatchers.<RowMapper<String>>any(),
            eq(1L)
        )).thenReturn(List.of("""
            {
              "config_center": {
                "estructura": "multi",
                "map": []
              }
            }
            """));
        when(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hr_users WHERE company_id = ?", Integer.class, 1L))
            .thenReturn(0);

        @SuppressWarnings("unchecked")
        var empresa = (Map<String, Object>) service.getEmpresa(1L);

        assertEquals("multi", empresa.get("estructura"));
        assertEquals(List.of(), empresa.get("map"));
    }

    @Test
    void saveEmpresaPersistsSettingsJsonAndKeepsExistingTemplateFields() {
        var service = newService();

        when(jdbcTemplate.query(
            eq("SELECT settings_json FROM company_settings WHERE company_id = ? LIMIT 1"),
            org.mockito.ArgumentMatchers.<RowMapper<String>>any(),
            eq(1L)
        )).thenReturn(List.of("""
            {
              "config_center": {
                "empresa_template": {
                  "canales_venta": ["Mayoristas"]
                }
              }
            }
            """));

        when(jdbcTemplate.update(
            eq("UPDATE companies SET name = ? WHERE id = ?"),
            eq("Nueva Empresa"),
            eq(1L)
        )).thenReturn(1);

        when(jdbcTemplate.update(anyString(), eq(1L), anyString())).thenReturn(1);

        var payload = new LinkedHashMap<String, Object>();
        payload.put("nombre_empresa", "Nueva Empresa");
        payload.put("industria", "Hospitality");
        payload.put("descripcion", "Updated from Spring");
        payload.put("moneda", "CAD");
        payload.put("zona_horaria", "America/Toronto");

        var saved = service.saveEmpresa(1L, 1L, payload);

        assertEquals("Nueva Empresa", saved.get("nombre_empresa"));
        assertEquals("Hospitality", saved.get("industria"));
        assertEquals("CAD", saved.get("moneda"));

        ArgumentCaptor<String> settingsCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(startsWith("INSERT INTO company_settings"), eq(1L), settingsCaptor.capture());
        var serializedSettings = settingsCaptor.getValue();
        assertInstanceOf(String.class, serializedSettings);
        org.junit.jupiter.api.Assertions.assertTrue(serializedSettings.contains("\"industria\":\"Hospitality\""));
        org.junit.jupiter.api.Assertions.assertTrue(serializedSettings.contains("\"timezone\":\"America/Toronto\""));
        org.junit.jupiter.api.Assertions.assertTrue(serializedSettings.contains("\"canales_venta\":[\"Mayoristas\"]"));
    }

    @Test
    void saveEmpresaPersistsHeadquartersLocationWithAddress() throws Exception {
        var service = newService();

        when(jdbcTemplate.query(
            eq("SELECT settings_json FROM company_settings WHERE company_id = ? LIMIT 1"),
            org.mockito.ArgumentMatchers.<RowMapper<String>>any(),
            eq(1L)
        )).thenReturn(List.of("{}"));
        when(jdbcTemplate.update(anyString(), eq(1L), anyString())).thenReturn(1);

        var address = new LinkedHashMap<String, Object>();
        address.put("street", "123 King St W");
        address.put("country", "Canada");
        address.put("state", "Ontario");
        address.put("city", "Toronto");
        address.put("zip", "M5H 1J9");

        var headquartersLocation = new LinkedHashMap<String, Object>();
        headquartersLocation.put("google_maps_url", "https://maps.google.com/?q=123+King+St+W");
        headquartersLocation.put("latitude", "43.6487000");
        headquartersLocation.put("longitude", "-79.3817000");
        headquartersLocation.put("radius_meters", 150);
        headquartersLocation.put("coordinate_source", "google_maps_link");
        headquartersLocation.put("address", address);

        var payload = new LinkedHashMap<String, Object>();
        payload.put("headquarters_location", headquartersLocation);
        payload.put("sync_company_location", false);

        var saved = service.saveEmpresa(1L, 1L, payload);

        @SuppressWarnings("unchecked")
        var savedAddress = (Map<String, Object>) saved.get("address");
        assertEquals("123 King St W", savedAddress.get("street"));
        assertEquals("Canada", savedAddress.get("country"));
        assertEquals("Toronto", savedAddress.get("city"));
        assertEquals("https://maps.google.com/?q=123+King+St+W", saved.get("google_maps_url"));

        ArgumentCaptor<String> settingsCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(startsWith("INSERT INTO company_settings"), eq(1L), settingsCaptor.capture());

        var settingsJson = new ObjectMapper().readTree(settingsCaptor.getValue());
        var storedLocation = settingsJson.path("config_center").path("empresa_template").path("headquarters_location");
        assertEquals("43.6487", storedLocation.path("latitude").asText());
        assertEquals("-79.3817", storedLocation.path("longitude").asText());
        assertEquals(150, storedLocation.path("radius_meters").asInt());
        assertEquals("google_maps_link", storedLocation.path("coordinate_source").asText());
        assertEquals("123 King St W", storedLocation.path("address").path("street").asText());
        assertEquals("M5H 1J9", storedLocation.path("address").path("zip").asText());
    }

    @Test
    void getEmpresaReturnsStoredHeadquartersLocationAndAddress() throws Exception {
        var service = newService();

        when(jdbcTemplate.query(
            eq("SELECT id, name, logo_url FROM companies WHERE id = ? LIMIT 1"),
            org.mockito.ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Map<String, Object>>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(1L);
            when(rs.getString("name")).thenReturn("Empresa Demo Spring");
            when(rs.getString("logo_url")).thenReturn(null);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        when(jdbcTemplate.query(
            eq("SELECT settings_json FROM company_settings WHERE company_id = ? LIMIT 1"),
            org.mockito.ArgumentMatchers.<RowMapper<String>>any(),
            eq(1L)
        )).thenReturn(List.of("""
            {
              "config_center": {
                "estructura": "multi",
                "colaboradores": 7,
                "empresa_template": {
                  "headquarters_location": {
                    "google_maps_url": "https://maps.google.com/?q=123+King+St+W",
                    "latitude": 43.6487000,
                    "longitude": -79.3817000,
                    "radius_meters": 150,
                    "coordinate_source": "google_maps_link",
                    "address": {
                      "street": "123 King St W",
                      "country": "Canada",
                      "state": "Ontario",
                      "city": "Toronto",
                      "zip": "M5H 1J9"
                    }
                  }
                },
                "map": []
              }
            }
            """));

        @SuppressWarnings("unchecked")
        var empresa = (Map<String, Object>) service.getEmpresa(1L);

        assertEquals("https://maps.google.com/?q=123+King+St+W", empresa.get("google_maps_url"));
        assertEquals(150, empresa.get("radius_meters"));

        @SuppressWarnings("unchecked")
        var address = (Map<String, Object>) empresa.get("address");
        assertEquals("123 King St W", address.get("street"));
        assertEquals("Ontario", address.get("state"));

        @SuppressWarnings("unchecked")
        var location = (Map<String, Object>) empresa.get("headquarters_location");
        assertEquals("google_maps_link", location.get("coordinate_source"));
        assertEquals(address, location.get("address"));
    }

    @Test
    void saveEmpresaRejectsInvalidHeadquartersLatitude() {
        var service = newService();

        when(jdbcTemplate.query(
            eq("SELECT settings_json FROM company_settings WHERE company_id = ? LIMIT 1"),
            org.mockito.ArgumentMatchers.<RowMapper<String>>any(),
            eq(1L)
        )).thenReturn(List.of("{}"));

        var headquartersLocation = new LinkedHashMap<String, Object>();
        headquartersLocation.put("latitude", "100.0000000");
        headquartersLocation.put("longitude", "-79.3817000");

        var payload = new LinkedHashMap<String, Object>();
        payload.put("headquarters_location", headquartersLocation);

        assertThrows(IllegalArgumentException.class, () -> service.saveEmpresa(1L, 1L, payload));
    }

    @Test
    void saveStructureAllowsEmptyMultiModeForOnboarding() {
        var service = newService();

        when(jdbcTemplate.query(
            eq("""
                SELECT id, name
                FROM units
                WHERE company_id = ?
                ORDER BY id ASC
                """),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L)
        )).thenReturn(List.of());
        when(jdbcTemplate.query(
            eq("""
                SELECT id,
                       unit_id,
                       name,
                       latitude,
                       longitude,
                       radius_meters,
                       coordinate_source,
                       google_maps_url
                FROM businesses
                WHERE company_id = ?
                ORDER BY id ASC
                """),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L)
        )).thenReturn(List.of());
        when(jdbcTemplate.query(
            eq("SELECT settings_json FROM company_settings WHERE company_id = ? LIMIT 1"),
            org.mockito.ArgumentMatchers.<RowMapper<String>>any(),
            eq(1L)
        )).thenReturn(List.of("{}"));
        when(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hr_users WHERE company_id = ?", Integer.class, 1L))
            .thenReturn(0);
        when(jdbcTemplate.update(anyString(), eq(1L), anyString())).thenReturn(1);

        var saved = service.saveStructure(1L, 1L, Map.of(
            "estructura", "multi",
            "map", List.of()
        ));

        assertEquals("multi", saved.get("modo"));
        assertEquals(0, saved.get("colaboradores"));
        assertEquals(0, saved.get("unidades_aprox"));
        assertEquals(List.of(), saved.get("map"));

        ArgumentCaptor<String> settingsCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(startsWith("INSERT INTO company_settings"), eq(1L), settingsCaptor.capture());
        var serializedSettings = settingsCaptor.getValue();
        org.junit.jupiter.api.Assertions.assertTrue(serializedSettings.contains("\"estructura\":\"multi\""));
        org.junit.jupiter.api.Assertions.assertTrue(serializedSettings.contains("\"map\":[]"));
    }

    @Test
    void saveStructurePreservesSelectedCorporateOfficeUnit() throws Exception {
        var service = newService();

        when(jdbcTemplate.query(
            eq("""
                SELECT id, name
                FROM units
                WHERE company_id = ?
                ORDER BY id ASC
                """),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L)
        )).thenReturn(List.of());
        when(jdbcTemplate.query(
            eq("""
                SELECT id,
                       unit_id,
                       name,
                       latitude,
                       longitude,
                       radius_meters,
                       coordinate_source,
                       google_maps_url
                FROM businesses
                WHERE company_id = ?
                ORDER BY id ASC
                """),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(1L)
        )).thenReturn(List.of());
        when(jdbcTemplate.query(
            eq("SELECT settings_json FROM company_settings WHERE company_id = ? LIMIT 1"),
            org.mockito.ArgumentMatchers.<RowMapper<String>>any(),
            eq(1L)
        )).thenReturn(List.of("{}"));
        when(jdbcTemplate.queryForObject(eq("SELECT LAST_INSERT_ID()"), eq(Long.class)))
            .thenReturn(10L, 100L, 20L, 200L);
        when(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM hr_users WHERE company_id = ?", Integer.class, 1L))
            .thenReturn(0);

        var firstUnit = new LinkedHashMap<String, Object>();
        firstUnit.put("name", "Warehouse");
        firstUnit.put("businesses", List.of(Map.of("name", "Warehouse Ops")));

        var corporateUnit = new LinkedHashMap<String, Object>();
        corporateUnit.put("name", "Toronto");
        corporateUnit.put("is_corporate_office", true);
        corporateUnit.put("businesses", List.of(Map.of("name", "Toronto Ops")));

        var saved = service.saveStructure(1L, 1L, Map.of(
            "estructura", "multi",
            "map", List.of(firstUnit, corporateUnit)
        ));

        @SuppressWarnings("unchecked")
        var responseMap = (List<Map<String, Object>>) saved.get("map");
        assertEquals(false, responseMap.getFirst().get("is_corporate_office"));
        assertEquals(true, responseMap.get(1).get("is_corporate_office"));
        assertEquals("Warehouse", responseMap.getFirst().get("name"));
        assertEquals("Toronto", responseMap.get(1).get("name"));

        ArgumentCaptor<String> settingsCaptor = ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(startsWith("INSERT INTO company_settings"), eq(1L), settingsCaptor.capture());
        var settingsJson = new ObjectMapper().readTree(settingsCaptor.getValue());
        var storedMap = settingsJson.path("config_center").path("map");
        assertEquals(false, storedMap.get(0).path("is_corporate_office").asBoolean());
        assertEquals(true, storedMap.get(1).path("is_corporate_office").asBoolean());
    }

    @Test
    void inviteUserAllowsGloballyRegisteredEmailForAnotherCompany() {
        var service = newService();

        when(jdbcTemplate.query(
            contains("FROM businesses"),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq(9L),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(9L);
            when(rs.getLong("unit_id")).thenReturn(3L);
            when(rs.wasNull()).thenReturn(false);
            return List.of(rowMapper.mapRow(rs, 0));
        });
        when(jdbcTemplate.query(
            contains("FROM units"),
            org.mockito.ArgumentMatchers.<RowMapper<Long>>any(),
            eq(3L),
            eq(1L)
        )).thenReturn(List.of(3L));
        when(jdbcTemplate.query(
            contains("FROM modules module_row"),
            org.mockito.ArgumentMatchers.<RowMapper<String>>any(),
            eq(1L),
            eq("config_center")
        )).thenReturn(List.of("config_center"));
        when(jdbcTemplate.query(
            contains("SELECT uc.id AS user_company_id"),
            org.mockito.ArgumentMatchers.<RowMapper<Object>>any(),
            eq("admin"),
            eq(1L),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Object>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("user_company_id")).thenReturn(10L);
            when(rs.getString("role")).thenReturn("admin");
            when(rs.getLong("unit_id")).thenReturn(3L);
            when(rs.getLong("business_id")).thenReturn(9L);
            when(rs.wasNull()).thenReturn(false);
            return List.of(rowMapper.mapRow(rs, 0));
        });
        when(jdbcTemplate.query(
            contains("FROM user_company_module_roles"),
            org.mockito.ArgumentMatchers.<RowMapper<String>>any(),
            eq(10L)
        )).thenReturn(List.of("config_center"));
        when(jdbcTemplate.query(
            contains("FROM user_company_tab_permissions"),
            org.mockito.ArgumentMatchers.<RowMapper<String>>any(),
            eq(10L)
        )).thenReturn(List.of("config_center.profile"));
        when(jdbcTemplate.queryForObject(
            eq("""
                SELECT COUNT(*)
                FROM users u
                INNER JOIN user_companies uc ON uc.user_id = u.id
                WHERE uc.company_id = ?
                  AND LOWER(u.email) = ?
                """),
            eq(Integer.class),
            eq(1L),
            eq("taken@example.com")
        )).thenReturn(0);
        when(jdbcTemplate.queryForObject(
            eq("""
                SELECT COUNT(*)
                FROM user_invitations
                WHERE company_id = ?
                  AND LOWER(email) = ?
                  AND COALESCE(status, 'pending') = 'pending'
                  AND (? IS NULL OR id <> ?)
                """),
            eq(Integer.class),
            eq(1L),
            eq("taken@example.com"),
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.isNull()
        )).thenReturn(0);
        when(jdbcTemplate.queryForObject("SELECT LAST_INSERT_ID()", Long.class)).thenReturn(81L);

        var invitation = service.inviteUser(1L, 1L, "admin", Map.of(
                "name", "Taken User",
                "email", "Taken@example.com",
                "role", "User",
                "unit_id", 3L,
                "business_id", 9L,
                "module_slugs", List.of("config_center"),
                "tab_permission_keys", List.of("config_center.profile")
            ));

        assertEquals("taken@example.com", invitation.get("email"));
        assertEquals(81L, invitation.get("invitation_id"));
    }

    @Test
    void saveCurrentUserUpdatesPasswordHashWhenNewPasswordIsProvided() {
        var service = newService();

        when(passwordEncoder.encode("newSecret123")).thenReturn("encoded-password");
        when(jdbcTemplate.update("UPDATE users SET full_name = ? WHERE id = ?", "Ada Demo", 1L)).thenReturn(1);
        when(jdbcTemplate.update("UPDATE users SET password_hash = ? WHERE id = ?", "encoded-password", 1L)).thenReturn(1);
        when(jdbcTemplate.query(
            eq("""
                SELECT u.id,
                       u.email,
                       COALESCE(NULLIF(p.full_name, ''), COALESCE(u.full_name, '')) AS full_name,
                       COALESCE(p.given_names, '') AS given_names,
                       COALESCE(p.family_names, '') AS family_names,
                       COALESCE(p.phone, '') AS phone,
                       COALESCE(p.country, '') AS country,
                       COALESCE(p.preferred_language, 'es-419') AS preferred_language,
                       COALESCE(p.avatar_url, '') AS avatar_url,
                       COALESCE(p.avatar_object_key, '') AS avatar_object_key,
                       COALESCE(p.avatar_content_type, '') AS avatar_content_type
                FROM users u
                LEFT JOIN user_profiles p ON p.user_id = u.id
                WHERE u.id = ?
                LIMIT 1
                """),
            org.mockito.ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Map<String, Object>>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(1L);
            when(rs.getString("email")).thenReturn("ada@example.com");
            when(rs.getString("full_name")).thenReturn("Ada Demo");
            when(rs.getString("given_names")).thenReturn("Ada");
            when(rs.getString("family_names")).thenReturn("Demo");
            when(rs.getString("phone")).thenReturn(null);
            when(rs.getString("country")).thenReturn("CA");
            when(rs.getString("preferred_language")).thenReturn("en-US");
            when(rs.getString("avatar_url")).thenReturn(null);
            when(rs.getString("avatar_object_key")).thenReturn(null);
            when(rs.getString("avatar_content_type")).thenReturn(null);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var saved = service.saveCurrentUser(7L, 1L, "admin", Map.of(
            "primer_nombre", "Ada",
            "apellido_paterno", "Demo",
            "country", "CA",
            "preferred_language", "en-US",
            "new_password", "newSecret123",
            "confirm_new_password", "newSecret123"
        ));

        verify(passwordEncoder).encode("newSecret123");
        verify(jdbcTemplate).update("UPDATE users SET password_hash = ? WHERE id = ?", "encoded-password", 1L);
        assertEquals("ada@example.com", saved.get("email"));
        assertEquals("CA", saved.get("country"));
    }

    @Test
    void saveCurrentUserNormalizesMexicoPhoneBeforeStorage() {
        var service = newService();

        when(jdbcTemplate.update("UPDATE users SET full_name = ? WHERE id = ?", "Ada Demo", 1L)).thenReturn(1);
        when(jdbcTemplate.query(
            contains("LEFT JOIN user_profiles p ON p.user_id = u.id"),
            org.mockito.ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Map<String, Object>>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(1L);
            when(rs.getString("email")).thenReturn("ada@example.com");
            when(rs.getString("full_name")).thenReturn("Ada Demo");
            when(rs.getString("given_names")).thenReturn("Ada");
            when(rs.getString("family_names")).thenReturn("Demo");
            when(rs.getString("phone")).thenReturn("+528132456845");
            when(rs.getString("country")).thenReturn("MX");
            when(rs.getString("preferred_language")).thenReturn("es-MX");
            when(rs.getString("avatar_url")).thenReturn(null);
            when(rs.getString("avatar_object_key")).thenReturn(null);
            when(rs.getString("avatar_content_type")).thenReturn(null);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var saved = service.saveCurrentUser(1L, 1L, "admin", Map.of(
            "primer_nombre", "Ada",
            "apellido_paterno", "Demo",
            "country", "MX",
            "telefono", "+52 81 3245 6845",
            "preferred_language", "es-MX"
        ));

        assertEquals("+528132456845", saved.get("telefono"));
        verify(jdbcTemplate).update(
            contains("INSERT INTO user_profiles (user_id, full_name, given_names, family_names"),
            eq(1L), eq("Ada Demo"), eq("Ada"), eq("Demo"), eq("+528132456845"), eq("MX"), eq("es-MX")
        );
    }

    @Test
    void saveCurrentUserPreservesMultipleGivenNamesAndFamilyNames() {
        var service = newService();

        when(jdbcTemplate.update("UPDATE users SET full_name = ? WHERE id = ?", "Nahum Abraham Peña Perez", 1L)).thenReturn(1);
        when(jdbcTemplate.query(
            contains("COALESCE(p.given_names, '') AS given_names"),
            org.mockito.ArgumentMatchers.<RowMapper<Map<String, Object>>>any(),
            eq(1L)
        )).thenAnswer(invocation -> {
            @SuppressWarnings("unchecked")
            var rowMapper = (RowMapper<Map<String, Object>>) invocation.getArgument(1);
            ResultSet rs = mock(ResultSet.class);
            when(rs.getLong("id")).thenReturn(1L);
            when(rs.getString("email")).thenReturn("nahum@example.com");
            when(rs.getString("full_name")).thenReturn("Nahum Abraham Peña Perez");
            when(rs.getString("given_names")).thenReturn("Nahum Abraham");
            when(rs.getString("family_names")).thenReturn("Peña Perez");
            when(rs.getString("phone")).thenReturn(null);
            when(rs.getString("country")).thenReturn("CA");
            when(rs.getString("preferred_language")).thenReturn("es-MX");
            when(rs.getString("avatar_url")).thenReturn(null);
            when(rs.getString("avatar_object_key")).thenReturn(null);
            when(rs.getString("avatar_content_type")).thenReturn(null);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var saved = service.saveCurrentUser(1L, 1L, "admin", Map.of(
            "primer_nombre", "Nahum Abraham",
            "apellido_paterno", "Peña Perez",
            "country", "CA",
            "preferred_language", "es-MX"
        ));

        assertEquals("Nahum Abraham", saved.get("nombres"));
        assertEquals("Peña Perez", saved.get("apellidos"));
        verify(jdbcTemplate).update(
            contains("INSERT INTO user_profiles (user_id, full_name, given_names, family_names"),
            eq(1L), eq("Nahum Abraham Peña Perez"), eq("Nahum Abraham"), eq("Peña Perez"),
            org.mockito.ArgumentMatchers.isNull(), eq("CA"), eq("es-MX")
        );
    }

    private ConfigCenterService newService() {
        return new ConfigCenterService(
            jdbcTemplate,
            new ObjectMapper(),
            passwordEncoder,
            new DisabledObjectStorageService(),
            new ObjectStorageProperties(),
            org.mockito.Mockito.mock(com.indice.erp.billing.storage.CompanyStorageMeter.class),
            scopeAccess
        );
    }
}
