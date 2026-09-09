package com.indice.erp.training;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class PlatformTrainingLocalizationControllerTest {
    private final SessionAuthService auth = mock(SessionAuthService.class);
    private final SessionCsrfService csrf = mock(SessionCsrfService.class);
    private final TrainingProgramService program = mock(TrainingProgramService.class);
    private final TrainingExamService exams = mock(TrainingExamService.class);
    private final MockHttpSession session = new MockHttpSession();
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        when(auth.currentUser(session)).thenReturn(Optional.of(new AuthSessionUser(11L, 31L, 41L, "Consultant", "owner")));
        mvc = MockMvcBuilders.standaloneSetup(new PlatformTrainingController(auth, csrf, program,
            mock(TrainingResourceService.class), exams)).build();
    }

    @Test
    void localizesTheAuthorizedUsersAttemptWithoutAcceptingUserAuthorityFromQueryParameters() throws Exception {
        var source = TrainingExamQuestionBank.find("indice.q01");
        when(exams.attempt(11L, 77L)).thenReturn(Map.of("id", 77L, "questions", List.of(Map.of(
            "code", source.code(), "prompt", source.prompt(), "options", List.of(
                Map.of("code", "option-1", "label", source.options().get(1).label()))))));
        mvc.perform(get("/api/v1/platform-admin/training/exams/attempts/77")
                .session(session).param("locale", "ko-CA").param("userId", "999"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.questions[0].prompt").value(TrainingExamLocalization.copyFor("ko-CA").get(source.code()).prompt()))
            .andExpect(jsonPath("$.questions[0].options[0].code").value("option-1"));
        verify(program).platformWorkspace(11L);
        verify(exams).attempt(11L, 77L);
    }

    @Test
    void rejectsMutationBeforeStartingAnAttemptWhenCsrfFailsRegardlessOfLocale() throws Exception {
        doThrow(new SecurityException("Invalid CSRF token")).when(csrf).requireCsrf(session, "bad");
        mvc.perform(post("/api/v1/platform-admin/training/exams/indice/start")
                .session(session).header("X-CSRF-Token", "bad").param("locale", "zh-CA"))
            .andExpect(status().isForbidden());
        verifyNoInteractions(exams);
    }

    @Test
    void rejectsReadBeforeLoadingAnAttemptWhenPlatformAccessFailsRegardlessOfLocale() throws Exception {
        when(program.platformWorkspace(11L)).thenThrow(new SecurityException("Forbidden"));
        mvc.perform(get("/api/v1/platform-admin/training/exams/attempts/77")
                .session(session).param("locale", "fr-CA"))
            .andExpect(status().isForbidden());
        verifyNoInteractions(exams);
    }
}
