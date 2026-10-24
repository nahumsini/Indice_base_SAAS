package com.indice.erp.email.mailbox;

import java.io.*;
import java.util.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.filespecification.*;
import org.apache.pdfbox.pdmodel.font.*;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionJavaScript;
import org.apache.pdfbox.pdmodel.interactive.annotation.PDAnnotationFileAttachment;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.pdfbox.text.PDFTextStripper;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class MailPdfPreparationTest {
    static byte[] fixture() throws IOException {
        try (var doc = new PDDocument(); var out = new ByteArrayOutputStream()) {
            var page = new PDPage(); doc.addPage(page);
            try (var content = new PDPageContentStream(doc, page)) {
                content.setNonStrokingColor(java.awt.Color.BLUE); content.addRect(40, 600, 220, 40); content.fill();
                content.beginText(); content.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 16);
                content.newLineAtOffset(40, 660); content.showText("Presentation with an embedded design source"); content.endText();
            }
            byte[] payload = new byte[450000]; new Random(17).nextBytes(payload);
            var file = new PDComplexFileSpecification(); file.setFile("design-source.bin"); file.setFileUnicode("design-source.bin");
            var embedded = new PDEmbeddedFile(doc, new ByteArrayInputStream(payload)); embedded.setSubtype("application/octet-stream");
            file.setEmbeddedFile(embedded); file.setEmbeddedFileUnicode(embedded);
            var tree = new PDEmbeddedFilesNameTreeNode(); tree.setNames(Map.of("design-source.bin", file));
            var names = new PDDocumentNameDictionary(doc.getDocumentCatalog()); names.setEmbeddedFiles(tree); doc.getDocumentCatalog().setNames(names);
            var associated = new COSArray(); associated.add(file.getCOSObject()); doc.getDocumentCatalog().getCOSObject().setItem(COSName.getPDFName("AF"), associated);
            doc.save(out); return out.toByteArray();
        }
    }

    @Test void selectingSamePdfPreparesPagesWithoutEmbeddedPayloadOrChangingOriginal() throws Exception {
        byte[] original = fixture(), snapshot = original.clone();
        assertThatThrownBy(() -> MailFilePolicy.bytes("presentation.pdf", "application/pdf", original)).hasMessageContaining("email_pdf_active");
        byte[] prepared = MailFilePolicy.prepare("presentation.pdf", "application/pdf", original);
        assertThat(original).isEqualTo(snapshot); assertThat(prepared.length).isLessThan(original.length);
        assertThatCode(() -> MailFilePolicy.bytes("presentation.pdf", "application/pdf", prepared)).doesNotThrowAnyException();
        try (var before = Loader.loadPDF(original); var after = Loader.loadPDF(prepared)) {
            assertThat(after.getNumberOfPages()).isEqualTo(before.getNumberOfPages());
            assertThat(new PDFTextStripper().getText(after)).isEqualTo(new PDFTextStripper().getText(before));
            var a = new PDFRenderer(before).renderImageWithDPI(0, 72); var b = new PDFRenderer(after).renderImageWithDPI(0, 72);
            assertThat(a.getRGB(0, 0, a.getWidth(), a.getHeight(), null, 0, a.getWidth()))
                .isEqualTo(b.getRGB(0, 0, b.getWidth(), b.getHeight(), null, 0, b.getWidth()));
            assertThat(after.getDocumentCatalog().getCOSObject().getDictionaryObject(COSName.getPDFName("AF"))).isNull();
            assertThat(after.getDocumentCatalog().getNames().getEmbeddedFiles()).isNull();
        }
        assertThat(MailFilePolicy.prepare("presentation.pdf", "application/pdf", prepared)).isSameAs(prepared);
    }

    @Test void removesAttachmentAnnotationsAndAssociatedFileReferences() throws Exception {
        byte[] original = fixture();
        try (var doc = Loader.loadPDF(original); var out = new ByteArrayOutputStream()) {
            var annotation = new PDAnnotationFileAttachment();
            annotation.setFile(doc.getDocumentCatalog().getNames().getEmbeddedFiles().getNames().values().iterator().next());
            doc.getPage(0).getAnnotations().add(annotation); doc.save(out);
            byte[] prepared = MailFilePolicy.prepare("presentation.pdf", "application/pdf", out.toByteArray());
            try (var after = Loader.loadPDF(prepared)) { assertThat(after.getPage(0).getAnnotations()).isEmpty(); }
            MailFilePolicy.bytes("presentation.pdf", "application/pdf", prepared);
        }
    }

    @Test void scriptsFormsAndPasswordsAreStillRejectedRatherThanSilentlyRemoved() throws Exception {
        for (String kind : List.of("script", "form", "password")) {
            try (var doc = Loader.loadPDF(fixture()); var out = new ByteArrayOutputStream()) {
                String reason;
                if (kind.equals("script")) { doc.getDocumentCatalog().setOpenAction(new PDActionJavaScript("app.alert('synthetic')")); reason = "email_pdf_active"; }
                else if (kind.equals("form")) { doc.getDocumentCatalog().setAcroForm(new org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm(doc)); reason = "email_pdf_form"; }
                else { doc.protect(new org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy("owner", "reader", new org.apache.pdfbox.pdmodel.encryption.AccessPermission())); reason = "email_pdf_password"; }
                doc.save(out);
                assertThatThrownBy(() -> MailFilePolicy.prepare("presentation.pdf", "application/pdf", out.toByteArray())).hasMessageContaining(reason);
            }
        }
    }

    @Test void ordinaryFilesKeepExactBytesAndExistingSizeAndContentLimits() throws Exception {
        byte[] text = "Synthetic brochure".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        assertThat(MailFilePolicy.prepare("brochure.txt", "text/plain", text)).isSameAs(text);
        assertThatThrownBy(() -> MailFilePolicy.prepare("large.pdf", "application/pdf", new byte[MailFilePolicy.MAX+1])).hasMessageContaining("email_attachment_blocked");
        assertThatThrownBy(() -> MailFilePolicy.prepare("broken.pdf", "application/pdf", "%PDF-invalid".getBytes())).hasMessageContaining("email_attachment_damaged");
        try (var doc = new PDDocument(); var out = new ByteArrayOutputStream()) {
            for (int i = 0; i < 201; i++) doc.addPage(new PDPage()); doc.save(out);
            assertThatThrownBy(() -> MailFilePolicy.prepare("long.pdf", "application/pdf", out.toByteArray())).hasMessageContaining("email_pdf_complex");
        }
    }
}
