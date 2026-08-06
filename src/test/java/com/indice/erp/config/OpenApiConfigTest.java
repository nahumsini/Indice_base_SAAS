package com.indice.erp.config;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class OpenApiConfigTest {

    @Test
    void openApiDescriptionDocumentsSessionCookieAuthenticationForBusinessApis() {
        var openApi = new OpenApiConfig().indiceOpenApi();

        assertEquals("Indice ERP API", openApi.getInfo().getTitle());
        assertNotNull(openApi.getInfo().getDescription());
        assertTrue(openApi.getInfo().getDescription().contains("Most business endpoints"));
        assertTrue(openApi.getInfo().getDescription().contains("session cookie"));
        assertTrue(openApi.getInfo().getDescription().contains("login flow"));
    }
}
