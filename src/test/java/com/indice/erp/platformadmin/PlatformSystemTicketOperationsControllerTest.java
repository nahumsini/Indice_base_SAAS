package com.indice.erp.platformadmin;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.systemticket.SystemTicketAttachmentService;
import com.indice.erp.systemticket.SystemTicketOperationsContracts.Ticket;
import com.indice.erp.systemticket.SystemTicketOperationsService;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(PlatformSystemTicketOperationsController.class)
class PlatformSystemTicketOperationsControllerTest {

    @Autowired private MockMvc mockMvc;
    @MockBean private SessionAuthService auth;
    @MockBean private SessionCsrfService csrf;
    @MockBean private SystemTicketOperationsService operations;
    @MockBean private SystemTicketAttachmentService attachments;

    @Test
    void operationalQueueRejectsAnonymousRequests() throws Exception {
        given(auth.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/platform-admin/system-ticket-operations"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void takingATicketRequiresCsrfAndUsesTheAuthenticatedRoot() throws Exception {
        var actor = new AuthSessionUser(99L, 1L, "Root", "root");
        given(auth.currentUser(any())).willReturn(Optional.of(actor));
        given(operations.takeFromPlatform(99L, 7L)).willReturn(ticket());

        mockMvc.perform(post("/api/v1/platform-admin/system-ticket-operations/7/take")
                .header("X-CSRF-Token", "csrf-token"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.assigned_to_user_id").value(99));

        verify(csrf).requireCsrf(any(), eq("csrf-token"));
        verify(operations).takeFromPlatform(99L, 7L);
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
