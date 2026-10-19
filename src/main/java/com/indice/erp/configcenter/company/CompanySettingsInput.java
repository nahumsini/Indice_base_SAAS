package com.indice.erp.configcenter.company;

import java.util.Base64;
import java.util.Locale;
import java.util.Map;

/** Validation for existing company/organization fields; business ownership remains in Config Center. */
public final class CompanySettingsInput {
    private CompanySettingsInput() {}
    public static void company(Map<String,Object> input) {
        if (input.containsKey("nombre_empresa")) name(text(input.get("nombre_empresa")),120);
        if (input.get("address") != null && !(input.get("address") instanceof Map<?,?>) && !(input.get("address") instanceof String)) throw error("company_invalid_address","Enter a valid address.");
        if (input.get("address") instanceof Map<?,?> address && text(address.get("street")).length()>255) throw error("company_address_too_long","The address is too long.");
        for (String key : new String[]{"logo_url","logoUrl","logo"}) if (input.containsKey(key)) logo(text(input.get(key)));
        for (String key : new String[]{"descripcion","industria","modelo_negocio","tamano_empresa"})
            if (text(input.get(key)).length()>10000) throw error("company_text_too_long","Shorten this field before saving.");
    }
    public static void name(String value,int max) {
        if (value.isBlank()) throw error("company_name_required","Enter a name before saving.");
        if (value.codePointCount(0,value.length())>max) throw error("company_name_too_long","The name is too long.");
    }
    public static void contact(Map<?,?> input) {
        name(text(input.containsKey("name")?input.get("name"):input.get("nombre")),160);
        if (text(input.get("direccion")).length()>255) throw error("company_address_too_long","The address is too long.");
        var email=text(input.get("email"));
        if (!email.isBlank() && (email.length()>254 || !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+")))
            throw error("company_invalid_email","Enter a valid email address.");
        logo(text(input.get("logo")));
    }
    public static void logo(String value) {
        if (value.isBlank()) return;
        if (!value.startsWith("data:")) {
            if (value.length()>2048 || !(value.startsWith("https://")||value.startsWith("http://")||value.startsWith("/")))
                throw error("company_invalid_logo","Choose a valid image.");
            return;
        }
        if (value.length()>1400000) throw error("company_logo_size","Use a logo of 1MB or less.");
        int comma=value.indexOf(',');
        if (comma<0) throw error("company_invalid_logo","Choose a valid image.");
        String header=value.substring(0,comma).toLowerCase(Locale.ROOT);
        if (!java.util.Set.of("data:image/jpeg;base64","data:image/png;base64","data:image/webp;base64","data:image/svg+xml;base64").contains(header))
            throw error("company_invalid_logo","Use a JPG, PNG, WebP or SVG image.");
        try {
            byte[] decoded=Base64.getDecoder().decode(value.substring(comma+1));
            if(decoded.length==0 || decoded.length>1024*1024)throw error("company_logo_size","Use a logo of 1MB or less.");
            if (header.contains("svg+xml")) {
                String svg=new String(decoded,java.nio.charset.StandardCharsets.UTF_8).toLowerCase(Locale.ROOT);
                if (!svg.contains("<svg") || svg.matches("(?s).*(<script|<!doctype|<!entity|<foreignobject|\\son[a-z]+\\s*=|(?:href|src)\\s*=).*"))
                    throw error("company_invalid_logo","Use a simple SVG image or a JPG, PNG or WebP image.");
            }
        } catch (IllegalArgumentException ex) {
            if(ex instanceof CompanySettingsException own)throw own;
            throw error("company_invalid_logo","Choose a valid image.");
        }
    }
    public static CompanySettingsException error(String code,String message){return new CompanySettingsException(code,message);}
    public static String text(Object value){return value instanceof String text?text.trim():"";}
}
