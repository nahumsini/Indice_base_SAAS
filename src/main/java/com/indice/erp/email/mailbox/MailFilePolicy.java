package com.indice.erp.email.mailbox;
import java.nio.charset.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
/** Validated documents and images; prepared PDFs contain no embedded files or active content. */
public final class MailFilePolicy {
    public static final int MAX=10*1024*1024;
    public static final int TOTAL=10*1024*1024;
    public static final int COUNT=5;
    public static void metadata(String name,String type,long size){
        String extension=name.toLowerCase(Locale.ROOT);
        boolean valid=switch(type){case "application/pdf"->extension.endsWith(".pdf");case "image/png"->extension.endsWith(".png");case "image/jpeg"->extension.endsWith(".jpg")||extension.endsWith(".jpeg");case "text/plain"->extension.endsWith(".txt");default->MailOfficePolicy.TYPES.entrySet().stream().anyMatch(e->e.getValue().equals(type)&&extension.endsWith("."+e.getKey()));};
        if(!valid||size<1||size>MAX||name.length()>180||name.matches(".*[\\r\\n\\x00/\\\\].*"))throw denied();
    }
    public static void bytes(String name,String type,byte[] bytes){
        metadata(name,type,bytes.length);
        try{
            switch(type){
                case "application/pdf"->MailPdfPolicy.validate(bytes);
                case "image/png","image/jpeg"->{
                    boolean signature=type.equals("image/png")?bytes.length>8&&Arrays.equals(Arrays.copyOf(bytes,8),new byte[]{(byte)137,80,78,71,13,10,26,10}):bytes.length>3&&bytes[0]==(byte)255&&bytes[1]==(byte)216&&bytes[2]==(byte)255;
                    if(!signature)throw denied();
                    try(var stream=javax.imageio.ImageIO.createImageInputStream(new java.io.ByteArrayInputStream(bytes))){var readers=javax.imageio.ImageIO.getImageReaders(stream);if(!readers.hasNext())throw denied();var reader=readers.next();try{reader.setInput(stream);if((long)reader.getWidth(0)*reader.getHeight(0)>20_000_000)throw denied();}finally{reader.dispose();}}
                }
                case "text/plain"->{String text=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT).decode(java.nio.ByteBuffer.wrap(bytes)).toString();if(text.indexOf('\0')>=0)throw denied();}
                default->{if(!MailOfficePolicy.TYPES.containsValue(type))throw denied();MailOfficePolicy.validate(name,bytes);}
            }
        }catch(ResponseStatusException e){throw e;}catch(org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException e){throw denied("email_pdf_password");}catch(Exception e){throw denied(MailOfficePolicy.TYPES.containsValue(type)?"email_attachment_blocked":"email_attachment_damaged");}
    }
    /** Intake only. Downloads and sends still call strict bytes(), never this preparation. */
    public static byte[] prepare(String name,String type,byte[] bytes){
        metadata(name,type,bytes.length);
        if(!type.equals("application/pdf")){bytes(name,type,bytes);return bytes;}
        try{return MailPdfPolicy.prepare(bytes);}
        catch(ResponseStatusException e){throw e;}
        catch(org.apache.pdfbox.pdmodel.encryption.InvalidPasswordException e){throw denied("email_pdf_password");}
        catch(Exception e){throw denied("email_attachment_damaged");}
    }
    private static ResponseStatusException denied(){return denied("email_attachment_blocked");}
    private static ResponseStatusException denied(String code){return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,code);}
}
