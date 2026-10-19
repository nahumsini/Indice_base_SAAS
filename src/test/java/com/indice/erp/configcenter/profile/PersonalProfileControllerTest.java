package com.indice.erp.configcenter.profile;

import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.indice.erp.auth.*;
import com.indice.erp.config.AppWebProperties;
import com.indice.erp.configcenter.*;
import com.indice.erp.location.GoogleMapsCoordinateExtractor;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class PersonalProfileControllerTest {
    final SessionAuthService auth=mock(SessionAuthService.class);
    final SessionCsrfService csrf=mock(SessionCsrfService.class);
    final ConfigCenterService profiles=mock(ConfigCenterService.class);
    final MockMvc mvc=MockMvcBuilders.standaloneSetup(new ConfigCenterApiController(auth,csrf,mock(ConfigCenterAccessService.class),profiles,mock(GoogleMapsCoordinateExtractor.class),mock(InvitationEmailService.class),new AppWebProperties(),mock(InvitationSeatCoordinator.class),mock(ConfigCenterUserSeatCoordinator.class))).build();
    @BeforeEach void actor(){when(auth.currentUser(any())).thenReturn(Optional.of(new AuthSessionUser(1L,7L,"Synthetic User","user")));}
    @Test void rejectsAStaleAccountBeforeReadingSavingOrUploading() throws Exception {
        mvc.perform(get("/api/v1/config-center/current-user").header("X-Profile-Actor","8:2")).andExpect(status().isConflict());
        mvc.perform(put("/api/v1/config-center/current-user").header("X-Profile-Actor","8:2").contentType("application/json").content("{}")).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/config-center/current-user/avatar/presign-upload").header("X-Profile-Actor","8:2").contentType("application/json").content("{}")).andExpect(status().isConflict());
        verifyNoInteractions(profiles);
    }
    @Test void csrfAndAuthenticationStillGuardBothMutations() throws Exception {
        doThrow(new IllegalArgumentException("Invalid CSRF")).when(csrf).requireCsrf(any(),nullable(String.class));
        mvc.perform(put("/api/v1/config-center/current-user").contentType("application/json").content("{}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/config-center/current-user/avatar/presign-upload").contentType("application/json").content("{}")).andExpect(status().isForbidden());
        when(auth.currentUser(any())).thenReturn(Optional.empty());
        mvc.perform(get("/api/v1/config-center/current-user")).andExpect(status().isUnauthorized());
        verifyNoInteractions(profiles);
    }
    @Test void actorFromBodyCannotReplaceSessionOwnerAndErrorsHaveStableCodes() throws Exception {
        when(profiles.saveCurrentUser(eq(7L),eq(1L),eq("user"),anyMap())).thenThrow(new ProfileInputException("profile_name_required","At least one name field is required."));
        mvc.perform(put("/api/v1/config-center/current-user").header("X-Profile-Actor","7:1").contentType("application/json").content(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(Map.of("user_id",999,"company_id",999))))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("profile_name_required"));
        verify(profiles).saveCurrentUser(eq(7L),eq(1L),eq("user"),anyMap());
    }
}
