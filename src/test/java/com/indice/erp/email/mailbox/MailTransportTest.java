package com.indice.erp.email.mailbox;

import com.indice.erp.email.accounts.*;
import jakarta.mail.*;
import jakarta.mail.internet.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import org.eclipse.angus.mail.imap.IMAPFolder;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class MailTransportTest {
    EmailAccountService.ConnectionMaterial material(int port){
        var account=new EmailAccountContracts.Account("00000000-0000-0000-0000-000000000001","Test","sender@example.com","Synthetic sender",
            "127.0.0.1",port,"TLS","synthetic-user","IMAP","127.0.0.1",993,"synthetic-user",false,true,true,true,"VERIFIED","VERIFIED",null,null,1);
        return new EmailAccountService.ConnectionMaterial(account,"synthetic-password");
    }
    @Test void htmlIsConvertedToBoundedTextWithoutImagesScriptsOrAttachments()throws Exception {
        assertThat(MailContent.plainHtml("<p>Hello<img src='https://tracker.invalid/t'></p><script>bad()</script><style>hidden</style><p>World</p>")).contains("Hello","World").doesNotContain("tracker","bad()","hidden");
        var message=new MimeMessage(Session.getInstance(new Properties()));var multipart=new MimeMultipart("mixed");
        var text=new MimeBodyPart();text.setText("Safe body","UTF-8");multipart.addBodyPart(text);
        var attachment=new MimeBodyPart();attachment.setText("DO NOT DISPLAY","UTF-8");attachment.setFileName("invoice.txt");attachment.setDisposition(Part.ATTACHMENT);multipart.addBodyPart(attachment);
        message.setContent(multipart);message.saveChanges();var body=MailContent.body(message);
        assertThat(body.text()).contains("Safe body").doesNotContain("DO NOT DISPLAY");assertThat(body.attachments()).isTrue();
    }
    @Test void longTextIsTruncatedAndAlternativePrefersPlainText()throws Exception {
        var message=new MimeMessage(Session.getInstance(new Properties()));var alternative=new MimeMultipart("alternative");
        var plain=new MimeBodyPart();plain.setText("x".repeat(150000),"UTF-8");alternative.addBodyPart(plain);
        var html=new MimeBodyPart();html.setContent("<p>HTML fallback</p>","text/html; charset=UTF-8");alternative.addBodyPart(html);message.setContent(alternative);message.saveChanges();
        var body=MailContent.body(message);assertThat(body.text()).hasSize(100000).doesNotContain("fallback");assertThat(body.truncated()).isTrue();
    }
    @Test void smtpEnvelopeIncludesBccButMessageHeadersNeverDiscloseIt()throws Exception {smtp(false);}
    @Test void missingDataAcknowledgementIsUncertainAndNotAutomaticallyRepeated()throws Exception {smtp(true);}
    @Test void smtpRecipientRejectionIsDefiniteAndDoesNotTransmitBody()throws Exception {smtp(false,"RCPT");}
    @Test void smtpContentRejectionIsDefiniteEvenAfterData()throws Exception {smtp(false,"END");}
    void smtp(boolean dropAcknowledgement)throws Exception {smtp(dropAcknowledgement,"");}
    void smtp(boolean dropAcknowledgement,String reject)throws Exception {
        try(var server=new ServerSocket(0,1,InetAddress.getByName("127.0.0.1"));var executor=Executors.newSingleThreadExecutor()) {
            server.setSoTimeout(5000);
            var transcript=executor.submit(()->{
                try(var socket=server.accept()){socket.setSoTimeout(4000);var in=new BufferedReader(new InputStreamReader(socket.getInputStream(),StandardCharsets.UTF_8));var out=new PrintWriter(socket.getOutputStream(),true,StandardCharsets.UTF_8);var lines=new ArrayList<String>();
                    out.print("220 synthetic ESMTP\r\n");out.flush();String line;boolean data=false;int login=0;
                    while((line=in.readLine())!=null){
                        if(data){if(line.equals(".")){data=false;if(dropAcknowledgement)break;out.print(reject.equals("END")?"554 policy rejected\r\n":"250 accepted\r\n");out.flush();}else lines.add("DATA "+line);continue;}
                        if(login>0){login++;out.print(login==2?"334 UGFzc3dvcmQ6\r\n":"235 authenticated\r\n");if(login==3)login=0;}
                        else if(line.startsWith("EHLO"))out.print("250-synthetic\r\n250 AUTH LOGIN PLAIN\r\n");
                        else if(line.equals("AUTH LOGIN")){login=1;out.print("334 VXNlcm5hbWU6\r\n");}
                        else if(line.startsWith("AUTH PLAIN"))out.print("235 authenticated\r\n");
                        else if(line.startsWith("RCPT")){lines.add(line);out.print(reject.equals("RCPT")?"550 invalid recipient\r\n":"250 recipient\r\n");}
                        else if(line.equals("DATA")){data=true;out.print("354 continue\r\n");}
                        else if(line.equals("QUIT")){out.print("221 bye\r\n");out.flush();break;}
                        else out.print("250 ok\r\n");out.flush();
                    }return lines;
                }
            });
            var props=new Properties();props.setProperty("mail.smtp.auth","true");props.setProperty("mail.smtp.quitwait","false");props.setProperty("mail.smtp.timeout","4000");props.setProperty("mail.smtp.connectiontimeout","4000");
            {
                var connections=new JakartaMailboxTransport.Connections(){@Override Session smtp(EmailAccountService.ConnectionMaterial m){return Session.getInstance(props);}};
                var outgoing=new MailboxTransport.Outgoing("<fixed-id@example.com>","Hello","Synthetic body",List.of("to@example.com"),List.of("cc@example.com"),List.of("secret@example.com"),"<parent@example.com>","<parent@example.com>");
                if(!reject.isEmpty()) {
                    assertThatThrownBy(()->new JakartaMailboxTransport(connections).send(material(server.getLocalPort()),outgoing))
                        .isInstanceOf(MailSendRejection.class).hasMessage(reject.equals("RCPT")?"email_send_recipient_rejected":"email_send_content_rejected");
                    var wire=String.join("\n",transcript.get(5,TimeUnit.SECONDS));
                    if(reject.equals("RCPT"))assertThat(wire).doesNotContain("DATA ");
                } else {
                    var result=new JakartaMailboxTransport(connections).send(material(server.getLocalPort()),outgoing);
                    assertThat(result).isEqualTo(dropAcknowledgement?MailboxTransport.Outcome.UNKNOWN:MailboxTransport.Outcome.ACCEPTED);
                    String wire=String.join("\n",transcript.get(5,TimeUnit.SECONDS));assertThat(wire).contains("RCPT TO:<secret@example.com>","DATA Message-ID: <fixed-id@example.com>","DATA In-Reply-To: <parent@example.com>","Synthetic body").doesNotContain("DATA Bcc:","DATA secret@example.com");
                }
            }
        }
    }
    @Test void partialDeliveryAndMissingAcknowledgementRemainUnknown()throws Exception {
        var smtp=new org.eclipse.angus.mail.smtp.SMTPSendFailedException(".",554,"private provider details",null,new Address[]{new InternetAddress("delivered@example.com")},null,null);
        assertThat(MailSendRejection.classify(smtp,true)).isNull();
        assertThat(MailSendRejection.classify(new java.net.SocketTimeoutException("private host"),true)).isNull();
        assertThat(MailSendRejection.classify(new AuthenticationFailedException("secret"),false)).hasMessage("email_send_authentication_failed");
    }
    @Test void folderCreationUsesPersonalNamespaceAndIsIdempotent()throws Exception {
        var connections=mock(JakartaMailboxTransport.Connections.class);var store=mock(Store.class);var root=mock(Folder.class);var folder=mock(Folder.class);
        when(connections.receive(any())).thenReturn(store);when(store.getPersonalNamespaces()).thenReturn(new Folder[]{root});when(root.getFolder("Clientes")).thenReturn(folder);
        when(folder.exists()).thenReturn(false,true);when(folder.create(Folder.HOLDS_MESSAGES)).thenReturn(true);when(folder.getType()).thenReturn(Folder.HOLDS_MESSAGES);when(folder.getFullName()).thenReturn("INBOX.Clientes");
        var transport=new JakartaMailboxTransport(connections);
        assertThat(transport.createFolder(material(465),"Clientes").name()).isEqualTo("INBOX.Clientes");
        transport.createFolder(material(465),"Clientes");verify(folder,times(1)).create(Folder.HOLDS_MESSAGES);
    }
    @Test void imapOpenMarksSeenAndClosesWithoutExpungingOtherMessages()throws Exception {
        var connections=mock(JakartaMailboxTransport.Connections.class);var store=mock(Store.class);var folder=mock(IMAPFolder.class);
        var message=new MimeMessage(Session.getInstance(new Properties()));message.setText("Real parsed MIME");message.saveChanges();
        when(connections.receive(any())).thenReturn(store);when(store.getFolder("INBOX")).thenReturn(folder);when(folder.getUIDValidity()).thenReturn(40L);when(folder.getMessageByUID(9)).thenReturn(message);
        {
            var result=new JakartaMailboxTransport(connections).open(material(465),new MailboxTransport.Cursor("INBOX",40,9,9),9);
            assertThat(result.text()).isEqualTo("Real parsed MIME");assertThat(message.isSet(Flags.Flag.SEEN)).isTrue();verify(folder).close(false);verify(folder,never()).expunge();
            assertThatThrownBy(()->new JakartaMailboxTransport(connections).open(material(465),new MailboxTransport.Cursor("INBOX",39,9,9),9)).isInstanceOf(MailboxTransport.Failure.class);
        }
    }
    @Test void incrementalSyncBoundsUidWindowAndAdvancesAcrossDeletedUidGaps()throws Exception {
        var connections=mock(JakartaMailboxTransport.Connections.class);var store=mock(Store.class);var folder=mock(IMAPFolder.class);
        when(connections.receive(any())).thenReturn(store);when(store.getFolder("INBOX")).thenReturn(folder);when(folder.getUIDValidity()).thenReturn(40L);when(folder.getUIDNext()).thenReturn(5000L);when(folder.getMessagesByUID(11,1010)).thenReturn(new Message[0]);
        {
            var result=new JakartaMailboxTransport(connections).sync(material(465),new MailboxTransport.Cursor("INBOX",40,10,2),false,new long[0]);
            assertThat(result.newest()).isEqualTo(1010);assertThat(result.oldest()).isEqualTo(2);verify(folder).getMessagesByUID(11,1010);verify(folder).close(false);
        }
    }

    @Test void formattingHtmlDropsEveryAttributeAndActiveElement() {
        String result=SafeMailHtml.clean("<table style='background:url(https://track.invalid)'><tr><td onclick='x()'>Hi &amp; &lt;safe&gt;<a href='javascript:bad()'>Link</a><svg onload='x()'></svg><iframe srcdoc='bad'></iframe><script>bad()</script></td></tr></table>");
        assertThat(result).contains("<table>","<td>","&lt;safe&gt;","Link").doesNotContain("style=","onclick","javascript:","<svg","<iframe","<script","track.invalid");
    }
    @Test void sentAppendChecksMessageIdAndAmbiguousAppendNeverRetriesBlindly() throws Exception {
        var connections=mock(JakartaMailboxTransport.Connections.class);var store=mock(Store.class);var folder=mock(IMAPFolder.class);
        when(connections.receive(any())).thenReturn(store);when(store.getFolder("Sent")).thenReturn(folder);when(folder.exists()).thenReturn(true);when(folder.search(any(jakarta.mail.search.SearchTerm.class))).thenReturn(new Message[0]);
        var transport=new JakartaMailboxTransport(connections);var outgoing=new MailboxTransport.Outgoing("<copy@example.com>","Copy","text",List.of("recipient@example.com"),List.of(),List.of(),null,null);
        doThrow(new MessagingException("synthetic lost ack")).when(folder).appendMessages(any(Message[].class));
        assertThat(transport.copySent(material(465),outgoing,"Sent",true)).isEqualTo(MailboxTransport.CopyOutcome.UNKNOWN);
        assertThat(transport.copySent(material(465),outgoing,"Sent",false)).isEqualTo(MailboxTransport.CopyOutcome.UNKNOWN);verify(folder,times(1)).appendMessages(any(Message[].class));
        var found=new MimeMessage(Session.getInstance(new Properties()));found.setHeader("Message-ID","<copy@example.com>");when(folder.search(any(jakarta.mail.search.SearchTerm.class))).thenReturn(new Message[]{found});
        assertThat(transport.copySent(material(465),outgoing,"Sent",true)).isEqualTo(MailboxTransport.CopyOutcome.COPIED);verify(folder,times(1)).appendMessages(any(Message[].class));
    }
    @Test void passiveFilePolicyRejectsActivePdfAndMismatchedSignatures() throws Exception {
        assertThatThrownBy(()->MailFilePolicy.bytes("image.png","image/png","not an image".getBytes())).hasMessageContaining("email_attachment_blocked");
        try(var pdf=new org.apache.pdfbox.pdmodel.PDDocument();var out=new ByteArrayOutputStream()){
            pdf.addPage(new org.apache.pdfbox.pdmodel.PDPage());pdf.save(out);MailFilePolicy.bytes("safe.pdf","application/pdf",out.toByteArray());
            pdf.getDocumentCatalog().getCOSObject().setString(org.apache.pdfbox.cos.COSName.getPDFName("JS"),"app.alert('bad')");out.reset();pdf.save(out);
            assertThatThrownBy(()->MailFilePolicy.bytes("active.pdf","application/pdf",out.toByteArray())).hasMessageContaining("email_attachment_blocked");
        }
    }
}
