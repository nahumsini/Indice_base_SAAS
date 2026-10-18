package com.indice.erp.email.mailbox;

import jakarta.mail.*;
import jakarta.mail.internet.*;
import java.io.*;
import java.nio.charset.*;
import java.time.Instant;
import java.util.*;
import javax.swing.text.html.*;
import javax.swing.text.html.parser.ParserDelegator;

/** Mail is untrusted input. Display bounded plain text; never execute HTML or load remote images. */
final class MailContent {
    private static final int MAX_TEXT=100_000,MAX_PART_BYTES=400_000;
    static String clipped(String text,int max){return text==null?"":text.substring(0,Math.min(text.length(),max)).replace("\u0000","");}
    static String header(Message message,String key,int max) throws MessagingException {
        var values=message.getHeader(key);return values==null?null:clipped(String.join(" ",values),max).replaceAll("[\\r\\n]"," ");
    }
    static List<String> addresses(Address[] addresses) {
        if(addresses==null)return List.of();
        return Arrays.stream(addresses).filter(InternetAddress.class::isInstance).map(InternetAddress.class::cast)
            .map(InternetAddress::getAddress).filter(Objects::nonNull).filter(a->!a.contains("\r")&&!a.contains("\n"))
            .limit(100).map(a->clipped(a,320)).toList();
    }
    static MailboxTransport.RemoteHeader header(Message message,long uid) throws MessagingException {
        var from=message.getFrom();var address=from!=null&&from.length>0&&from[0] instanceof InternetAddress a?a:null;
        var at=message.getReceivedDate();if(at==null)at=message.getSentDate();
        return new MailboxTransport.RemoteHeader(uid,clipped(message.getSubject(),500),address==null?"":clipped(address.getAddress(),320),
            address==null?"":clipped(address.getPersonal(),200),addresses(message.getRecipients(Message.RecipientType.TO)),
            addresses(message.getRecipients(Message.RecipientType.CC)),addresses(message.getReplyTo()),header(message,"Message-ID",512),
            header(message,"References",4000),at==null?Instant.now():at.toInstant(),message.isSet(Flags.Flag.SEEN),message.isSet(Flags.Flag.FLAGGED));
    }
    static MailboxTransport.Body body(Part part) throws Exception {
        var state=new TextState();String text=extract(part,0,state);
        return new MailboxTransport.Body(clipped(text,MAX_TEXT),state.truncated||text.length()>MAX_TEXT,state.attachments,state.html);
    }
    private static final class TextState {String html;boolean truncated,attachments;int parts,remaining=MAX_PART_BYTES;final long deadline=System.nanoTime()+20_000_000_000L;}
    private static String extract(Part part,int depth,TextState state) throws Exception {
        if(System.nanoTime()>state.deadline)throw new MailboxTransport.Failure("email_message_too_complex");
        if(depth>10||++state.parts>80){state.truncated=true;return "";}
        if(Part.ATTACHMENT.equalsIgnoreCase(part.getDisposition())||part.getFileName()!=null){state.attachments=true;return "";}
        if(part.isMimeType("multipart/*")) {
            if(!(part.getContent() instanceof Multipart multi))return "";
            boolean alternative=part.isMimeType("multipart/alternative");StringBuilder text=new StringBuilder();String fallback="";
            for(int i=0;i<Math.min(multi.getCount(),80);i++) {
                var child=multi.getBodyPart(i);String value=extract(child,depth+1,state);
                if(alternative){if(child.isMimeType("text/plain")&&!value.isBlank())text=new StringBuilder(value);else if(fallback.isEmpty())fallback=value;}
                else if(text.length()<MAX_TEXT)text.append(value).append('\n');else state.truncated=true;
            }
            return alternative&&text.isEmpty()?fallback:text.toString();
        }
        if(!part.isMimeType("text/plain")&&!part.isMimeType("text/html")){state.attachments=true;return "";}
        if(state.remaining<=0){state.truncated=true;return "";}
        int limit=state.remaining;byte[] bytes;try(var stream=part.getInputStream()){bytes=stream.readNBytes(limit+1);}
        state.truncated|=bytes.length>limit;state.remaining-=Math.min(bytes.length,limit);
        Charset charset=StandardCharsets.UTF_8;
        try{String name=new ContentType(part.getContentType()).getParameter("charset");if(name!=null)charset=Charset.forName(name);}catch(Exception ignored){ }
        String value=new String(bytes,0,Math.min(bytes.length,limit),charset);
        if(part.isMimeType("text/html")){state.html=SafeMailHtml.clean(value);return plainHtml(value);}return value;
    }
    static String withoutHiddenBlocks(String html) {
        String lower=html.toLowerCase(Locale.ROOT);var output=new StringBuilder();int position=0;
        while(position<html.length()) {
            int script=lower.indexOf("<script",position),style=lower.indexOf("<style",position);
            int next=script<0?style:style<0?script:Math.min(script,style);
            if(next<0){output.append(html,position,html.length());break;}
            output.append(html,position,next);String closing=next==script?"</script":"</style";
            int end=lower.indexOf(closing,next);if(end<0)break;
            end=lower.indexOf('>',end);if(end<0)break;position=end+1;
        }
        return output.toString();
    }
    static String plainHtml(String html) throws IOException {
        var text=new StringBuilder();new ParserDelegator().parse(new StringReader(withoutHiddenBlocks(html)),new HTMLEditorKit.ParserCallback(){
            int suppressed;
            @Override public void handleStartTag(HTML.Tag tag,javax.swing.text.MutableAttributeSet attrs,int pos){if(tag==HTML.Tag.SCRIPT||tag==HTML.Tag.STYLE)suppressed++;if(tag==HTML.Tag.P||tag==HTML.Tag.DIV)text.append('\n');}
            @Override public void handleEndTag(HTML.Tag tag,int pos){if((tag==HTML.Tag.SCRIPT||tag==HTML.Tag.STYLE)&&suppressed>0)suppressed--;if(tag==HTML.Tag.P||tag==HTML.Tag.DIV)text.append('\n');}
            @Override public void handleSimpleTag(HTML.Tag tag,javax.swing.text.MutableAttributeSet attrs,int pos){if(tag==HTML.Tag.BR)text.append('\n');}
            @Override public void handleText(char[] data,int pos){if(suppressed==0)text.append(data);}
        },true);return text.toString();
    }
}
