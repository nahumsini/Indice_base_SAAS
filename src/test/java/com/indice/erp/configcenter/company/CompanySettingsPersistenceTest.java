package com.indice.erp.configcenter.company;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.configcenter.*;
import com.indice.erp.hr.*;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.storage.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.*;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.transaction.annotation.*;
@JdbcTest(properties={"logging.level.org.springframework=WARN"})
@AutoConfigureTestDatabase(replace=AutoConfigureTestDatabase.Replace.NONE)
@Import(CompanySettingsPersistenceTest.Config.class)
@Transactional(propagation=Propagation.NOT_SUPPORTED)
class CompanySettingsPersistenceTest {
 @TestConfiguration static class Config {
  @Bean ConfigCenterScopeAccess scope(){var scope=mock(ConfigCenterScopeAccess.class);when(scope.resolve(any())).thenReturn(HrOperationalScope.corporateOffice());return scope;}
  @Bean ConfigCenterService company(JdbcTemplate db,ConfigCenterScopeAccess scope){return new ConfigCenterService(db,new ObjectMapper(),new BCryptPasswordEncoder(),new DisabledObjectStorageService(),new ObjectStorageProperties(),mock(CompanyStorageMeter.class),scope);}
 }
 @Autowired JdbcTemplate db;
 @Autowired ConfigCenterService company;
 @Autowired ConfigCenterScopeAccess scope;
 AuthSessionUser actor(){
  assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");
  db.update("INSERT INTO users(email,password_hash,full_name) VALUES (?,'test-only','Synthetic User')",UUID.randomUUID()+"@example.invalid");long user=db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);
  db.update("INSERT INTO companies(name) VALUES ('Synthetic Company')");long id=db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);
  db.update("INSERT INTO company_settings(company_id,settings_json) VALUES (?,?)",id,"{\"unrelated\":{\"keep\":true},\"config_center\":{\"estructura\":\"multi\",\"empresa_template\":{\"currency\":\"CAD\",\"timezone\":\"America/Toronto\",\"modelo_negocio\":\"services\",\"tamano_empresa\":\"small\"}}}");
  return new AuthSessionUser(user,id,"Synthetic User","admin");
 }
 Map<String,Object> unit(String name){return new LinkedHashMap<>(Map.of("name",name,"is_corporate_office",true,"businesses",List.of(Map.of("name","Synthetic Office"))));}
 Map<String,Object> bundle(String name,List<?> map){return new LinkedHashMap<>(Map.of("estructura","multi","company",Map.of("nombre_empresa",name,"descripcion","Practical description","address",Map.of("street","Synthetic Street","country","MX","city","Synthetic City","state","CMX","zip","01000")),"map",map));}
 List<Map<String,Object>> units(Map<String,Object> receipt){return new ObjectMapper().convertValue(receipt.get("map"),new com.fasterxml.jackson.core.type.TypeReference<List<Map<String,Object>>>(){});}
 String settings(long id){return db.queryForObject("SELECT settings_json FROM company_settings WHERE company_id=?",String.class,id);}
 @Test void atomicSaveReloadsIdentityOrganizationAndGeneratedIdsWithoutErasingUnrelatedSettings() throws Exception {
  var a=actor();var saved=company.saveStructure(a,bundle("Edited Company",List.of(unit("Main Unit"))));var map=units(saved);
  assertThat(map.get(0).get("legacy_unit_id")).isNotNull();assertThat(new ObjectMapper().valueToTree(map.get(0).get("businesses")).get(0).get("legacy_business_id").asLong()).isPositive();
  var read=company.getEmpresa(a.companyId());assertThat(read.get("nombre_empresa")).isEqualTo("Edited Company");assertThat(read.get("descripcion")).isEqualTo("Practical description");assertThat(read.get("moneda")).isEqualTo("CAD");assertThat(read.get("zona_horaria")).isEqualTo("America/Toronto");assertThat(read.get("modelo_negocio")).isEqualTo("services");assertThat(read.get("tamano_empresa")).isEqualTo("small");assertThat(new ObjectMapper().readTree(settings(a.companyId())).path("unrelated").path("keep").asBoolean()).isTrue();
  company.saveStructure(a,bundle("Edited Company",List.of(unit("Main Unit"))));
  assertThat(db.queryForObject("SELECT COUNT(*) FROM units WHERE company_id=?",Integer.class,a.companyId())).isEqualTo(map.size());
 }
 @Test void renamingUsesTheSameUnitAndBusinessRecordsAndPersistsTheirIds(){
  var a=actor();var receipt=company.saveStructure(a,bundle("Company",List.of(unit("Main Unit"))));var map=units(receipt);long unit=((Number)map.get(0).get("legacy_unit_id")).longValue();
  var businesses=new ObjectMapper().convertValue(map.get(0).get("businesses"),new com.fasterxml.jackson.core.type.TypeReference<List<Map<String,Object>>>(){});long business=((Number)businesses.get(1).get("legacy_business_id")).longValue();
  map.get(0).put("name","Renamed Unit");businesses.get(1).put("name","Renamed Office");map.get(0).put("businesses",businesses);
  company.saveStructure(a,bundle("Company",map));company.saveStructure(a,bundle("Company",map));
  assertThat(db.queryForObject("SELECT name FROM units WHERE id=? AND company_id=?",String.class,unit,a.companyId())).isEqualTo("Renamed Unit");assertThat(db.queryForObject("SELECT name FROM businesses WHERE id=? AND company_id=?",String.class,business,a.companyId())).isEqualTo("Renamed Office");
  assertThat(db.queryForObject("SELECT COUNT(*) FROM units WHERE company_id=?",Integer.class,a.companyId())).isEqualTo(map.size());
  assertThat(db.queryForObject("SELECT COUNT(*) FROM businesses WHERE company_id=?",Integer.class,a.companyId())).isEqualTo(businesses.size());
 }
 @Test void structureValidationAfterIdentityWriteRollsBackTheWholeUseCase(){
  var a=actor();String before=settings(a.companyId());
  var foreign=unit("Foreign Unit");foreign.put("legacy_unit_id",Long.MAX_VALUE);
  assertThatThrownBy(()->company.saveStructure(a,bundle("Must Roll Back",List.of(foreign)))).isInstanceOf(CompanySettingsException.class);
  assertThat(db.queryForObject("SELECT name FROM companies WHERE id=?",String.class,a.companyId())).isEqualTo("Synthetic Company");assertThat(settings(a.companyId())).isEqualTo(before);
  assertThat(db.queryForObject("SELECT COUNT(*) FROM units WHERE company_id=?",Integer.class,a.companyId())).isZero();
 }
 @Test void partialUpdatesPreserveOmittedPreferencesAndExplicitClearsSurviveReload(){
  var a=actor();company.saveCompany(a,Map.of("nombre_empresa","Named Company","logo_url","https://example.invalid/logo.png"));
  company.saveCompany(a,Map.of("descripcion","","logo_url",""));var read=company.getEmpresa(a.companyId());assertThat(read.get("nombre_empresa")).isEqualTo("Named Company");assertThat(read.get("logo_url")).isEqualTo("");assertThat(read.get("moneda")).isEqualTo("CAD");assertThat(read.get("zona_horaria")).isEqualTo("America/Toronto");
 }
 @Test void missingListsBlankNamesAndInvalidCoordinatesCannotChangeStoredValues(){
  var a=actor();String before=settings(a.companyId());
  for(var invalid:List.of(Map.<String,Object>of("company",Map.of("nombre_empresa","Bad")),bundle("Bad",List.of(Map.of("name","Unit"))),bundle("Bad",List.of(unit(" "))),Map.<String,Object>of("nombre_empresa","Bad","latitude",100,"longitude",-79))) {
   assertThatThrownBy(()->{if(invalid.containsKey("company"))company.saveStructure(a,invalid);else company.saveCompany(a,invalid);}).isInstanceOf(IllegalArgumentException.class);
   assertThat(settings(a.companyId())).isEqualTo(before);assertThat(db.queryForObject("SELECT name FROM companies WHERE id=?",String.class,a.companyId())).isEqualTo("Synthetic Company");
  }
 }
 @Test void narrowerScopeCannotWriteCompanyOrWholeOrganization(){
  var a=actor();when(scope.resolve(a)).thenReturn(HrOperationalScope.unitHeadquarters(999L));
  try{assertThatThrownBy(()->company.saveCompany(a,Map.of("nombre_empresa","Denied"))).isInstanceOf(HrAccessDeniedException.class);assertThatThrownBy(()->company.saveStructure(a,bundle("Denied",List.of()))).isInstanceOf(HrAccessDeniedException.class);}
  finally{when(scope.resolve(a)).thenReturn(HrOperationalScope.corporateOffice());}
 }
}
