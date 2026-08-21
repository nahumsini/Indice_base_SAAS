package com.indice.erp.processTasks;

import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.auth.SessionAuthService;
import com.indice.erp.auth.SessionCsrfService;
import com.indice.erp.processTasks.agenda.AgendaApiController;
import com.indice.erp.processTasks.agenda.AgendaService;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskApiController;
import com.indice.erp.processTasks.kiosk.ProcessTaskKioskService;
import com.indice.erp.processTasks.kpis.ProcessTaskKpisApiController;
import com.indice.erp.processTasks.kpis.ProcessTaskKpisService;
import com.indice.erp.processTasks.processes.ProcessesApiController;
import com.indice.erp.processTasks.processes.ProcessesService;
import com.indice.erp.processTasks.projects.ProjectsApiController;
import com.indice.erp.processTasks.projects.ProjectsService;
import com.indice.erp.processTasks.tasks.ProcessTaskAttachmentsApiController;
import com.indice.erp.processTasks.tasks.ProcessTasksApiController;
import com.indice.erp.processTasks.tasks.ProcessTasksService;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({
    ProcessesApiController.class,
    ProcessTasksApiController.class,
    ProcessTaskAttachmentsApiController.class,
    ProjectsApiController.class,
    AgendaApiController.class,
    ProcessTaskKpisApiController.class,
    ProcessTaskKioskApiController.class
})
@Import(ProcessTasksRequestGuard.class)
class ProcessTasksApiControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SessionAuthService sessionAuthService;

    @MockBean
    private SessionCsrfService sessionCsrfService;

    @MockBean
    private ProcessTasksAccessService processTasksAccessService;

    @MockBean
    private ProcessesService processesService;

    @MockBean
    private ProcessTasksService processTasksService;

    @MockBean
    private ProjectsService projectsService;

    @MockBean
    private AgendaService agendaService;

    @MockBean
    private ProcessTaskKpisService processTaskKpisService;

    @MockBean
    private ProcessTaskKioskService processTaskKioskService;

    @BeforeEach
    void allowModuleAccessByDefault() {
        given(processTasksAccessService.canAccess(any(AuthSessionUser.class))).willReturn(true);
    }

    @Test
    void processesListReturnsUnauthorizedWhenSessionIsMissing() throws Exception {
        given(sessionAuthService.currentUser(any())).willReturn(Optional.empty());

        mockMvc.perform(get("/api/v1/processes"))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.message").value("Unauthorized"));
    }

    @Test
    void processesListReturnsForbiddenWhenModuleIsDenied() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(processTasksAccessService.canAccess(currentUser)).willReturn(false);

        mockMvc.perform(get("/api/v1/processes"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void processesListReturnsPayloadWhenModuleIsAllowed() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(processesService.listProcesses(7L, 1L)).willReturn(Map.of(
            "items", java.util.List.of(Map.of("id", 11, "title", "Weekly Audit")),
            "count", 1
        ));

        mockMvc.perform(get("/api/v1/processes"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.items[0].title").value("Weekly Audit"))
            .andExpect(jsonPath("$.count").value(1));
    }

    @Test
    void tasksListReturnsForbiddenWhenModuleIsDenied() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(processTasksAccessService.canAccess(currentUser)).willReturn(false);

        mockMvc.perform(get("/api/v1/process-tasks"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void projectsListReturnsForbiddenWhenModuleIsDenied() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(processTasksAccessService.canAccess(currentUser)).willReturn(false);

        mockMvc.perform(get("/api/v1/projects"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void agendaReturnsForbiddenWhenModuleIsDenied() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(processTasksAccessService.canAccess(currentUser)).willReturn(false);

        mockMvc.perform(get("/api/v1/agenda").param("from", "2026-05-01").param("to", "2026-05-31"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void kpisReturnsForbiddenWhenModuleIsDenied() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(processTasksAccessService.canAccess(currentUser)).willReturn(false);

        mockMvc.perform(get("/api/v1/process-task-kpis"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void managedKioskListReturnsForbiddenWhenModuleIsDenied() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(processTasksAccessService.canAccess(currentUser)).willReturn(false);

        mockMvc.perform(get("/api/v1/process-tasks/kiosks"))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.message").value("Forbidden"));
    }

    @Test
    void taskCreateReturnsCreatedPayloadWhenModuleIsAllowed() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(processTasksService.createTask(eq(7L), eq(1L), any())).willReturn(Map.of(
            "id", 91,
            "title", "Inspect kiosk",
            "status", "pending"
        ));

        mockMvc.perform(
            post("/api/v1/process-tasks")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "title": "Inspect kiosk",
                      "status": "pending"
                    }
                    """)
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(91))
            .andExpect(jsonPath("$.title").value("Inspect kiosk"));
    }

    @Test
    void taskAgendaPlacementReturnsUpdatedPayloadWhenModuleIsAllowed() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(processTasksService.updateAgendaPlacement(eq(7L), eq(1L), eq(91L), any())).willReturn(Map.of(
            "id", 91,
            "agendaDate", "2026-06-03",
            "agendaStartTime", "14:00"
        ));

        mockMvc.perform(
            patch("/api/v1/process-tasks/91/agenda-placement")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "agendaDate": "2026-06-03",
                      "agendaStartTime": "14:00",
                      "agendaTimeZone": "America/Toronto"
                    }
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(91))
            .andExpect(jsonPath("$.agendaDate").value("2026-06-03"))
            .andExpect(jsonPath("$.agendaStartTime").value("14:00"));
    }

    @Test
    void taskPatchReturnsUpdatedPayloadWhenModuleIsAllowed() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(processTasksService.patchTask(eq(7L), eq(1L), eq(91L), any())).willReturn(Map.of(
            "id", 91,
            "status", "in_progress"
        ));

        mockMvc.perform(
            patch("/api/v1/process-tasks/91")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "status": "in_progress"
                    }
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(91))
            .andExpect(jsonPath("$.status").value("in_progress"));
    }

    @Test
    void taskContributionReturnsTeamProgressWhenMemberMarksReady() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(processTasksService.updateCurrentUserContribution(eq(7L), eq(1L), eq(91L), any())).willReturn(Map.of(
            "id", 91,
            "currentUserContributionStatus", "ready",
            "teamReadyCount", 2,
            "teamSize", 3
        ));

        mockMvc.perform(
            patch("/api/v1/process-tasks/91/contribution")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "status": "ready"
                    }
                    """)
        )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.currentUserContributionStatus").value("ready"))
            .andExpect(jsonPath("$.teamReadyCount").value(2))
            .andExpect(jsonPath("$.teamSize").value(3));
    }

    @Test
    void taskEventsReturnsCollaborationTraceWhenModuleIsAllowed() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(processTasksService.listCollaborationEvents(7L, 1L, 91L)).willReturn(Map.of(
            "items", java.util.List.of(Map.of(
                "id", 501,
                "eventType", "contribution_ready",
                "actorName", "Usuario Demo"
            )),
            "count", 1
        ));

        mockMvc.perform(get("/api/v1/process-tasks/91/events"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.items[0].eventType").value("contribution_ready"))
            .andExpect(jsonPath("$.items[0].actorName").value("Usuario Demo"));
    }

    @Test
    void taskFollowUpsReturnsInternalTimelineWhenModuleIsAllowed() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(processTasksService.listTaskFollowUps(7L, 1L, 91L)).willReturn(Map.of(
            "items", java.util.List.of(Map.of(
                "id", 801,
                "entryType", "decision",
                "followUpDate", "2026-08-22",
                "comment", "El equipo aprobó el siguiente paso."
            )),
            "count", 1
        ));

        mockMvc.perform(get("/api/v1/process-tasks/91/follow-ups"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.count").value(1))
            .andExpect(jsonPath("$.items[0].entryType").value("decision"))
            .andExpect(jsonPath("$.items[0].followUpDate").value("2026-08-22"));
    }

    @Test
    void taskFollowUpCreatesDatedInternalCommentWhenModuleIsAllowed() throws Exception {
        var currentUser = new AuthSessionUser(1L, 7L, "Usuario Demo", "user");
        given(sessionAuthService.currentUser(any())).willReturn(Optional.of(currentUser));
        given(processTasksService.createTaskFollowUp(eq(7L), eq(1L), eq(91L), any())).willReturn(Map.of(
            "id", 802,
            "entryType", "blocker",
            "followUpDate", "2026-08-23",
            "comment", "Esperamos confirmación del proveedor."
        ));

        mockMvc.perform(
            post("/api/v1/process-tasks/91/follow-ups")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "entryType": "blocker",
                      "followUpDate": "2026-08-23",
                      "comment": "Esperamos confirmación del proveedor."
                    }
                    """)
        )
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.entryType").value("blocker"))
            .andExpect(jsonPath("$.comment").value("Esperamos confirmación del proveedor."));
    }
}
