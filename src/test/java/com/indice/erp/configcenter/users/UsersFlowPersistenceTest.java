package com.indice.erp.configcenter.users;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.configcenter.*;
import com.indice.erp.billing.seats.SeatService;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.storage.*;
import java.time.Clock;
import java.util.*;
import java.util.concurrent.*;
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
@Import(UsersFlowPersistenceTest.Config.class)
@Transactional(propagation=Propagation.NOT_SUPPORTED)
class UsersFlowPersistenceTest {
 @TestConfiguration static class Config {
  @Bean ConfigCenterService users(JdbcTemplate db){return new ConfigCenterService(db,new ObjectMapper(),new BCryptPasswordEncoder(),new DisabledObjectStorageService(),new ObjectStorageProperties(),mock(CompanyStorageMeter.class),mock(ConfigCenterScopeAccess.class));}
  @Bean SeatService seats(JdbcTemplate db){return new SeatService(db,Clock.systemUTC());}
  @Bean InvitationSeatCoordinator invitations(ConfigCenterService users,SeatService seats){return new InvitationSeatCoordinator(users,seats);}
 }
 @Autowired JdbcTemplate db;@Autowired ConfigCenterService users;@Autowired InvitationSeatCoordinator invitations;
 long person(){db.update("INSERT INTO users(email,password_hash,full_name) VALUES (?,?,'Synthetic User')",UUID.randomUUID()+"@example.invalid",new BCryptPasswordEncoder().encode(" exact synthetic secret "));return db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);}
 long membership(long company,long user,String role){db.update("INSERT INTO user_companies(user_id,company_id,role,status,visibility) VALUES (?,?,?,'active','all')",user,company,role);long id=db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);db.update("INSERT INTO user_work_profiles(company_id,user_company_id,user_id,user_code,status) VALUES (?,?,?,?,'active')",company,id,user,"S-"+id);db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role,skill_level) VALUES (?,'config_center','viewer',0)",id);new ConfigCenterTabPermissionAccess(db).replaceUserTabPermissions(id,List.of("config_center.profile"),List.of("config_center"));return id;}
 AuthSessionUser company(){assertThat(db.queryForObject("SELECT DATABASE()",String.class)).isEqualTo("indice_test_db");db.update("INSERT INTO companies(name) VALUES ('Synthetic Users Company')");long company=db.queryForObject("SELECT LAST_INSERT_ID()",Long.class),user=person();membership(company,user,"root");db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES (?,'config_center','active','test')",company);return new AuthSessionUser(user,company,"Synthetic User","root");}
 Map<String,Object> payload(String role,Long unit,Long business){var p=new LinkedHashMap<String,Object>();p.put("role",role);p.put("status","active");p.put("unit_id",unit);p.put("business_id",business);p.put("module_slugs",List.of("config_center"));p.put("tab_permission_keys",List.of("config_center.profile"));p.put("kiosk_definition_ids",List.of());return p;}
 Map<String,Object> invite(String email){var p=payload("user",null,null);p.put("name","Synthetic Invitee");p.put("email",email);return p;}
 long unit(long company){db.update("INSERT INTO units(company_id,name,status) VALUES (?,'Synthetic Unit','active')",company);return db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);}
 long business(long company,long unit){db.update("INSERT INTO businesses(company_id,unit_id,name,status) VALUES (?,?,'Synthetic Business','active')",company,unit);return db.queryForObject("SELECT LAST_INSERT_ID()",Long.class);}
 String role(long membership){return db.queryForObject("SELECT role FROM user_companies WHERE id=?",String.class,membership);}
 @Test void roleScopeModulesAndTabsRoundTripAndExplicitNullClearsOldMembership(){var a=company();long target=person(),membership=membership(a.companyId(),target,"user"),unit=unit(a.companyId()),business=business(a.companyId(),unit);
  users.updateUser(a.companyId(),a.userId(),a.role(),target,payload("user",unit,business));assertThat(db.queryForObject("SELECT business_id FROM user_work_profiles WHERE user_company_id=?",Long.class,membership)).isEqualTo(business);
  users.updateUser(a.companyId(),a.userId(),a.role(),target,payload("admin",unit,null));assertThat(role(membership)).isEqualTo("admin");assertThat(db.queryForObject("SELECT business_id FROM user_work_profiles WHERE user_company_id=?",Long.class,membership)).isNull();
  users.updateUser(a.companyId(),a.userId(),a.role(),target,payload("user",null,null));assertThat(db.queryForObject("SELECT unit_id FROM user_work_profiles WHERE user_company_id=?",Long.class,membership)).isNull();assertThat(new ConfigCenterTabPermissionAccess(db).listUserTabPermissionKeys(membership)).containsExactly("config_center.profile");
 }
 @Test void invalidKioskAfterMembershipChangesRollsBackEveryAccessField(){var a=company();long target=person(),m=membership(a.companyId(),target,"user");var p=payload("admin",null,null);p.put("kiosk_definition_ids",List.of(Long.MAX_VALUE));assertThatThrownBy(()->users.updateUser(a.companyId(),a.userId(),a.role(),target,p)).isInstanceOf(IllegalArgumentException.class);assertThat(role(m)).isEqualTo("user");assertThat(new ConfigCenterTabPermissionAccess(db).listUserTabPermissionKeys(m)).containsExactly("config_center.profile");}
 @Test void currentAccessCannotBeDowngradedByAnAdministratorOutsideItsExistingCeiling(){var a=company();long admin=person(),am=membership(a.companyId(),admin,"admin"),target=person(),tm=membership(a.companyId(),target,"admin");new ConfigCenterTabPermissionAccess(db).replaceUserTabPermissions(tm,List.of("config_center.profile","config_center.business-structure"),List.of("config_center"));assertThatThrownBy(()->users.updateUser(a.companyId(),admin,"admin",target,payload("user",null,null))).isInstanceOf(IllegalArgumentException.class);assertThat(role(tm)).isEqualTo("admin");}
 @Test void lastAdministratorCannotBeDemotedAndUnchangedRootIsPreserved(){var a=company();long m=db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,a.companyId(),a.userId());assertThatThrownBy(()->users.updateUser(a.companyId(),a.userId(),a.role(),a.userId(),payload("user",null,null))).isInstanceOf(UserAccessException.class);users.updateUser(a.companyId(),a.userId(),a.role(),a.userId(),payload("root",null,null));assertThat(role(m)).isEqualTo("root");}
 @Test void simultaneousDemotionsLeaveOneAdministrator() throws Exception {var a=company();long other=person();membership(a.companyId(),other,"root");var pool=Executors.newFixedThreadPool(2);try{var gate=new CountDownLatch(1);var first=pool.submit(()->demote(a.companyId(),a.userId(),gate));var second=pool.submit(()->demote(a.companyId(),other,gate));gate.countDown();assertThat(List.of(first.get(10,TimeUnit.SECONDS),second.get(10,TimeUnit.SECONDS))).containsExactlyInAnyOrder(true,false);assertThat(db.queryForObject("SELECT COUNT(*) FROM user_companies WHERE company_id=? AND role IN ('root','superadmin','admin') AND status='active'",Integer.class,a.companyId())).isEqualTo(1);}finally{pool.shutdownNow();}}
 boolean demote(long company,long actor,CountDownLatch gate){try{gate.await();users.updateUser(company,actor,"root",actor,payload("user",null,null));return true;}catch(Exception error){return false;}}
 @Test void inviteAcceptAndReloadKeepPermissionsAndExactPassword(){var a=company();String email=UUID.randomUUID()+"@example.invalid";var created=invitations.invite(a.companyId(),a.userId(),a.role(),invite(email));String token=(String)created.get("token");var accepted=invitations.accept(token,Map.of("password"," new synthetic password ","confirm_password"," new synthetic password "));long user=((Number)accepted.get("user_id")).longValue();String hash=db.queryForObject("SELECT password_hash FROM users WHERE id=?",String.class,user);assertThat(new BCryptPasswordEncoder().matches(" new synthetic password ",hash)).isTrue();assertThat(new ConfigCenterTabPermissionAccess(db).listUserTabPermissionKeys(((Number)accepted.get("user_company_id")).longValue())).containsExactly("config_center.profile");assertThatThrownBy(()->invitations.accept(token,Map.of("password","new","confirm_password","new"))).isInstanceOf(IllegalArgumentException.class);}
 @Test void cancelledAndExpiredLinksCannotGrantAccessAndResendInvalidatesOldLink(){var a=company();var first=invitations.invite(a.companyId(),a.userId(),a.role(),invite(UUID.randomUUID()+"@example.invalid"));long id=((Number)first.get("invitation_id")).longValue();String old=(String)first.get("token");invitations.delete(a.companyId(),a.userId(),a.role(),id);assertThatThrownBy(()->invitations.accept(old,Map.of("password","new synthetic password","confirm_password","new synthetic password"))).isInstanceOf(IllegalArgumentException.class);assertThat(db.queryForObject("SELECT status FROM user_invitations WHERE id=?",String.class,id)).isEqualTo("cancelled");
  var next=invitations.invite(a.companyId(),a.userId(),a.role(),invite(UUID.randomUUID()+"@example.invalid"));id=((Number)next.get("invitation_id")).longValue();String expired=(String)next.get("token");db.update("UPDATE user_invitations SET expires_at=DATE_SUB(NOW(),INTERVAL 1 DAY) WHERE id=?",id);assertThatThrownBy(()->invitations.accept(expired,Map.of("password","new synthetic password","confirm_password","new synthetic password"))).isInstanceOf(IllegalArgumentException.class);var renewed=invitations.resend(a.companyId(),a.userId(),a.role(),id,Map.of());assertThat(renewed.get("token")).isNotEqualTo(expired);assertThatThrownBy(()->users.getInvitation(expired)).isInstanceOf(NoSuchElementException.class);
 }
 @Test void invalidEmailAndCrossCompanyScopeDoNotCreateInvitations(){var a=company();var other=company();long unit=unit(other.companyId());var bad=invite("invalid-email");assertThatThrownBy(()->invitations.invite(a.companyId(),a.userId(),a.role(),bad)).isInstanceOf(UserAccessException.class);var outside=invite(UUID.randomUUID()+"@example.invalid");outside.put("unit_id",unit);assertThatThrownBy(()->invitations.invite(a.companyId(),a.userId(),a.role(),outside)).isInstanceOf(IllegalArgumentException.class);assertThat(db.queryForObject("SELECT COUNT(*) FROM user_invitations WHERE company_id=?",Integer.class,a.companyId())).isZero();}
 @Test void deactivationKeepsHistoryAndCanBeSafelyRepeated(){var a=company();long target=person(),m=membership(a.companyId(),target,"user");users.deleteUser(a.companyId(),a.userId(),a.role(),target);users.deleteUser(a.companyId(),a.userId(),a.role(),target);assertThat(db.queryForObject("SELECT status FROM user_companies WHERE id=?",String.class,m)).isEqualTo("inactive");assertThat(db.queryForObject("SELECT COUNT(*) FROM users WHERE id=?",Integer.class,target)).isEqualTo(1);users.activateUser(a.companyId(),a.userId(),a.role(),target);assertThat(db.queryForObject("SELECT status FROM user_companies WHERE id=?",String.class,m)).isEqualTo("active");}
 @Test void existingGlobalAccountJoinsWithoutChangingItsNameOrPassword(){
  var a=company();long existing=person();String email=db.queryForObject("SELECT email FROM users WHERE id=?",String.class,existing);
  var created=invitations.invite(a.companyId(),a.userId(),a.role(),invite(email));
  var accepted=invitations.accept((String)created.get("token"),Map.of("password"," exact synthetic secret ","confirm_password"," exact synthetic secret "));
  assertThat(((Number)accepted.get("user_id")).longValue()).isEqualTo(existing);
  assertThat(db.queryForObject("SELECT full_name FROM users WHERE id=?",String.class,existing)).isEqualTo("Synthetic User");
  assertThat(db.queryForObject("SELECT COUNT(*) FROM user_companies WHERE company_id=? AND user_id=?",Integer.class,a.companyId(),existing)).isEqualTo(1);
 }
 @Test void simultaneousInvitationsForTheSameEmailCreateOnePendingRecord() throws Exception {
  var a=company();String email=UUID.randomUUID()+"@example.invalid";var gate=new CountDownLatch(1);var pool=Executors.newFixedThreadPool(2);
  try {
   var first=pool.submit(()->inviteOnce(a,email,gate));var second=pool.submit(()->inviteOnce(a,email,gate));gate.countDown();
   assertThat(List.of(first.get(10,TimeUnit.SECONDS),second.get(10,TimeUnit.SECONDS))).containsExactlyInAnyOrder(true,false);
   assertThat(db.queryForObject("SELECT COUNT(*) FROM user_invitations WHERE company_id=? AND email=? AND status='pending'",Integer.class,a.companyId(),email)).isEqualTo(1);
  } finally {pool.shutdownNow();}
 }
 boolean inviteOnce(AuthSessionUser actor,String email,CountDownLatch gate){try{gate.await();invitations.invite(actor.companyId(),actor.userId(),actor.role(),invite(email));return true;}catch(Exception error){return false;}}

 // These cases use only the isolated database and roll back their catalogue fixtures.
 String module(boolean enabled,String lifecycle,boolean active){
  String slug="test_access_"+UUID.randomUUID().toString().substring(0,8);
  db.update("INSERT INTO modules(slug,name,is_active,assignment_enabled,lifecycle_status,module_category,access_model) VALUES (?,'Synthetic access module',?,?,?,'complementary','module')",slug,active,enabled,lifecycle);
  return slug;
 }
 void grant(long membership,String slug){db.update("INSERT INTO user_company_module_roles(user_company_id,module_slug,role,skill_level) VALUES (?,?,'viewer',0)",membership,slug);}
 @SuppressWarnings("unchecked") List<Map<String,Object>> moduleCatalog(AuthSessionUser actor){return (List<Map<String,Object>>)((Map<String,Object>)users.getUsers(actor).get("catalog")).get("modules");}
 Map<String,Object> modulePayload(String slug){var p=payload("user",null,null);p.put("module_slugs",List.of(slug));p.put("tab_permission_keys",List.of());return p;}
 @Test @Transactional void existingUnavailableAssignmentsSurviveButNewAssignmentsFailForRootAndAdmin(){
  for(String actorRole:List.of("root","admin")){
   var owner=company();long actor=person(),actorMembership=membership(owner.companyId(),actor,actorRole);
   String slug=module(false,"retired",false);grant(actorMembership,slug);
   long target=person(),targetMembership=membership(owner.companyId(),target,"user");grant(targetMembership,slug);
   users.updateUser(owner.companyId(),actor,actorRole,target,modulePayload(slug));
   assertThat(db.queryForList("SELECT module_slug FROM user_company_module_roles WHERE user_company_id=?",String.class,targetMembership)).containsExactly(slug);
   assertThatThrownBy(()->users.updateUser(owner.companyId(),actor,actorRole,personWithMembership(owner.companyId()),modulePayload(slug)))
    .isInstanceOfSatisfying(UserAccessException.class,e->assertThat(e.code()).isEqualTo("user_module_not_enabled"));
  }
 }
 long personWithMembership(long company){long id=person();membership(company,id,"user");return id;}
 @Test @Transactional void companyWithNoEntitlementsCanPreserveExistingButCannotInviteOrAdd(){
  var a=company();db.update("DELETE FROM company_module_entitlements WHERE company_id=?",a.companyId());
  long target=personWithMembership(a.companyId());users.updateUser(a.companyId(),a.userId(),a.role(),target,payload("user",null,null));
  assertThat(moduleCatalog(a)).allSatisfy(row->assertThat(row.get("company_enabled")).isEqualTo(false));
  assertThatThrownBy(()->users.inviteUser(a.companyId(),a.userId(),a.role(),invite(UUID.randomUUID()+"@example.invalid")))
   .isInstanceOfSatisfying(UserAccessException.class,e->assertThat(e.code()).isEqualTo("user_module_not_enabled"));
  var empty=payload("user",null,null);empty.put("module_slugs",List.of());
  assertThatThrownBy(()->users.updateUser(a.companyId(),a.userId(),a.role(),target,empty))
   .isInstanceOfSatisfying(UserAccessException.class,e->assertThat(e.code()).isEqualTo("user_modules_required"));
 }
 @Test @Transactional void catalogueAndWriteEligibilityAgreeAndStatesAreIndependent(){
  var a=company();long target=personWithMembership(a.companyId());
  for(String lifecycle:List.of("released","pilot","planned","development","retired")){
   String slug=module(true,lifecycle,true);
   db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES (?,?,'active','test')",a.companyId(),slug);
   var row=moduleCatalog(a).stream().filter(m->m.get("slug").equals(slug)).findFirst().orElseThrow();
   boolean assignable=List.of("released","pilot").contains(lifecycle);
   assertThat(row).containsEntry("entitled",true).containsEntry("actor_assignable",true).containsEntry("company_enabled",assignable).containsEntry("assignable",assignable);
   if(assignable)users.updateUser(a.companyId(),a.userId(),a.role(),target,modulePayload(slug));
   else assertThatThrownBy(()->users.updateUser(a.companyId(),a.userId(),a.role(),target,modulePayload(slug)))
    .isInstanceOfSatisfying(UserAccessException.class,e->assertThat(e.code()).isEqualTo("user_module_not_assignable"));
  }
 }
 @Test @Transactional void activeCompanyMembershipRoleOverridesGlobalRootAndAdminCannotDelegateNewModules(){
  var owner=company();long admin=person();membership(owner.companyId(),admin,"admin");
  String slug=module(true,"released",true);db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES (?,?,'active','test')",owner.companyId(),slug);
  var actor=new AuthSessionUser(admin,owner.companyId(),"Synthetic Admin","root");
  assertThat(users.getUsers(actor)).containsEntry("actor_role","admin");
  assertThat(moduleCatalog(actor)).noneMatch(row->row.get("slug").equals(slug)); // Not in the actor's authorized catalogue.
  long target=personWithMembership(owner.companyId());
  assertThatThrownBy(()->users.updateUser(owner.companyId(),admin,"root",target,modulePayload(slug)))
   .isInstanceOfSatisfying(UserAccessException.class,e->assertThat(e.code()).isEqualTo("user_module_not_assignable"));
  long ordinary=person();membership(owner.companyId(),ordinary,"user");
  var distributor=new AuthSessionUser(ordinary,owner.companyId(),"Synthetic Distributor","root");
  assertThat(users.getUsers(distributor)).containsEntry("actor_role","user");
  assertThat(moduleCatalog(distributor)).isEmpty();
  assertThatThrownBy(()->users.updateUser(owner.companyId(),ordinary,"root",target,payload("user",null,null))).isInstanceOf(IllegalArgumentException.class);
 }
 @Test @Transactional void foreignCompanyCannotSupplyTheActorTargetOrEntitlement(){
  var a=company();var other=company();long foreignTarget=personWithMembership(other.companyId());
  assertThatThrownBy(()->users.updateUser(a.companyId(),a.userId(),a.role(),foreignTarget,payload("user",null,null))).isInstanceOf(NoSuchElementException.class);
  String slug=module(true,"released",true);db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES (?,?,'active','test')",other.companyId(),slug);
  assertThatThrownBy(()->users.updateUser(a.companyId(),a.userId(),a.role(),personWithMembership(a.companyId()),modulePayload(slug)))
   .isInstanceOfSatisfying(UserAccessException.class,e->assertThat(e.code()).isEqualTo("user_module_not_enabled"));
 }
 @Test @Transactional void tabFailuresHaveTheirOwnCodesAndDoNotChangeStoredAccess(){
  var a=company();long target=personWithMembership(a.companyId());var tabs=payload("user",null,null);
  for(var entry:Map.of("unknown.tab","user_tab_permission_unknown","human_resources.payroll","user_tab_permission_module","config_center.users","user_tab_permission_role").entrySet()){
   tabs.put("tab_permission_keys",List.of(entry.getKey()));
   assertThatThrownBy(()->users.updateUser(a.companyId(),a.userId(),a.role(),target,tabs))
    .isInstanceOfSatisfying(UserAccessException.class,e->assertThat(e.code()).isEqualTo(entry.getValue()));
   long targetMembership=db.queryForObject("SELECT id FROM user_companies WHERE company_id=? AND user_id=?",Long.class,a.companyId(),target);
   assertThat(new ConfigCenterTabPermissionAccess(db).listUserTabPermissionKeys(targetMembership)).containsExactly("config_center.profile");
  }
 }

 @Test @Transactional void explicitlyAuthorizedDelegatedWorkspaceKeepsItsExistingSessionContract(){
  var actor=company();var managed=company();
  var trustedWorkspaceIdentity=new AuthSessionUser(actor.userId(),managed.companyId(),null,"Synthetic delegated actor","superadmin");
  assertThat(users.getUsers(trustedWorkspaceIdentity)).containsEntry("company_id",managed.companyId()).containsEntry("actor_role","superadmin");
  assertThat(db.queryForObject("SELECT COUNT(*) FROM user_companies WHERE company_id=? AND user_id=?",Integer.class,managed.companyId(),actor.userId())).isZero();
 }
 @Test @Transactional void assignmentSwitchAndInactiveEntitlementsStillRejectNewRootGrants(){
  var actor=company();long target=personWithMembership(actor.companyId());String slug=module(false,"released",true);
  assertThatThrownBy(()->users.updateUser(actor.companyId(),actor.userId(),actor.role(),target,modulePayload("unknown_access_module")))
   .isInstanceOfSatisfying(UserAccessException.class,e->assertThat(e.code()).isEqualTo("user_module_unknown"));
  db.update("INSERT INTO company_module_entitlements(company_id,module_slug,status,source) VALUES (?,?,'active','test')",actor.companyId(),slug);
  assertThatThrownBy(()->users.updateUser(actor.companyId(),actor.userId(),actor.role(),target,modulePayload(slug)))
   .isInstanceOfSatisfying(UserAccessException.class,e->assertThat(e.code()).isEqualTo("user_module_not_assignable"));
  db.update("UPDATE modules SET assignment_enabled=1 WHERE slug=?",slug);
  db.update("UPDATE company_module_entitlements SET status='suspended' WHERE company_id=? AND module_slug=?",actor.companyId(),slug);
  assertThatThrownBy(()->users.updateUser(actor.companyId(),actor.userId(),actor.role(),target,modulePayload(slug)))
   .isInstanceOfSatisfying(UserAccessException.class,e->assertThat(e.code()).isEqualTo("user_module_not_enabled"));
 }

}
