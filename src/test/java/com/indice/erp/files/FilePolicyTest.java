package com.indice.erp.files;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class FilePolicyTest {
 @Test void activeAndUnknownFormatsAreOnlyOpaqueAttachments(){assertThat(FilePolicy.contentType("example.svg")).isEqualTo("application/octet-stream");assertThat(FilePolicy.inline(FilePolicy.contentType("example.svg"))).isFalse();assertThat(FilePolicy.inline(FilePolicy.contentType("example.html"))).isFalse();assertThat(FilePolicy.inline(FilePolicy.contentType("example.pdf"))).isFalse();}
 @Test void verifiedMediaAndTextHaveBoundedPassivePreviews(){FilePolicy.validate("video/mp4",new byte[]{0,0,0,20,102,116,121,112});FilePolicy.validate("text/plain","Hola mundo".getBytes(java.nio.charset.StandardCharsets.UTF_8));assertThatThrownBy(()->FilePolicy.validate("image/png","wrong".getBytes())).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);assertThatThrownBy(()->FilePolicy.validate("text/plain",new byte[]{0,1,2})).isInstanceOf(org.springframework.web.server.ResponseStatusException.class);}
}
