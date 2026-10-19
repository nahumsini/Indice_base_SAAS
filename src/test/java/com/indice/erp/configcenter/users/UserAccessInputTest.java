package com.indice.erp.configcenter.users;
import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
class UserAccessInputTest {
 Map<String,Object> access(){var value=new LinkedHashMap<String,Object>(Map.of("role","user","module_slugs",List.of("config_center")));value.put("unit_id",null);value.put("business_id",null);return value;}
 @Test void explicitNullScopeRemainsValidButMalformedScopeCannotBecomeCompanyWide(){
  var input=access();UserAccessInput.access(input);
  for(Object invalid:List.of("invalid",-1,0,1.5,"1.5")){input.put("unit_id",invalid);assertThatThrownBy(()->UserAccessInput.access(input)).isInstanceOf(UserAccessException.class);}
 }
 @Test void namesEmailsRolesAndModulesAreValidatedBeforePersistence(){
  var input=access();input.put("name","Synthetic User");input.put("email","synthetic@example.invalid");UserAccessInput.invitation(input);
  input.put("name","x".repeat(101));assertThatThrownBy(()->UserAccessInput.invitation(input)).isInstanceOf(UserAccessException.class);
  input.put("name","Synthetic User");input.put("email","not an email");assertThatThrownBy(()->UserAccessInput.invitation(input)).isInstanceOf(UserAccessException.class);
  input.put("role","unknown");assertThatThrownBy(()->UserAccessInput.access(input)).isInstanceOf(UserAccessException.class);
  input.put("role","user");input.put("module_slugs",List.of());assertThatThrownBy(()->UserAccessInput.access(input)).isInstanceOf(UserAccessException.class);
 }
 @Test void administratorsCannotReplaceAnOutOfScopeUsersAccessWithTheirOwnSubset(){
  var guard=new ConfigCenterUserMutationGuard();
  var actor=new ConfigCenterUserMutationGuard.ActorAccess(1,1,"admin",List.of("config_center"),List.of("config_center.users"),new ConfigCenterUserMutationGuard.AccessScope(1L,null));
  var target=new ConfigCenterUserMutationGuard.TargetUser(2,2,"admin");
  assertThatThrownBy(()->guard.validateExistingAccess(actor,target,List.of("config_center","expenses"),List.of("config_center.users"),new ConfigCenterUserMutationGuard.AccessScope(1L,null))).isInstanceOf(IllegalArgumentException.class);
  assertThatThrownBy(()->guard.validateExistingAccess(actor,target,List.of("config_center"),List.of("config_center.users"),new ConfigCenterUserMutationGuard.AccessScope(2L,null))).isInstanceOf(IllegalArgumentException.class);
 }
}
