package com.indice.erp.sales.funneling;

import com.indice.erp.sales.funneling.brand.*;
import com.indice.erp.storage.*;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.junit.jupiter.api.*;
import java.util.*;
import static com.indice.erp.sales.funneling.brand.BrandContracts.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Existing campaign regression is inherited to verify the new owner leaves its behavior intact. */
class BrandLibraryIntegrationTest extends FunnelIntegrationTest {
 @Autowired BrandLibraryService brands;
 @Autowired BrandFileService files;
 @MockitoBean ObjectStorageService storage;
 @MockitoBean CompanyStorageMeter meter;
 Details details(String value){return new Details(value,"Consultations","Personal attention","Local businesses","Toronto","example.com","Friendly","Keep the original logo",List.of("#FF6B5E"));}
 String key(){return BrandAccess.key(actor);}
 String campaign(){return service.save(actor,UUID.randomUUID().toString(),input(0,"DRAFT",null,null)).id();}
 @Test void companyContextPersistsAndKeepsGlobalIdentityAndTenantIsolation(){
  String id=UUID.randomUUID().toString();var saved=brands.save(actor,key(),new ProfileInput(details("One company"),0,id));assertThat(saved.version()).isEqualTo(1);
  assertThat(brands.get(actor).details().description()).isEqualTo("One company");
  assertThat(brands.save(actor,key(),new ProfileInput(details("One company"),0,id)).version()).isEqualTo(1);
  assertThatThrownBy(()->brands.save(actor,key(),new ProfileInput(details("Changed retry"),0,id))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
  assertThat(db.queryForObject("SELECT COUNT(*) FROM sales_brand_profiles WHERE company_id=?",Long.class,other)).isZero();
  assertThat(db.queryForObject("SELECT name FROM companies WHERE id=?",String.class,company)).startsWith("Funnel ");
  assertThatThrownBy(()->brands.save(actor,"another-company",new ProfileInput(details("No"),1,UUID.randomUUID().toString()))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
 }
 @Test void staleProfileSavesKeepLatestData(){brands.save(actor,key(),new ProfileInput(details("Latest"),0,UUID.randomUUID().toString()));assertThatThrownBy(()->brands.save(actor,key(),new ProfileInput(details("Stale"),0,UUID.randomUUID().toString()))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);assertThat(brands.get(actor).details().description()).isEqualTo("Latest");}
 @Test void selectedContextIsAnIndependentSnapshotAndDoesNotRewriteCampaign(){
  var id=campaign();brands.save(actor,key(),new ProfileInput(details("Original brand"),0,UUID.randomUUID().toString()));String mutation=UUID.randomUUID().toString();var in=new Selection(0,1,true,List.of(),mutation);
  var selected=brands.select(actor,key(),id,in);assertThat(selected.details().description()).isEqualTo("Original brand");
  brands.save(actor,key(),new ProfileInput(details("New brand"),1,UUID.randomUUID().toString()));
  assertThat(brands.snapshot(actor,id).details().description()).isEqualTo("Original brand");assertThat(brands.select(actor,key(),id,in).version()).isEqualTo(1);
  assertThat(service.get(actor,id).version()).isEqualTo(1);assertThat(service.get(actor,id).objective()).isEqualTo("Schedule consultations");
  assertThatThrownBy(()->brands.select(actor,key(),id,new Selection(1,1,true,List.of(),UUID.randomUUID().toString()))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
 }
 @Test void fileRegistrationSealsStorageAndRetryDoesNotDuplicate(){
  when(storage.isEnabled()).thenReturn(true);when(meter.presign(anyLong(),anyString(),anyString(),anyString(),anyString(),anyLong(),anyInt())).thenReturn(new PresignedUpload("temporary","http://127.0.0.1/test",java.time.Instant.now(),Map.of()));
  String id=UUID.randomUUID().toString();var in=new UploadInput(id,"guide.txt","text/plain",5,"DOCUMENT");files.upload(actor,key(),in);
  when(storage.objectExists(anyString(),anyString())).thenReturn(true);when(storage.objectMetadata(anyString(),anyString())).thenReturn(new StoredObjectMetadata(5,"text/plain"));when(storage.readObject(anyString(),anyString(),anyInt())).thenReturn("hello".getBytes());
  assertThat(files.register(actor,key(),id).status()).isEqualTo("READY");assertThat(files.register(actor,key(),id).id()).isEqualTo(id);assertThat(files.upload(actor,key(),in).ready().id()).isEqualTo(id);
  String stored=db.queryForObject("SELECT object_key FROM sales_brand_assets WHERE company_id=? AND id=?",String.class,company,id);assertThat(stored).contains("/assets/").doesNotContain("/staging/");
  verify(storage,times(1)).copyObject(anyString(),contains("/staging/"),contains("/assets/"));
  String campaign=campaign();brands.select(actor,key(),campaign,new Selection(0,0,false,List.of(id),UUID.randomUUID().toString()));files.status(actor,key(),id,true);
  assertThat(files.list(actor,false)).isEmpty();assertThat(files.list(actor,true)).hasSize(1);assertThat(brands.snapshot(actor,campaign).assets()).hasSize(1);assertThat(files.download(actor,id)).isEqualTo("hello".getBytes());
  files.status(actor,key(),id,false);assertThat(files.list(actor,false)).hasSize(1);
 }
 @Test void invalidFilesCrossCompanyReferencesAndReadinessAreRejected(){
  when(storage.isEnabled()).thenReturn(true);
  assertThatThrownBy(()->files.upload(actor,key(),new UploadInput(UUID.randomUUID().toString(),"active.svg","image/svg+xml",200,"PHOTO"))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
  String file=UUID.randomUUID().toString();db.update("INSERT INTO sales_brand_assets(company_id,id,created_by,filename,content_type,size_bytes,category,object_key,status) VALUES(?,?,?,'private.txt','text/plain',5,'DOCUMENT','private','READY')",other,file,user);
  assertThatThrownBy(()->files.download(actor,file)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
  assertThatThrownBy(()->brands.select(actor,key(),campaign(),new Selection(0,0,false,List.of(file),UUID.randomUUID().toString()))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
 }
 @Test void nativeHttpRequiresCsrfTabAndActorAndReturnsOnlyScopedCompanyData()throws Exception{
  var body=new ProfileInput(details("Saved safely"),0,UUID.randomUUID().toString());
  mvc.perform(put("/api/v1/sales/company-library").session(session()).header("X-Brand-Actor",key()).contentType("application/json").content(mapper.writeValueAsBytes(body))).andExpect(status().isForbidden());
  mvc.perform(put("/api/v1/sales/company-library").session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Brand-Actor","wrong").contentType("application/json").content(mapper.writeValueAsBytes(body))).andExpect(status().isConflict());
  mvc.perform(put("/api/v1/sales/company-library").session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Brand-Actor",key()).contentType("application/json").content(mapper.writeValueAsBytes(body))).andExpect(status().isOk()).andExpect(jsonPath("$.version").value(1));
  mvc.perform(get("/api/v1/sales/company-library").session(session())).andExpect(status().isOk()).andExpect(jsonPath("$.profile.details.description").value("Saved safely"));
  db.update("DELETE FROM user_company_tab_permissions WHERE user_company_id=?",membership);
  mvc.perform(get("/api/v1/sales/company-library").session(session())).andExpect(status().isForbidden());
 }
 @Test void invalidCopiedContentCannotBecomeReadyOrUseFinalQuota(){
  when(storage.isEnabled()).thenReturn(true);when(meter.presign(anyLong(),anyString(),anyString(),anyString(),anyString(),anyLong(),anyInt())).thenReturn(new PresignedUpload("temporary","http://127.0.0.1/test",java.time.Instant.now(),Map.of()));
  String id=UUID.randomUUID().toString();files.upload(actor,key(),new UploadInput(id,"photo.png","image/png",5,"PHOTO"));when(storage.objectExists(anyString(),anyString())).thenReturn(true);when(storage.objectMetadata(anyString(),anyString())).thenReturn(new StoredObjectMetadata(5,"image/png"));when(storage.readObject(anyString(),anyString(),anyInt())).thenReturn("wrong".getBytes());
  assertThatThrownBy(()->files.register(actor,key(),id)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);assertThat(db.queryForObject("SELECT status FROM sales_brand_assets WHERE company_id=? AND id=?",String.class,company,id)).isEqualTo("PENDING");verify(meter,never()).commitMoved(anyLong(),anyString(),anyString(),anyString(),anyLong());
 }
 @Test void registrationRechecksCapacityAfterThePendingReservationAges(){
  String pending=UUID.randomUUID().toString();db.update("INSERT INTO sales_brand_assets(company_id,id,created_by,filename,content_type,size_bytes,category,object_key,status) VALUES(?,?,?,'pending.txt','text/plain',5,'DOCUMENT','pending','PENDING')",company,pending,user);
  for(int i=0;i<30;i++)db.update("INSERT INTO sales_brand_assets(company_id,id,created_by,filename,content_type,size_bytes,category,object_key,status) VALUES(?,?,?,'ready.txt','text/plain',5,'DOCUMENT','ready','READY')",company,UUID.randomUUID().toString(),user);
  assertThatThrownBy(()->files.register(actor,key(),pending)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);verify(storage,never()).copyObject(anyString(),anyString(),anyString());
 }

 @Test void guidedAnswersKeepLegacyFieldsAndCampaignSnapshotsIndependent()throws Exception{
  String legacy="{\"description\":\"Earlier description\",\"offer\":\"Earlier offer\",\"difference\":\"Earlier difference\",\"audience\":\"Earlier audience\",\"region\":\"Toronto\",\"contact\":\"example.com\",\"voice\":\"Earlier voice\",\"guidance\":\"Earlier guidance\",\"colors\":[]}";
  Details old=mapper.readValue(legacy,Details.class);assertThat(old.answers()).isEqualTo(emptyAnswers());
  Answers answers=new Answers("PROFESSIONAL","","SERVICES",List.of("Consultation"),List.of("SMALL_BUSINESSES"),"Organize daily operations",List.of("ATTENTION","EXPERTISE"),List.of("ONLINE"),"NATIONAL",List.of("WHATSAPP","APPOINTMENT"),List.of("FRIENDLY","PROFESSIONAL"),"INFORMAL","es",List.of("Practical"),"Do not promise guaranteed results",true);
  Details enriched=new Details(old.description(),old.offer(),old.difference(),old.audience(),old.region(),old.contact(),old.voice(),old.guidance(),old.colors(),answers);
  var saved=brands.save(actor,key(),new ProfileInput(enriched,0,UUID.randomUUID().toString()));
  assertThat(brands.get(actor).details()).isEqualTo(enriched);assertThat(mapper.writeValueAsString(saved)).doesNotContain("selectionUnique");
  String id=campaign();brands.select(actor,key(),id,new Selection(0,1,true,List.of(),UUID.randomUUID().toString()));
  brands.save(actor,key(),new ProfileInput(details("Changed later"),1,UUID.randomUUID().toString()));
  assertThat(brands.snapshot(actor,id).details().answers()).isEqualTo(answers);assertThat(brands.snapshot(actor,id).details().offer()).isEqualTo("Earlier offer");
 }
 @Test void guidedHttpRejectsUnknownChoicesDuplicatesAndTooManyTonesAtomically()throws Exception{
  var tree=mapper.valueToTree(new ProfileInput(details("Unchanged"),0,UUID.randomUUID().toString()));
  var answers=(com.fasterxml.jackson.databind.node.ObjectNode)tree.get("details").get("answers");
  answers.put("industry","UNRECOGNIZED");
  mvc.perform(put("/api/v1/sales/company-library").session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Brand-Actor",key()).contentType("application/json").content(mapper.writeValueAsBytes(tree))).andExpect(status().isBadRequest());
  answers.put("industry","RETAIL");answers.putArray("tones").add("FRIENDLY").add("PRACTICAL").add("PROFESSIONAL");
  mvc.perform(put("/api/v1/sales/company-library").session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Brand-Actor",key()).contentType("application/json").content(mapper.writeValueAsBytes(tree))).andExpect(status().isBadRequest());
  answers.putArray("tones").add("FRIENDLY").add("FRIENDLY");
  mvc.perform(put("/api/v1/sales/company-library").session(session()).header("X-CSRF-Token","synthetic-csrf").header("X-Brand-Actor",key()).contentType("application/json").content(mapper.writeValueAsBytes(tree))).andExpect(status().isBadRequest());
  assertThat(brands.get(actor).version()).isZero();
 }
 @Test void logoVariantsRequireImagesAndKeepDescriptionsAcrossRegistrationAndSelection(){
  when(storage.isEnabled()).thenReturn(true);when(meter.presign(anyLong(),anyString(),anyString(),anyString(),anyString(),anyLong(),anyInt())).thenReturn(new PresignedUpload("temporary","http://127.0.0.1/test",java.time.Instant.now(),Map.of()));
  assertThatThrownBy(()->files.upload(actor,key(),new UploadInput(UUID.randomUUID().toString(),"logo.pdf","application/pdf",5,"LOGO_VARIANT","Logo","LIGHT"))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
  byte[] png=Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7S0AAAAASUVORK5CYII=");
  String id=UUID.randomUUID().toString();var input=new UploadInput(id,"light.png","image/png",png.length,"LOGO_VARIANT","Use on dark backgrounds","LIGHT");files.upload(actor,key(),input);
  when(storage.objectExists(anyString(),anyString())).thenReturn(true);when(storage.objectMetadata(anyString(),anyString())).thenReturn(new StoredObjectMetadata(png.length,"image/png"));when(storage.readObject(anyString(),anyString(),anyInt())).thenReturn(png);
  var registered=files.register(actor,key(),id);assertThat(registered.description()).isEqualTo(input.description());assertThat(registered.logoVariant()).isEqualTo("LIGHT");
  assertThat(files.upload(actor,key(),input).ready()).isEqualTo(registered);
  assertThatThrownBy(()->files.upload(actor,key(),new UploadInput(id,"light.png","image/png",png.length,"LOGO_VARIANT","Changed retry","LIGHT"))).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
  var selected=brands.select(actor,key(),campaign(),new Selection(0,0,false,List.of(id),UUID.randomUUID().toString()));assertThat(selected.assets()).containsExactly(registered);assertThat(files.download(actor,id)).isEqualTo(png);
 }

}
