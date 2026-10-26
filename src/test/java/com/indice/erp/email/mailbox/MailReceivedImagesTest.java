package com.indice.erp.email.mailbox;

import jakarta.activation.DataHandler;
import jakarta.mail.*;
import jakarta.mail.internet.*;
import jakarta.mail.util.ByteArrayDataSource;
import java.io.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class MailReceivedImagesTest {
    byte[] png() throws Exception {
        var bytes=new ByteArrayOutputStream();
        javax.imageio.ImageIO.write(new java.awt.image.BufferedImage(2,2,java.awt.image.BufferedImage.TYPE_INT_RGB),"png",bytes);
        return bytes.toByteArray();
    }
    MimeBodyPart html(String html) throws Exception {var p=new MimeBodyPart();p.setContent(html,"text/html; charset=UTF-8");return p;}
    MimeBodyPart image(String cid,String type,byte[] bytes) throws Exception {
        var p=new MimeBodyPart();p.setDataHandler(new DataHandler(new ByteArrayDataSource(bytes,type)));
        p.setHeader("Content-ID","<"+cid+">");p.setDisposition(Part.INLINE);return p;
    }
    MailboxTransport.Body read(Multipart parts) throws Exception {
        var message=new MimeMessage(Session.getInstance(new Properties()));message.setContent(parts);message.saveChanges();
        var wire=new ByteArrayOutputStream();message.writeTo(wire);
        return MailContent.body(new MimeMessage(Session.getInstance(new Properties()),new ByteArrayInputStream(wire.toByteArray())));
    }
    @Test void outgoingImageSurvivesMimeSerializationAndOpeningTheServerCopy() throws Exception {
        String data="data:image/png;base64,"+Base64.getEncoder().encodeToString(png());
        var alternative=new MimeMultipart("alternative");var plain=new MimeBodyPart();plain.setText("Hello reader");alternative.addBodyPart(plain);
        alternative.addBodyPart(MailInlineImages.body("<p>Hello reader</p><img src=\""+data+"\" alt=\"Logo\">"));
        var result=read(alternative);
        assertThat(result.text()).isEqualTo("Hello reader");
        assertThat(result.html()).contains(data,"alt=\"Logo\"").doesNotContain("cid:");
        assertThat(SafeMailHtml.clean(result.html())).isEqualTo(result.html());
    }
    @Test void validImageAboveEncodedSizeThresholdSurvivesOpeningSentCopy() throws Exception {
        var pixels=new java.awt.image.BufferedImage(168,168,java.awt.image.BufferedImage.TYPE_INT_RGB);
        var random=new Random(26);
        for(int y=0;y<pixels.getHeight();y++)for(int x=0;x<pixels.getWidth();x++)pixels.setRGB(x,y,random.nextInt(0x1000000));
        var png=new ByteArrayOutputStream();javax.imageio.ImageIO.write(pixels,"png",png);
        assertThat(png.size()).isBetween(80_000,102_400);
        String data="data:image/png;base64,"+Base64.getEncoder().encodeToString(png.toByteArray());
        var alternative=new MimeMultipart("alternative");var plain=new MimeBodyPart();plain.setText("Campaign body");alternative.addBodyPart(plain);
        alternative.addBodyPart(MailInlineImages.body("<p>Campaign body</p><img src=\""+data+"\">"));
        var message=new MimeMessage(Session.getInstance(new Properties()));message.setContent(alternative);message.saveChanges();
        var wire=new ByteArrayOutputStream();message.writeTo(wire);
        var received=new MimeMessage(Session.getInstance(new Properties()),new ByteArrayInputStream(wire.toByteArray()));
        var receivedAlternative=(Multipart)received.getContent();var related=(Multipart)receivedAlternative.getBodyPart(1).getContent();
        assertThat(related.getBodyPart(1).getSize()).isGreaterThan(102_400);
        assertThat(MailContent.body(received).html()).contains(data);
    }
    @Test void namedInlineImagesResolveButAttachmentsRemotePixelsAndActiveContentDoNot() throws Exception {
        var related=new MimeMultipart("related");related.addBodyPart(html("<p>Readable</p><img src='cid:logo'><img src='cid:attached'><img src='https://tracker.invalid/pixel'><script>bad()</script>"));
        var logo=image("logo","image/png",png());logo.setFileName("logo.png");related.addBodyPart(logo);
        var attachment=image("attached","image/png",png());attachment.setDisposition(Part.ATTACHMENT);related.addBodyPart(attachment);
        var result=read(related);
        assertThat(result.html()).contains("data:image/png;base64,").doesNotContain("tracker.invalid","bad()","cid:");
        assertThat(result.html().split("<img ",-1)).hasSize(2);
        assertThat(result.attachments()).isTrue();
    }
    @Test void duplicateMissingOversizedAndInvalidResourcesAreNotRendered() throws Exception {
        var related=new MimeMultipart("related");related.addBodyPart(html("<p>Readable</p><img src='cid:duplicate'><img src='cid:missing'><img src='cid:huge'><img src='cid:fake'><img src='cid:vector'>"));
        related.addBodyPart(image("duplicate","image/png",png()));related.addBodyPart(image("duplicate","image/png",png()));
        related.addBodyPart(image("huge","image/png",new byte[102401]));related.addBodyPart(image("fake","image/png",new byte[]{1,2,3}));
        related.addBodyPart(image("vector","image/svg+xml","<svg onload='bad()'/>".getBytes()));
        var result=read(related);assertThat(result.html()).contains("Readable").doesNotContain("<img","svg","onload","cid:");
    }
    @Test void cidResourcesNeverLeakAcrossSeparateRelatedBodiesOrMessages() throws Exception {
        var mixed=new MimeMultipart("mixed");var first=new MimeMultipart("related");first.addBodyPart(html("<p>First</p>"));first.addBodyPart(image("private","image/png",png()));
        var firstPart=new MimeBodyPart();firstPart.setContent(first);mixed.addBodyPart(firstPart);
        var second=new MimeMultipart("related");second.addBodyPart(html("<p>Second</p><img src='cid:private'>"));var secondPart=new MimeBodyPart();secondPart.setContent(second);mixed.addBodyPart(secondPart);
        assertThat(read(mixed).html()).contains("Second").doesNotContain("<img");
        assertThat(read(second).html()).doesNotContain("<img");
        assertThat(SafeMailHtml.clean("<img src='cid:private'>")).doesNotContain("<img");
    }
    @Test void acceptsAtMostThreeValidatedImages() throws Exception {
        var related=new MimeMultipart("related");related.addBodyPart(html("<p>Bounded</p><img src='cid:one'><img src='cid:two'><img src='cid:three'><img src='cid:four'>"));
        for(String cid:List.of("one","two","three","four"))related.addBodyPart(image(cid,"image/png",png()));
        assertThat(read(related).html().split("<img ",-1)).hasSize(4);
    }
}
