package com.indice.erp.distributorportal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.systemticket.SystemTicketService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(DistributorSystemTicketController.class)
class DistributorSystemTicketControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService auth;

    @MockBean
    private SessionCsrfService csrf;

    @MockBean
    private SystemTicketService tickets;

    @Test
    void listRequiresAnAuthenticatedDistributor() throws Exception {
        given(auth.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/distributor-portal/system-tickets"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void distributorCanCreateAReportWithCsrfProtection() throws Exception {
        var actor = new AuthSessionUser(11L, 31L, 41L, "Distribuidor", "owner");
        given(auth.currentUser(any())).willReturn(Optional.of(actor));
        given(tickets.create(eq(actor), any())).willReturn(ticket());

        mockMvc.perform(post("/api/v1/distributor-portal/system-tickets")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(APPLICATION_JSON)
                .content("""
                    {
                      "type": "FAILURE",
                      "priority": "HIGH",
                      "module": "Inventarios",
                      "title": "No carga la tabla",
                      "description": "La tabla queda vacía después de abrir el módulo."
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.folio").value("SYS-20260814-A1B2C3D4"))
            .andExpect(jsonPath("$.distributor_company_id").value(31));

        verify(csrf).requireCsrf(any(), eq("csrf-token"));
    }

    private SystemTicketService.Ticket ticket() {
        var now = Instant.parse("2026-08-14T18:00:00Z");
        return new SystemTicketService.Ticket(
            7L, "SYS-20260814-A1B2C3D4", 31L, "Aliado Norte", 11L,
            "Distribuidor", "distribuidor@example.com", "FAILURE", "HIGH",
            "Inventarios", "No carga la tabla", "La tabla queda vacía.", "OPEN",
            null, null, now, now
        );
    }
}
