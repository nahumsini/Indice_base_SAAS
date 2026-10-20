package com.indice.erp.configcenter.company;
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
class CompanySettingsControllerTest {
 final SessionAuthService auth=mock(SessionAuthService.class);
 final SessionCsrfService csrf=mock(SessionCsrfService.class);
 final ConfigCenterAccessService access=mock(ConfigCenterAccessService.class);
 final ConfigCenterService company=mock(ConfigCenterService.class);
 final GoogleMapsCoordinateExtractor coordinates=mock(GoogleMapsCoordinateExtractor.class);
 final AuthSessionUser actor=new AuthSessionUser(1L,7L,"Synthetic User","admin");
 final MockMvc mvc=MockMvcBuilders.standaloneSetup(new ConfigCenterApiController(auth,csrf,access,company,coordinates,mock(InvitationEmailService.class),new AppWebProperties(),mock(InvitationSeatCoordinator.class),mock(ConfigCenterUserSeatCoordinator.class))).build();
 @BeforeEach void setup(){when(auth.currentUser(any())).thenReturn(Optional.of(actor));when(access.canAccess(eq(actor),eq(ConfigCenterTab.BUSINESS_STRUCTURE))).thenReturn(true);}
 @Test void staleAccountCannotReadOrMutateAnotherCompany() throws Exception {
   for(var path:List.of("company","config")) mvc.perform(get("/api/v1/config-center/"+path).header("X-Company-Actor","8:2")).andExpect(status().isConflict());
   for(var path:List.of("company","business-structure")) mvc.perform(put("/api/v1/config-center/"+path).header("X-Company-Actor","8:2").contentType("application/json").content("{}")).andExpect(status().isConflict());
   mvc.perform(post("/api/v1/config-center/locations/extract-coordinates").header("X-Company-Actor","8:2").contentType("application/json").content("{}")).andExpect(status().isConflict());
   verifyNoInteractions(company,coordinates);
 }
 @Test void everyWriteStillRequiresCsrfAndTabPermission() throws Exception {
   doThrow(new IllegalArgumentException("Invalid CSRF")).when(csrf).requireCsrf(any(),nullable(String.class));
   for(var path:List.of("company","business-structure"))mvc.perform(put("/api/v1/config-center/"+path).contentType("application/json").content("{}")).andExpect(status().isForbidden());
   when(access.canAccess(eq(actor),eq(ConfigCenterTab.BUSINESS_STRUCTURE))).thenReturn(false);
   mvc.perform(put("/api/v1/config-center/company").contentType("application/json").content("{}")).andExpect(status().isForbidden());verifyNoInteractions(company);
 }
 @Test void sessionOwnsTheMutationAndErrorsHaveStableCodes() throws Exception {
   when(company.saveCompany(eq(actor),anyMap())).thenThrow(new CompanySettingsException("company_name_required","Enter a name."));
   mvc.perform(put("/api/v1/config-center/company").header("X-Company-Actor","7:1").contentType("application/json").content("{\"company_id\":999,\"user_id\":999}"))
     .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("company_name_required"));verify(company).saveCompany(eq(actor),anyMap());
 }
}
