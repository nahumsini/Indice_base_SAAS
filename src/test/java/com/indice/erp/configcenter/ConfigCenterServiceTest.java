package com.indice.erp.configcenter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
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

    @Test
    void getEmpresaReadsConfigCenterSettingsFromCompanySettings() throws Exception {
        var service = new ConfigCenterService(jdbcTemplate, new ObjectMapper(), passwordEncoder);

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
    void saveEmpresaPersistsSettingsJsonAndKeepsExistingTemplateFields() {
        var service = new ConfigCenterService(jdbcTemplate, new ObjectMapper(), passwordEncoder);

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

        var saved = service.saveEmpresa(1L, payload);

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
    void saveCurrentUserUpdatesPasswordHashWhenNewPasswordIsProvided() {
        var service = new ConfigCenterService(jdbcTemplate, new ObjectMapper(), passwordEncoder);

        when(passwordEncoder.encode("newSecret123")).thenReturn("encoded-password");
        when(jdbcTemplate.update("UPDATE users SET full_name = ? WHERE id = ?", "Ada Demo", 1L)).thenReturn(1);
        when(jdbcTemplate.update("UPDATE users SET password_hash = ? WHERE id = ?", "encoded-password", 1L)).thenReturn(1);
        when(jdbcTemplate.query(
            eq("""
                SELECT u.id,
                       u.email,
                       COALESCE(NULLIF(p.full_name, ''), COALESCE(u.full_name, '')) AS full_name,
                       COALESCE(p.phone, '') AS phone,
                       COALESCE(p.country, '') AS country,
                       COALESCE(p.preferred_language, 'es-419') AS preferred_language,
                       COALESCE(p.avatar_url, '') AS avatar_url
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
            when(rs.getString("phone")).thenReturn(null);
            when(rs.getString("country")).thenReturn("CA");
            when(rs.getString("preferred_language")).thenReturn("en-US");
            when(rs.getString("avatar_url")).thenReturn(null);
            return List.of(rowMapper.mapRow(rs, 0));
        });

        var saved = service.saveCurrentUser(1L, "admin", Map.of(
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
}
