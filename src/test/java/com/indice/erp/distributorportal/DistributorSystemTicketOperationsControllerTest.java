package com.indice.erp.distributorportal;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.systemticket.SystemTicketAttachmentService;
import com.indice.erp.systemticket.SystemTicketOperationsContracts.Detail;
import com.indice.erp.systemticket.SystemTicketOperationsContracts.Ticket;
import com.indice.erp.systemticket.SystemTicketOperationsService;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(DistributorSystemTicketOperationsController.class)
class DistributorSystemTicketOperationsControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private SessionAuthService auth;
    @MockBean private SessionCsrfService csrf;
    @MockBean private SystemTicketOperationsService operations;
    @MockBean private SystemTicketAttachmentService attachments;

    @Test
    void distributorMessageUsesItsAuthenticatedIdentityAndCsrf() throws Exception {
        var actor = new AuthSessionUser(11L, 31L, 41L, "Distributor", "owner");
        given(auth.currentUser(any())).willReturn(Optional.of(actor));
        given(operations.addMessageFromDistributor(eq(actor), eq(7L), any()))
            .willReturn(new Detail(ticket(), List.of(), List.of()));

        mockMvc.perform(post("/api/v1/distributor-portal/system-ticket-operations/7/messages")
                .header("X-CSRF-Token", "csrf-token")
                .contentType(APPLICATION_JSON)
                .content("""
                    {"message":"Adjunto la evidencia.","visibility":"PUBLIC"}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.ticket.distributor_company_id").value(31));

        verify(csrf).requireCsrf(any(), eq("csrf-token"));
        verify(operations).addMessageFromDistributor(eq(actor), eq(7L), any());
    }

    private Ticket ticket() {
        var now = Instant.parse("2026-08-27T18:00:00Z");
        return new Ticket(
            7L, "SYS-20260827-7", 31L, "Aliado Norte", 11L,
            "Distribuidor", "distribuidor@example.com", 99L, "Root Support", "root@indice.app",
            "FAILURE", "HIGH", "Inventarios", "No carga inventario", "La tabla queda vacía.",
            "IN_REVIEW", null, now, now.plusSeconds(3600), 0, false, 60L,
            null, now.minusSeconds(3600), now
        );
    }
}
