package com.indice.erp.messaging;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import java.io.ByteArrayOutputStream;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

class MessagingFileRulesTest {
    @Test void acceptsOnlyApprovedExtensionAndMimePairs() {
        assertThat(MessagingFileRules.accepts("REPORT.PDF","application/pdf")).isTrue();
        assertThat(MessagingFileRules.accepts("report.docx",MessagingFileRules.TYPES.get("docx"))).isTrue();
        assertThat(MessagingFileRules.accepts("script.html","application/pdf")).isFalse();
        assertThat(MessagingFileRules.accepts("photo.heic","image/heic")).isFalse();
        assertThat(MessagingFileRules.accepts("photo.png","image/jpeg")).isFalse();
    }
    @Test void verifiesPdfAndRejectsDisguisedHtml() {
        assertThat(MessagingFileRules.matches("application/pdf","%PDF-1.7".getBytes())).isTrue();
        assertThat(MessagingFileRules.matches("application/pdf","<html>unsafe</html>".getBytes())).isFalse();
    }
    @Test void officeNeedsTheExpectedContainerAndRejectsMacros() throws Exception {
        var word=zip("[Content_Types].xml","word/document.xml");
        assertThat(MessagingFileRules.matches(MessagingFileRules.TYPES.get("docx"),word)).isTrue();
        assertThat(MessagingFileRules.matches(MessagingFileRules.TYPES.get("xlsx"),word)).isFalse();
        assertThat(MessagingFileRules.matches(MessagingFileRules.TYPES.get("xlsx"),zip("[Content_Types].xml","xl/workbook.xml"))).isTrue();
        assertThat(MessagingFileRules.matches(MessagingFileRules.TYPES.get("docx"),zip("[Content_Types].xml","word/document.xml","word/vbaProject.bin"))).isFalse();
        assertThat(MessagingFileRules.matches(MessagingFileRules.TYPES.get("docx"),zip("random.txt"))).isFalse();
    }
    private byte[] zip(String... names) throws Exception {
        var bytes=new ByteArrayOutputStream();
        try(var zip=new ZipOutputStream(bytes)) { for(var name:names) { zip.putNextEntry(new ZipEntry(name)); zip.write("<test/>".getBytes()); zip.closeEntry(); } }
        return bytes.toByteArray();
    }
}
