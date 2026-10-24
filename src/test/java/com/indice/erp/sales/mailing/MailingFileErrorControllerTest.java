package com.indice.erp.sales.mailing;

import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.access.tab.TabPermissionAccessService;
import com.indice.erp.auth.*;
import com.indice.erp.email.accounts.EmailAccountService;
import com.indice.erp.email.mailbox.MailFilePolicy;
import java.io.ByteArrayOutputStream;
import java.util.Optional;
import org.apache.pdfbox.cos.*;
import org.apache.pdfbox.pdmodel.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.server.ResponseStatusException;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real controller/advice and PDF validation; no Spring context, storage, DB or provider. */
class MailingFileErrorControllerTest {
    private static final String FILE_ID = "00000000-0000-4000-8000-000000000001";
    private final SessionAuthService auth = mock(SessionAuthService.class);
    private final SessionCsrfService csrf = new SessionCsrfService();
    private final ModuleAccessService modules = mock(ModuleAccessService.class);
    private final TabPermissionAccessService tabs = mock(TabPermissionAccessService.class);
    private final MailingFileService files = mock(MailingFileService.class);
    private final AuthSessionUser actor = new AuthSessionUser(1L, 2L, "Synthetic", "admin");
    private final MockHttpSession session = new MockHttpSession();
    private MockMvc mvc;
    private String token;

    @BeforeEach void setup() {
        token = csrf.ensureCsrf(session);
        when(auth.currentUser(any())).thenReturn(Optional.of(actor));
        when(modules.canAccess(actor, "crm")).thenReturn(true);
        when(tabs.canAccess(eq(actor), any())).thenReturn(true);
        var controller = new MailingController(auth, csrf, modules, tabs, mock(MailingService.class),
            mock(MailingTemplateService.class), mock(EmailAccountService.class), mock(MailingAudienceService.class),
            mock(MailingWorkspaceService.class), files);
        mvc = MockMvcBuilders.standaloneSetup(controller)
            .setControllerAdvice(new MailingDeliveryExceptionHandler()).build();
    }

    @ParameterizedTest
    @ValueSource(strings = {"email_pdf_active", "email_pdf_form", "email_pdf_password", "email_pdf_complex",
        "email_attachment_damaged", "email_attachment_mismatch", "email_attachment_limit"})
    void registrationReturnsStableContentErrorCode(String code) throws Exception {
        when(files.register(actor, FILE_ID)).thenThrow(new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, code));
        mvc.perform(post("/api/v1/mailing/template-files/" + FILE_ID + "/register")
            .session(session).header("X-CSRF-Token", token).contentType("application/json").content("{}"))
            .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value(code));
    }

    @Test void pdfWithEmbeddedFileIsRejectedAndOrdinaryPdfCanBeAttachedNext() throws Exception {
        try (var doc = new PDDocument(); var out = new ByteArrayOutputStream()) {
            doc.addPage(new PDPage());
            var names = new COSDictionary();
            names.setItem(COSName.getPDFName("EmbeddedFiles"), new COSDictionary());
            doc.getDocumentCatalog().getCOSObject().setItem(COSName.NAMES, names);
            doc.save(out);
            byte[] embedded = out.toByteArray();
            when(files.register(actor, FILE_ID)).thenAnswer(invocation -> {
                MailFilePolicy.bytes("presentation.pdf", "application/pdf", embedded);
                throw new AssertionError("Embedded files must remain blocked");
            });
            mvc.perform(post("/api/v1/mailing/template-files/" + FILE_ID + "/register")
                .session(session).header("X-CSRF-Token", token).contentType("application/json").content("{}"))
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.code").value("email_pdf_active"));
            doc.getDocumentCatalog().getCOSObject().removeItem(COSName.NAMES);
            out.reset(); doc.save(out); byte[] ordinary = out.toByteArray();
            doAnswer(invocation -> {
                MailFilePolicy.bytes("presentation.pdf", "application/pdf", ordinary);
                return new MailingFileContracts.File(FILE_ID, "presentation.pdf", "application/pdf", ordinary.length);
            }).when(files).register(actor, FILE_ID);
            mvc.perform(post("/api/v1/mailing/template-files/" + FILE_ID + "/register")
                .session(session).header("X-CSRF-Token", token).contentType("application/json").content("{}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.id").value(FILE_ID));
        }
    }

    @Test void presignFailurePreservesStatusAndSafeCode() throws Exception {
        when(files.upload(eq(actor), any())).thenThrow(new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "email_storage_unavailable"));
        mvc.perform(post("/api/v1/mailing/template-files/upload").session(session).header("X-CSRF-Token", token)
            .contentType("application/json").content("{\"requestId\":\"" + FILE_ID + "\",\"filename\":\"sample.pdf\",\"contentType\":\"application/pdf\",\"sizeBytes\":463000}"))
            .andExpect(status().isServiceUnavailable()).andExpect(jsonPath("$.code").value("email_storage_unavailable"));
    }

    @Test void unsafeInternalReasonIsRedacted() throws Exception {
        when(files.register(actor, FILE_ID)).thenThrow(new ResponseStatusException(HttpStatus.CONFLICT, "private storage diagnostics"));
        mvc.perform(post("/api/v1/mailing/template-files/" + FILE_ID + "/register")
            .session(session).header("X-CSRF-Token", token).contentType("application/json").content("{}"))
            .andExpect(status().isConflict()).andExpect(content().json("{\"code\":\"mailing_access_denied\"}"));
    }

    @Test void invalidJsonDoesNotEchoContentOrReachStorage() throws Exception {
        mvc.perform(post("/api/v1/mailing/template-files/upload").session(session).header("X-CSRF-Token", token)
            .contentType("application/json").content("{invalid private content"))
            .andExpect(status().isBadRequest()).andExpect(content().json("{\"code\":\"mailing_input_invalid\"}"));
        verifyNoInteractions(files);
    }

    @Test void csrfModuleAndSessionStillFailClosedBeforeFileMutation() throws Exception {
        mvc.perform(post("/api/v1/mailing/template-files/" + FILE_ID + "/register").session(session)
            .contentType("application/json").content("{}"))
            .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("mailing_access_denied"));
        when(modules.canAccess(actor, "crm")).thenReturn(false);
        mvc.perform(post("/api/v1/mailing/template-files/" + FILE_ID + "/register").session(session)
            .header("X-CSRF-Token", token).contentType("application/json").content("{}"))
            .andExpect(status().isForbidden());
        when(auth.currentUser(any())).thenReturn(Optional.empty());
        mvc.perform(post("/api/v1/mailing/template-files/" + FILE_ID + "/register").session(session)
            .header("X-CSRF-Token", token).contentType("application/json").content("{}"))
            .andExpect(status().isUnauthorized());
        verifyNoInteractions(files);
    }
}
