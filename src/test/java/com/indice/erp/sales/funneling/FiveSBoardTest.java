package com.indice.erp.sales.funneling;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.indice.erp.ideasboard.FiveSPolicy;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.storage.*;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import jakarta.validation.Validation;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import static com.indice.erp.sales.funneling.IdeasBoardContracts.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class FiveSBoardTest {
 final ObjectMapper mapper=new ObjectMapper().registerModule(new JavaTimeModule());
 final AuthSessionUser actor=new AuthSessionUser(7L,8L,"Test","user");
 final IdeasBoardRepository repository=mock(IdeasBoardRepository.class);
 final IdeasBoardService service=new IdeasBoardService(repository,mock(ModuleAccessService.class),Validation.buildDefaultValidatorFactory().getValidator(),mock(ObjectStorageService.class),new ObjectStorageProperties(),mock(CompanyStorageMeter.class));
 FiveS metadata(String role,String before){return new FiveS(UUID.randomUUID().toString(),role,"SORT","Office","Arrange contracts","Team",LocalDate.of(2026,10,30),"PENDING","Note","",null,before,null);}
 Node node(FiveS f){return new Node(UUID.randomUUID().toString(),"TEXT","Find contracts",40d,40d,300d,240d,"RECTANGLE","BLUE",null,null,null,null,f);}
 Document doc(Node node){return new Document(List.of(node),List.of(),new Viewport(0d,0d,1d));}
 @Test void structuredDataRoundTripsAndLegacyJsonOmitsTheField() throws Exception {
  var n=node(metadata("ACTION",null));var round=mapper.readValue(mapper.writeValueAsBytes(doc(n)),Document.class);assertThat(round).isEqualTo(doc(n));
  var legacy=new Node(n.id(),"TEXT","Legacy",0d,0d,240d,160d,"NOTE","YELLOW",null);assertThat(mapper.writeValueAsString(legacy)).doesNotContain("fiveS");
 }
 @Test void personalValidationAcceptsActionsButSalesRejectsMetadata() {
  when(repository.encode(any())).thenReturn("{}");var n=node(metadata("ACTION",null));service.validateSnapshot(actor,doc(n),IdeasBoardScope.PERSONAL);
  assertThatThrownBy(()->service.validateSnapshot(actor,doc(n),IdeasBoardScope.FUNNEL)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
 }
 @Test void evidenceMustBeAnAuthorizedImageAndUsesTheSameOwnerScope() {
  String id=UUID.randomUUID().toString();var n=node(metadata("ACTION",id));when(repository.asset(actor,id,IdeasBoardScope.PERSONAL)).thenReturn(Optional.empty());
  assertThatThrownBy(()->service.validateSnapshot(actor,doc(n),IdeasBoardScope.PERSONAL)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
  when(repository.asset(actor,id,IdeasBoardScope.PERSONAL)).thenReturn(Optional.of(new StoredAsset(new Asset(id,"proof.png","image/png",24),"ideas-board/8/7/"+id,"digest")));when(repository.encode(any())).thenReturn("{}");
  service.validateSnapshot(actor,doc(n),IdeasBoardScope.PERSONAL);
  when(repository.asset(actor,id,IdeasBoardScope.PERSONAL)).thenReturn(Optional.of(new StoredAsset(new Asset(id,"proof.mp3","audio/mpeg",24),"ideas-board/8/7/"+id,"digest")));
  assertThatThrownBy(()->service.validateSnapshot(actor,doc(n),IdeasBoardScope.PERSONAL)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
 }
 @Test void copiesRemapAllEvidenceAndSectionHeadersCannotCarryPrivateAssets() {
  String id=UUID.randomUUID().toString(),replacement=UUID.randomUUID().toString();var f=metadata("ACTION",id);var result=FiveSPolicy.remap(f,Map.of(id,replacement));assertThat(result.beforeAssetId()).isEqualTo(replacement);assertThat(result.templateId()).isEqualTo(f.templateId());assertThat(FiveSPolicy.assets(node(f))).containsExactly(id);
  assertThatThrownBy(()->FiveSPolicy.validate(node(metadata("SECTION",id)))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
 }
 @Test void invalidBoundedFieldsAreRejected() {
  when(repository.encode(any())).thenReturn("{}");var good=metadata("ACTION",null);
  for(String section:List.of("SORT","UNKNOWN")){
   var bad=new FiveS(good.templateId(),"ACTION",section," ","x".repeat(1001),"Team",null,"INVALID",null,null,null,null,null);
   assertThatThrownBy(()->service.validateSnapshot(actor,doc(node(bad)),IdeasBoardScope.PERSONAL)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
  }
 }
}
