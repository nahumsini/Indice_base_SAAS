package com.indice.erp.email.mailbox;

import jakarta.mail.internet.MimeBodyPart;
import jakarta.mail.internet.MimeMultipart;
import jakarta.activation.DataHandler;
import jakarta.mail.util.ByteArrayDataSource;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.regex.Pattern;

/** Bounded embedded images cross the MIME boundary as related CID resources. */
final class MailInlineImages {
    private static final Pattern IMAGE=Pattern.compile("src=\"(data:image/(png|jpeg);base64,([A-Za-z0-9+/=]+))\"");
    /** Resolve only siblings in one multipart/related container, without fetching any URL. */
    static Map<String,String> received(jakarta.mail.Multipart related,int[] budget) throws Exception {
        var images=new HashMap<String,String>();var seen=new HashSet<String>();
        for(int i=0;i<Math.min(related.getCount(),80);i++) {
            var part=related.getBodyPart(i);var headers=part.getHeader("Content-ID");
            if(headers==null||headers.length!=1)continue;
            String cid=headers[0].trim();
            if(cid.startsWith("<")&&cid.endsWith(">"))cid=cid.substring(1,cid.length()-1);
            if(cid.isEmpty()||cid.length()>254||!cid.matches("[\\x21-\\x3b\\x3d\\x3f-\\x7e]+"))continue;
            if(!seen.add(cid)){images.remove(cid);continue;}
            if(jakarta.mail.Part.ATTACHMENT.equalsIgnoreCase(part.getDisposition()))continue;
            String type=part.isMimeType("image/png")?"image/png":part.isMimeType("image/jpeg")?"image/jpeg":null;
            if(type==null||budget[0]<=0||images.size()>=3)continue;
            // MIME size includes transfer encoding; enforce the limit on decoded bytes below.
            int limit=Math.min(102400,budget[0]);
            try(var stream=part.getInputStream()) {
                byte[] bytes=stream.readNBytes(limit+1);budget[0]-=Math.min(bytes.length,limit);
                if(bytes.length>limit)continue;
                String data="data:"+type+";base64,"+Base64.getEncoder().encodeToString(bytes);
                if(SafeMailHtml.validImage(data))images.put(cid,data);
            }catch(java.io.IOException|jakarta.mail.MessagingException invalidImage) {
                // A damaged optional image must not hide the readable message.
            }
        }
        return images;
    }
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
