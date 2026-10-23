package com.indice.erp.sales.conversations;

import static org.assertj.core.api.Assertions.*;
import com.indice.erp.sales.conversations.whatsapp.*;
import java.io.ByteArrayOutputStream;
import java.util.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionJavaScript;
import org.junit.jupiter.api.Test;

class WhatsAppSafetyRulesTest {
    @Test void rotatingKeysCanReadOldCiphertextButWrongTenantPurposeOrRetiredKeyCannot(){
        String k1=Base64.getEncoder().encodeToString(new byte[32]);byte[] bytes=new byte[32];Arrays.fill(bytes,(byte)2);String k2=Base64.getEncoder().encodeToString(bytes);
        var old=new WhatsAppCredentialCodec(k1,"k1","","");var rotated=new WhatsAppCredentialCodec(k2,"k2","k1:"+k1,"");byte[] token="synthetic-secret".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        String cipher=old.encrypt(1,"one","token",token);assertThat(rotated.decrypt(1,"one","token",cipher)).isEqualTo(token);
        String replacement=rotated.reencrypt(1,"one","token",cipher);assertThat(replacement).startsWith("k2.");assertThat(rotated.decrypt(1,"one","token",replacement)).isEqualTo(token);
        assertThatThrownBy(()->rotated.decrypt(2,"one","token",cipher)).isInstanceOf(IllegalStateException.class);assertThatThrownBy(()->rotated.decrypt(1,"one","inbox",cipher)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->new WhatsAppCredentialCodec(k2,"k2","","").decrypt(1,"one","token",cipher)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(()->new WhatsAppCredentialCodec(k1,"k1","",k1)).isInstanceOf(IllegalStateException.class).hasMessage("Invalid WhatsApp protection configuration");
        assertThat(old.encrypt(1,"one","token",token)).isNotEqualTo(cipher);
    }
    @Test void mediaUrlsRejectSsrfsRedirectTargetsCredentialsAndHostSuffixTricks(){
        for(String url:List.of("http://lookaside.fbsbx.com/x","https://lookaside.fbsbx.com.evil.test/x","https://127.0.0.1/x","https://lookaside.fbsbx.com:444/x","https://user:pass@lookaside.fbsbx.com/x","https://lookaside.fbsbx.com/x#secret","file:///etc/hosts"))assertThatThrownBy(()->WhatsAppMediaClient.validatedUrl(url)).isInstanceOf(IllegalArgumentException.class);
        assertThat(WhatsAppMediaClient.validatedUrl("https://lookaside.fbsbx.com/private?opaque=synthetic").getHost()).isEqualTo("lookaside.fbsbx.com");
        byte[] bytes={1,2,3};WhatsAppMediaClient.verifyHash(SalesConversationService.hash(bytes),bytes);assertThatThrownBy(()->WhatsAppMediaClient.verifyHash("",bytes)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void rejectsExecutablePdfAndMismatchedMimeWhileAcceptingBoundedPlainPdf()throws Exception{
        try(var pdf=new PDDocument()){pdf.addPage(new PDPage());var output=new ByteArrayOutputStream();pdf.save(output);SalesConversationFilePolicy.verify("plain.pdf","application/pdf",output.toByteArray());
            pdf.getDocumentCatalog().setOpenAction(new PDActionJavaScript("app.alert('synthetic');"));output.reset();pdf.save(output);byte[] active=output.toByteArray();assertThatThrownBy(()->SalesConversationFilePolicy.verify("active.pdf","application/pdf",active)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
            assertThatThrownBy(()->SalesConversationFilePolicy.verify("fake.png","image/png",active)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
        }
        assertThatThrownBy(()->SalesConversationFilePolicy.metadata("../escape.png","image/png",100)).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
}
