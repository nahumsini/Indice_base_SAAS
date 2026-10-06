package com.indice.erp.ai.files;
import static org.assertj.core.api.Assertions.*;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import static com.indice.erp.ai.files.AiFileContracts.*;
class AiFileValidationTest {
    @Test void rejectsForgedMimeAuthorityPathsAndOversizedImagesAndRedactsBinaryLogs() {
        var data=Base64.getEncoder().encodeToString("<script>private</script>".getBytes());
        var request=new StageRequest(Purpose.asset_photo,1L,null,"photo.png","image/png",data,"synthetic-key");
        assertThatThrownBy(()->AiFileValidation.decode(request)).isInstanceOf(IllegalArgumentException.class);
        assertThat(request.toString()).doesNotContain(data,"synthetic-key");
        assertThatThrownBy(()->AiFileValidation.fileName("../photo.png")).isInstanceOf(IllegalArgumentException.class);
        byte[] huge=new byte[2621441];assertThatThrownBy(()->AiFileValidation.decode(new StageRequest(Purpose.asset_photo,1L,null,"photo.png","image/png",Base64.getEncoder().encodeToString(huge),"synthetic-key"))).isInstanceOf(IllegalArgumentException.class);
        assertThat(new FileContent("indice://file","private.pdf","application/pdf",3,"hash",data).toString()).doesNotContain(data);
    }
    @Test void documentTypesAreClosedAndOfficeZipExpansionIsBounded() throws Exception {
        for(String type:java.util.Arrays.asList(null,"government_id","birth_certificate")) {
            assertThatThrownBy(()->AiFileValidation.decode(new StageRequest(Purpose.employee_document,1L,type,"file.pdf","application/pdf",Base64.getEncoder().encodeToString("%PDF-1.4".getBytes()),"synthetic-key"))).isInstanceOf(IllegalArgumentException.class);
        }
        assertThatThrownBy(()->AiFileValidation.decode(new StageRequest(Purpose.employee_document,1L,"bank_account","file.pdf","application/pdf",Base64.getEncoder().encodeToString("%PDF-1.4".getBytes()),"synthetic-key"))).isInstanceOf(IllegalArgumentException.class);
        var buffer=new java.io.ByteArrayOutputStream();try(var zip=new java.util.zip.ZipOutputStream(buffer)){for(var name:java.util.List.of("[Content_Types].xml","word/document.xml")){zip.putNextEntry(new java.util.zip.ZipEntry(name));zip.write("<document/>".getBytes());zip.closeEntry();}}
        AiFileValidation.validateMime("application/vnd.openxmlformats-officedocument.wordprocessingml.document",buffer.toByteArray());
        assertThatThrownBy(()->AiFileValidation.validateMime("application/vnd.openxmlformats-officedocument.wordprocessingml.document",new byte[]{80,75,3,4})).isInstanceOf(IllegalArgumentException.class);
    }
}
