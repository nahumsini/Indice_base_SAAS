package com.indice.erp.sales;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(SalesApiController.class)
class SalesApiControllerCsrfTest {

    private static final AuthSessionUser CURRENT_USER = new AuthSessionUser(1L, 7L, "Usuario Demo", "admin");

    @MockBean
    private com.indice.erp.kpis.KpiRequestAccessService kpiAccess;

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @MockBean
    private SalesService salesService;

    @MockBean
    private SalesCommissionCutService commissionCutService;

    @BeforeEach
    void authenticateSession() {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(CURRENT_USER));
    }

    @ParameterizedTest
    @MethodSource("mutatingSalesRequests")
    void mutatingSalesEndpointsRequireCsrf(HttpMethod method, String path, String body) throws Exception {
        willThrow(new IllegalArgumentException("Invalid CSRF token."))
            .given(sessionCsrfService)
            .requireCsrf(any(), any());

        var builder = request(method, path).contentType(MediaType.APPLICATION_JSON);
        if (body != null) {
            builder.content(body);
        }

        mockMvc.perform(builder)
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Invalid CSRF token."));

        verifyNoInteractions(salesService, commissionCutService);
    }

    @Test
    void genericCreateAllowsValidCsrfToken() throws Exception {
        given(salesService.create(eq(7L), eq(1L), eq("products"), any(Map.class)))
            .willReturn(Map.of("id", 22, "name", "Demo Product"));

        mockMvc.perform(post("/api/v1/sales/products")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "name": "Demo Product"
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(22))
            .andExpect(jsonPath("$.name").value("Demo Product"));

        then(sessionCsrfService).should().requireCsrf(any(), eq("csrf-token"));
    }

    @Test
    void genericProductDeleteAllowsValidCsrfToken() throws Exception {
        mockMvc.perform(delete("/api/v1/sales/products/22")
                .header("X-CSRF-Token", "csrf-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));

        then(sessionCsrfService).should().requireCsrf(any(), eq("csrf-token"));
        then(salesService).should().delete(7L, "products", 22L);
    }

    @Test
    void inventoryOperationCommitAllowsValidCsrfToken() throws Exception {
        given(salesService.commitInventoryOperation(eq(7L), eq(1L), any(Map.class)))
            .willReturn(Map.of(
                "balances", List.of(Map.of("id", 31)),
                "movements", List.of(Map.of("id", 41))));

        mockMvc.perform(post("/api/v1/sales/inventory-operations/commit")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "balances": [{"productId": 3, "warehouseId": 4, "available": 2}],
                      "movements": [{"productId": 3, "toWarehouseId": 4, "quantity": 2}]
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.balances[0].id").value(31))
            .andExpect(jsonPath("$.movements[0].id").value(41));

        then(sessionCsrfService).should().requireCsrf(any(), eq("csrf-token"));
    }

    private static Stream<Arguments> mutatingSalesRequests() {
        return Stream.of(
            Arguments.of(HttpMethod.POST, "/api/v1/sales/files", """
                {
                  "entity_type": "sales_quote",
                  "entity_id": 11,
                  "file_name": "quote.pdf"
                }
                """),
            Arguments.of(HttpMethod.POST, "/api/v1/sales/products/images/presign-upload", """
                {
                  "file_name": "product.jpg",
                  "content_type": "image/jpeg",
                  "size_bytes": 100
                }
                """),
            Arguments.of(HttpMethod.POST, "/api/v1/sales/products/11/images", """
                {
                  "object_key": "products/11/product.jpg",
                  "file_name": "product.jpg"
                }
                """),
            Arguments.of(HttpMethod.POST, "/api/v1/sales/sales/payment-evidence/presign-upload", """
                {
                  "file_name": "payment.pdf",
                  "content_type": "application/pdf",
                  "size_bytes": 100
                }
                """),
            Arguments.of(HttpMethod.POST, "/api/v1/sales/sales/11/payment-evidence", """
                {
                  "object_key": "sales/11/payment.pdf",
                  "file_name": "payment.pdf"
                }
                """),
            Arguments.of(HttpMethod.DELETE, "/api/v1/sales/files/11", null),
            Arguments.of(HttpMethod.POST, "/api/v1/sales/quotes/11/items", """
                {
                  "product_id": 3,
                  "quantity": 2
                }
                """),
            Arguments.of(HttpMethod.PUT, "/api/v1/sales/quotes/11/items/4", """
                {
                  "quantity": 5
                }
                """),
            Arguments.of(HttpMethod.DELETE, "/api/v1/sales/quotes/11/items/4", null),
            Arguments.of(HttpMethod.POST, "/api/v1/sales/quotes/11/connection", """
                {
                  "connection_type": "order"
                }
                """),
            Arguments.of(HttpMethod.POST, "/api/v1/sales/commission-rules/preview", """
                {
                  "rule": "default"
                }
                """),
            Arguments.of(HttpMethod.POST, "/api/v1/sales/commission-cuts", """
                {
                  "periodStart": "2026-08-01",
                  "periodEnd": "2026-08-31"
                }
                """),
            Arguments.of(HttpMethod.PUT, "/api/v1/sales/commission-cut-schedule", """
                {
                  "name": "Monthly",
                  "cadence": "monthly"
                }
                """),
            Arguments.of(HttpMethod.DELETE, "/api/v1/sales/commission-cut-schedule/11", null),
            Arguments.of(HttpMethod.POST, "/api/v1/sales/inventory-operations/commit", """
                {
                  "balances": [{"productId": 3, "warehouseId": 4, "available": 2}],
                  "movements": [{"productId": 3, "toWarehouseId": 4, "quantity": 2}]
                }
                """),
            Arguments.of(HttpMethod.POST, "/api/v1/sales/products", """
                {
                  "name": "Demo Product"
                }
                """),
            Arguments.of(HttpMethod.PUT, "/api/v1/sales/products/22", """
                {
                  "name": "Updated Product"
                }
                """),
            Arguments.of(HttpMethod.DELETE, "/api/v1/sales/products/22", null)
        );
    }
}
