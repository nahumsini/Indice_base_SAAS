package com.indice.erp.configcenter.users;
import java.util.*;
/** Validate existing access contracts before changing membership or consuming an invitation seat. */
public final class UserAccessInput {
    private UserAccessInput() {}
    public static void access(Map<String,Object> input) {
        if(input==null)throw error("user_access_invalid","User access is required.");
        String role=text(input.get("role")).toLowerCase(Locale.ROOT);
        if(!Set.of("root","superadmin","super admin","admin","owner","manager","user").contains(role))
            throw error("user_role_invalid","Choose a valid role.");
        for(String key:List.of("unit_id","unitId","business_id","businessId")) {
            Object value=input.get(key);if(value==null)continue;
            try { if(!String.valueOf(value).matches("[0-9]+")||Long.parseLong(String.valueOf(value))<=0)throw new NumberFormatException(); }
            catch(NumberFormatException e){throw error("user_scope_invalid","Choose a valid unit and business.");}
        }
        if(!(input.get("module_slugs") instanceof List<?> modules)||modules.isEmpty()||modules.stream().anyMatch(value->!(value instanceof String text)||text.isBlank()))
            throw error("user_modules_required","Choose at least one module.");
    }
    public static void invitation(Map<String,Object> input) {
        access(input);
        String name=List.of("name","full_name","nombre").stream().map(key->text(input.get(key))).filter(value->!value.isBlank()).findFirst().orElse("");
        if(name.isBlank())throw error("user_name_required","Enter a name.");
        if(name.codePointCount(0,name.length())>100)throw error("user_name_too_long","Names allow up to 100 characters.");
        email(text(input.get("email")));
    }
    public static void email(String email) {
        if(email.isBlank()||email.length()>120||!email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+"))
            throw error("user_email_invalid","Enter a valid email of up to 120 characters.");
    }
    public static String text(Object value){return value instanceof String text?text.trim():"";}
    public static UserAccessException error(String code,String message){return new UserAccessException(code,message);}
}
