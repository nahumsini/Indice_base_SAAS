package com.indice.erp.email.mailbox;

import java.io.*;
import java.util.*;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.*;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Keeps page content; embedded files are removed before any document becomes reusable. */
final class MailPdfPolicy {
    private static final Set<String> ACTIVE = Set.of("JS", "JavaScript", "AA", "XFA", "RichMediaContent",
        "RichMediaSettings", "AcroForm", "Launch", "SubmitForm", "ImportData", "GoToE", "Rendition");
    private static final Set<String> EMBEDDED = Set.of("EmbeddedFiles", "EF");
    private MailPdfPolicy() { }

    static void validate(byte[] bytes) throws IOException {
        signature(bytes);
        try (var doc = Loader.loadPDF(bytes)) { inspect(doc, false); }
    }

    static byte[] prepare(byte[] bytes) throws IOException {
        signature(bytes);
        try (var doc = Loader.loadPDF(bytes)) {
            // Never disguise scripts, actions, forms or password protection as a valid PDF.
            if (!inspect(doc, true)) return bytes;
            stripEmbedded(doc);
            inspect(doc, false);
            var out = new BoundedOutput();
            // Full save, not incremental: the original embedded payload is not appended.
            doc.save(out);
            byte[] prepared = out.bytes.toByteArray();
            validate(prepared);
            return prepared;
        }
    }

    private static void signature(byte[] bytes) {
        if (bytes.length < 5 || bytes[0] != '%' || bytes[1] != 'P' || bytes[2] != 'D' || bytes[3] != 'F' || bytes[4] != '-')
            throw denied("email_attachment_blocked");
    }

    private static boolean inspect(PDDocument doc, boolean permitEmbeddedForRemoval) {
        if (doc.isEncrypted()) throw denied("email_pdf_password");
        if (doc.getNumberOfPages() > 200) throw denied("email_pdf_complex");
        COSBase opening = doc.getDocumentCatalog().getCOSObject().getDictionaryObject(COSName.OPEN_ACTION);
        if (opening != null && !(opening instanceof COSArray) && !(opening instanceof COSString) && !(opening instanceof COSName))
            throw denied("email_pdf_active");
        var queue = new ArrayDeque<COSBase>();
        Set<COSBase> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        queue.add(doc.getDocumentCatalog().getCOSObject()); int count = 0; boolean embedded = false;
        while (!queue.isEmpty()) {
            var item = queue.removeFirst(); if (!seen.add(item)) continue;
            if (++count > 20000) throw denied("email_pdf_complex");
            if (item instanceof COSObject ref) { if (ref.getObject() != null) queue.add(ref.getObject()); }
            else if (item instanceof COSDictionary dictionary) {
                for (var key : dictionary.keySet()) {
                    if (ACTIVE.contains(key.getName())) throw denied(key.equals(COSName.ACRO_FORM) ? "email_pdf_form" : "email_pdf_active");
                    if (EMBEDDED.contains(key.getName())) {
                        if (!permitEmbeddedForRemoval) throw denied("email_pdf_active");
                        embedded = true;
                    }
                    var value = dictionary.getItem(key);
                    if (value != null) {
                        if (value instanceof COSName n && (ACTIVE.contains(n.getName()) || EMBEDDED.contains(n.getName())))
                            throw denied("email_pdf_active");
                        queue.add(value);
                    }
                }
            } else if (item instanceof COSArray array) for (var value : array) if (value != null) queue.add(value);
        }
        return embedded;
    }

    private static void stripEmbedded(PDDocument doc) throws IOException {
        for (var page : doc.getPages()) page.setAnnotations(new ArrayList<>(page.getAnnotations().stream()
            .filter(annotation -> !"FileAttachment".equals(annotation.getSubtype())).toList()));
        doc.getDocumentCatalog().getCOSObject().removeItem(COSName.getPDFName("Collection"));
        var queue = new ArrayDeque<COSBase>(); Set<COSBase> seen = Collections.newSetFromMap(new IdentityHashMap<>());
        queue.add(doc.getDocumentCatalog().getCOSObject());
        while (!queue.isEmpty()) {
            var item = queue.removeFirst(); if (!seen.add(item)) continue;
            if (item instanceof COSObject ref) { if (ref.getObject() != null) queue.add(ref.getObject()); }
            else if (item instanceof COSDictionary dictionary) {
                dictionary.removeItem(COSName.EF);
                dictionary.removeItem(COSName.getPDFName("EmbeddedFiles"));
                dictionary.removeItem(COSName.getPDFName("AF"));
                for (var key : dictionary.keySet()) { var value = dictionary.getItem(key); if (value != null) queue.add(value); }
            } else if (item instanceof COSArray array) for (var value : array) if (value != null) queue.add(value);
        }
    }

    private static ResponseStatusException denied(String code) { return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, code); }
    private static final class BoundedOutput extends OutputStream {
        final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        @Override public void write(int value) { limit(1); bytes.write(value); }
        @Override public void write(byte[] data, int offset, int length) { limit(length); bytes.write(data, offset, length); }
        private void limit(int length) { if (length < 0 || length > MailFilePolicy.MAX - bytes.size()) throw denied("email_pdf_complex"); }
    }
}
