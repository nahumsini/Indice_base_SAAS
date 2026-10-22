package com.indice.erp.email.mailbox;
import org.junit.jupiter.api.Test;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.interactive.documentnavigation.destination.PDPageFitDestination;
import org.apache.pdfbox.pdmodel.interactive.action.PDActionJavaScript;
import java.io.ByteArrayOutputStream;
import static org.assertj.core.api.Assertions.*;
class MailProfessionalPolicyTest {
 @Test void acceptsPassivePdfOpeningDestinationButRejectsExecutableAction() throws Exception {
  try(var doc=new PDDocument();var out=new ByteArrayOutputStream()){
   var page=new PDPage();doc.addPage(page);var destination=new PDPageFitDestination();destination.setPage(page);doc.getDocumentCatalog().setOpenAction(destination);doc.save(out);
   assertThatCode(()->MailFilePolicy.bytes("receipt.pdf","application/pdf",out.toByteArray())).doesNotThrowAnyException();
   doc.getDocumentCatalog().setOpenAction(new PDActionJavaScript("app.alert('test')"));out.reset();doc.save(out);
   assertThatThrownBy(()->MailFilePolicy.bytes("active.pdf","application/pdf",out.toByteArray())).hasMessageContaining("email_pdf_active");
  }
 }
 @Test void differentiatesPasswordFormsDamageAndComplexity() throws Exception {
  try(var doc=new PDDocument();var out=new ByteArrayOutputStream()){
   doc.addPage(new PDPage());doc.getDocumentCatalog().setAcroForm(new org.apache.pdfbox.pdmodel.interactive.form.PDAcroForm(doc));doc.save(out);
   assertThatThrownBy(()->MailFilePolicy.bytes("form.pdf","application/pdf",out.toByteArray())).hasMessageContaining("email_pdf_form");
   doc.getDocumentCatalog().setAcroForm(null);doc.protect(new org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy("owner","reader",new org.apache.pdfbox.pdmodel.encryption.AccessPermission()));out.reset();doc.save(out);
   assertThatThrownBy(()->MailFilePolicy.bytes("protected.pdf","application/pdf",out.toByteArray())).hasMessageContaining("email_pdf_password");
  }
  assertThatThrownBy(()->MailFilePolicy.bytes("broken.pdf","application/pdf","%PDF-invalid".getBytes())).hasMessageContaining("email_attachment_damaged");
 }
 @Test void keepsExplicitFormattingWithoutActiveAttributesOrRemotePixels() {
  String clean=SafeMailHtml.clean("<p style='font-size:18px;color:#2563eb;text-align:center;position:fixed;background-image:url(https://tracker.invalid)'><b>Hello</b><a href='https://example.com/info'>Website</a><a href='javascript:alert(1)'>Bad</a><img src='https://tracker.invalid/pixel' onerror='bad()'><iframe src='https://bad.invalid'></iframe><script>bad()</script></p>");
  assertThat(clean).contains("font-size:18px","color:#2563eb","text-align:center","href=\"https://example.com/info\"").doesNotContain("tracker.invalid","javascript:","onerror","position:","background-image","<script","<iframe");
  assertThat(SafeMailHtml.clean(clean)).isEqualTo(clean);
 }
 @Test void embeddedImagesBecomeCidPartsWithPlainSafeHtml() throws Exception {
  var image=new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB);var out=new ByteArrayOutputStream();javax.imageio.ImageIO.write(image,"png",out);
  String data="data:image/png;base64,"+java.util.Base64.getEncoder().encodeToString(out.toByteArray());
  assertThat(SafeMailHtml.clean("<img src='"+data+"' alt='logo'>")).contains(data);
  var body=MailInlineImages.body("<p>Hello</p><img src='"+data+"' alt='logo'>");var related=(jakarta.mail.Multipart)body.getContent();
  assertThat(related.getCount()).isEqualTo(2);assertThat((String)related.getBodyPart(0).getContent()).contains("cid:").doesNotContain("base64");assertThat(related.getBodyPart(1).getDisposition()).isEqualTo("inline");
  assertThat(SafeMailHtml.clean("<img src='data:image/svg+xml;base64,PHN2Zz4='>")).doesNotContain("<img");
 }
 @Test void hostileFontAndUrlsCannotEscapeTheFormatContract() {
  assertThat(SafeMailHtml.clean("<font face='Arial' color='#123456' size='4'>Hi</font>")).contains("font-family:arial","font-size:18px");
  assertThat(SafeMailHtml.validLink("https://example.com/path?q=one&x=2")).isTrue();
  assertThat(SafeMailHtml.validLink("mailto:person@example.com")).isTrue();
  assertThat(SafeMailHtml.validLink("https://user:password@example.com")).isFalse();
  assertThat(SafeMailHtml.validLink("mailto:a@example.com?bcc=other@example.com")).isFalse();
 }
}
