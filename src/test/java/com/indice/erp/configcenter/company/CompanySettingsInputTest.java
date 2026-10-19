package com.indice.erp.configcenter.company;
import static org.assertj.core.api.Assertions.*;
import java.util.*;
import org.junit.jupiter.api.Test;
class CompanySettingsInputTest {
 @Test void blankAndOversizedNamesCannotReachPersistence() {
   assertThatThrownBy(()->CompanySettingsInput.company(Map.of("nombre_empresa","  "))).isInstanceOf(CompanySettingsException.class);
   assertThatThrownBy(()->CompanySettingsInput.company(Map.of("nombre_empresa","a".repeat(121)))).isInstanceOf(CompanySettingsException.class);
   CompanySettingsInput.company(Map.of("nombre_empresa","a".repeat(120)));
   CompanySettingsInput.company(Map.of("descripcion",""));
 }
 @Test void invalidAndOversizedLogosAreRejectedAndExistingUrlsRemainCompatible() {
   for(var value:List.of("javascript:alert(1)","data:text/html;base64,PHNjcmlwdD4=","data:image/png;base64,invalid!","data:image/png;base64,"+Base64.getEncoder().encodeToString(new byte[1024*1024+1]),"data:image/svg+xml;base64,"+Base64.getEncoder().encodeToString("<svg onload='alert(1)'/>".getBytes())))
     assertThatThrownBy(()->CompanySettingsInput.logo(value)).isInstanceOf(CompanySettingsException.class);
   CompanySettingsInput.logo("");CompanySettingsInput.logo("https://example.invalid/logo.png");CompanySettingsInput.logo("/assets/logo.png");
 }
 @Test void contactAndAddressValidationPrecedesOrganizationChanges() {
   assertThatThrownBy(()->CompanySettingsInput.contact(Map.of("name","Synthetic","email","bad address"))).isInstanceOf(CompanySettingsException.class);
   assertThatThrownBy(()->CompanySettingsInput.company(Map.of("address",Map.of("street","x".repeat(256))))).isInstanceOf(CompanySettingsException.class);
   CompanySettingsInput.contact(Map.of("name","Synthetic","email","synthetic@example.invalid"));
 }
}
