package com.indice.erp.configcenter.users;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import com.indice.erp.auth.*;
import com.indice.erp.config.AppWebProperties;
import com.indice.erp.configcenter.*;
import com.indice.erp.configcenter.ConfigCenterAccessService.ConfigCenterTab;
import com.indice.erp.location.GoogleMapsCoordinateExtractor;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
class UsersFlowControllerTest {
 final SessionAuthService auth=mock(SessionAuthService.class);final SessionCsrfService csrf=mock(SessionCsrfService.class);
 final ConfigCenterAccessService access=mock(ConfigCenterAccessService.class);final ConfigCenterService users=mock(ConfigCenterService.class);
 final InvitationSeatCoordinator invitations=mock(InvitationSeatCoordinator.class);final ConfigCenterUserSeatCoordinator seats=mock(ConfigCenterUserSeatCoordinator.class);
 final AuthSessionUser actor=new AuthSessionUser(1L,7L,"Synthetic User","admin");
 final MockMvc mvc=MockMvcBuilders.standaloneSetup(new ConfigCenterApiController(auth,csrf,access,users,mock(GoogleMapsCoordinateExtractor.class),mock(InvitationEmailService.class),new AppWebProperties(),invitations,seats)).build();
 @BeforeEach void setup(){when(auth.currentUser(any())).thenReturn(Optional.of(actor));when(access.canAccess(actor,ConfigCenterTab.USERS)).thenReturn(true);}
 @Test void staleActorIsRejectedBeforeAnyUserOrInvitationReadWrite() throws Exception {
  mvc.perform(get("/api/v1/config-center/users").header("X-Users-Actor","8:2")).andExpect(status().isConflict());
  mvc.perform(put("/api/v1/config-center/users/2").header("X-Users-Actor","8:2").contentType("application/json").content("{}")).andExpect(status().isConflict());
  for(String path:List.of("users/2/activate","users/invite","users/invitations/2/resend"))mvc.perform(post("/api/v1/config-center/"+path).header("X-Users-Actor","8:2").contentType("application/json").content("{}")).andExpect(status().isConflict());
  for(String path:List.of("users/2","users/invitations/2"))mvc.perform(delete("/api/v1/config-center/"+path).header("X-Users-Actor","8:2")).andExpect(status().isConflict());verifyNoInteractions(users,invitations,seats);
 }
 @Test void csrfAndTabPermissionStillGuardAllMutations() throws Exception {
  doThrow(new IllegalArgumentException("Invalid CSRF")).when(csrf).requireCsrf(any(),nullable(String.class));
  mvc.perform(put("/api/v1/config-center/users/2").contentType("application/json").content("{}")).andExpect(status().isForbidden());
  mvc.perform(post("/api/v1/config-center/users/invite").contentType("application/json").content("{}")).andExpect(status().isForbidden());
  mvc.perform(delete("/api/v1/config-center/users/invitations/2")).andExpect(status().isForbidden());
  when(access.canAccess(actor,ConfigCenterTab.USERS)).thenReturn(false);mvc.perform(get("/api/v1/config-center/users")).andExpect(status().isForbidden());verifyNoInteractions(users,invitations,seats);
 }
 @Test void sessionOwnsCompanyAndActorAndValidationHasStableCodes() throws Exception {
  when(users.updateUser(eq(7L),eq(1L),eq("admin"),eq(2L),anyMap())).thenThrow(new UserAccessException("user_last_administrator","At least one administrator must remain."));
  mvc.perform(put("/api/v1/config-center/users/2").header("X-Users-Actor","7:1").contentType("application/json").content("{\"company_id\":999,\"user_id\":999}"))
   .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("user_last_administrator"));
 }
}
