package com.indice.erp.email.mailbox;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.zip.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class MailOfficePolicyTest {
    Map<String,byte[]> parts(String extension) {
        String main=switch(extension){case "docx"->"word/document.xml";case "xlsx"->"xl/workbook.xml";default->"ppt/presentation.xml";};
        String root=switch(extension){case "docx"->"document";case "xlsx"->"workbook";default->"presentation";};
        String ns=switch(extension){case "docx"->"wordprocessingml";case "xlsx"->"spreadsheetml";default->"presentationml";};
        var parts=new LinkedHashMap<String,byte[]>();
        parts.put("[Content_Types].xml",("<Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\"><Override PartName=\"/"+main+"\" ContentType=\""+MailOfficePolicy.TYPES.get(extension)+".main+xml\"/></Types>").getBytes(StandardCharsets.UTF_8));
        parts.put(main,("<"+root+" xmlns=\"http://schemas.openxmlformats.org/"+ns+"/2006/main\"/>").getBytes(StandardCharsets.UTF_8));return parts;
    }
    byte[] zip(Map<String,byte[]> parts)throws Exception {var bytes=new ByteArrayOutputStream();try(var out=new ZipOutputStream(bytes)){for(var entry:parts.entrySet()){out.putNextEntry(new ZipEntry(entry.getKey()));out.write(entry.getValue());out.closeEntry();}}return bytes.toByteArray();}
    @Test void ordinaryOfficePackagesAreAcceptedWithMatchingMime()throws Exception {
        for(String extension:List.of("docx","xlsx","pptx")){var bytes=zip(parts(extension));assertThatCode(()->MailFilePolicy.bytes("proposal."+extension,MailOfficePolicy.TYPES.get(extension),bytes)).doesNotThrowAnyException();}
    }
    @Test void renamedZipMismatchedDocumentAndMacrosAreRejected()throws Exception {
        assertThatThrownBy(()->MailFilePolicy.bytes("fake.docx",MailOfficePolicy.TYPES.get("docx"),new byte[]{80,75,3,4})).hasMessageContaining("email_attachment_blocked");
        var mismatch=zip(parts("xlsx"));assertThatThrownBy(()->MailFilePolicy.bytes("fake.docx",MailOfficePolicy.TYPES.get("docx"),mismatch)).hasMessageContaining("email_attachment_blocked");
        for(String path:List.of("word/vbaProject.bin","word/embeddings/embedded.docx","../outside.xml","xl/externalLinks/link.xml")){
            var input=parts("docx");input.put(path,"blocked".getBytes());var bytes=zip(input);assertThatThrownBy(()->MailFilePolicy.bytes("test.docx",MailOfficePolicy.TYPES.get("docx"),bytes)).hasMessageContaining("email_attachment_blocked");
        }
    }
    @Test void externalDataAndXmlEntitiesAreRejectedButHyperlinksAreAllowed()throws Exception {
        var input=parts("docx");String relationship="<Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\"><Relationship TargetMode=\"External\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/%s\" Target=\"https://example.com\"/></Relationships>";
        input.put("word/_rels/document.xml.rels",relationship.formatted("hyperlink").getBytes());var safe=zip(input);assertThatCode(()->MailOfficePolicy.validate("test.docx",safe)).doesNotThrowAnyException();
        input.put("word/_rels/document.xml.rels",relationship.formatted("image").getBytes());var external=zip(input);assertThatThrownBy(()->MailOfficePolicy.validate("test.docx",external)).isInstanceOf(Exception.class);
        input.remove("word/_rels/document.xml.rels");input.put("word/document.xml","<!DOCTYPE document [<!ENTITY x SYSTEM 'file:///never-read'>]><document>&x;</document>".getBytes());var xxe=zip(input);assertThatThrownBy(()->MailOfficePolicy.validate("test.docx",xxe)).isInstanceOf(Exception.class);
    }
    @Test void encodedWordFieldsAreCheckedWhileOrdinaryTextIsAllowed()throws Exception {
        var input=parts("docx");
        input.put("word/document.xml",("<?xml version=\"1.0\" encoding=\"UTF-16\"?><w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:instrText>DDEAUTO external command</w:instrText></w:document>").getBytes(StandardCharsets.UTF_16));
        var bytes=zip(input);assertThatThrownBy(()->MailOfficePolicy.validate("test.docx",bytes)).isInstanceOf(Exception.class);
        input.put("word/document.xml","<w:document xmlns:w=\"http://schemas.openxmlformats.org/wordprocessingml/2006/main\"><w:t>An article about DDE terminology.</w:t></w:document>".getBytes(StandardCharsets.UTF_8));
        var ordinary=zip(input);assertThatCode(()->MailOfficePolicy.validate("test.docx",ordinary)).doesNotThrowAnyException();
    }
    @Test void expandedSizeIsBoundedBeforeParsing()throws Exception {
        var input=parts("docx");input.put("word/large.xml",new byte[8*1024*1024+1]);var bytes=zip(input);assertThatThrownBy(()->MailOfficePolicy.validate("test.docx",bytes)).isInstanceOf(Exception.class);
    }
}
