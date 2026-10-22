package com.indice.erp.email.mailbox;

import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMultipart;
import jakarta.activation.DataHandler;
import jakarta.mail.util.ByteArrayDataSource;
import java.util.Base64;
import java.util.regex.Pattern;

/** Turn validated embedded images into related MIME resources for ordinary mail clients. */
final class MailInlineImages {
    private static final Pattern IMAGE=Pattern.compile("src=\"(data:image/(png|jpeg);base64,([A-Za-z0-9+/=]+))\"");
    static MimeBodyPart body(String input) throws Exception {
        String clean=SafeMailHtml.clean(input);var matcher=IMAGE.matcher(clean==null?"":clean);var markup=new StringBuffer();var related=new MimeMultipart("related");int count=0;
        while(matcher.find()){
            String cid="image-"+(++count)+"-"+java.util.UUID.randomUUID()+"@indice.inline";
            var image=new MimeBodyPart();image.setDataHandler(new DataHandler(new ByteArrayDataSource(Base64.getDecoder().decode(matcher.group(3)),"image/"+matcher.group(2))));
            image.setHeader("Content-ID","<"+cid+">");image.setDisposition("inline");related.addBodyPart(image);
            matcher.appendReplacement(markup,java.util.regex.Matcher.quoteReplacement("src=\"cid:"+cid+"\""));
        }matcher.appendTail(markup);
        var html=new MimeBodyPart();html.setContent(markup.toString(),"text/html; charset=UTF-8");if(count==0)return html;
        related.addBodyPart(html,0);var part=new MimeBodyPart();part.setContent(related);return part;
    }
}
