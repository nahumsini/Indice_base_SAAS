package com.indice.erp.email.mailbox;
import java.nio.charset.*;
import java.util.*;
import org.apache.pdfbox.cos.*;
import org.apache.pdfbox.Loader;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;
/** Validated documents and images; executable, macro-enabled and embedded content stays blocked. */
final class MailFilePolicy {
    static final int MAX=5*1024*1024;
    static void metadata(String name,String type,long size){
        String extension=name.toLowerCase(Locale.ROOT);
        boolean valid=switch(type){case "application/pdf"->extension.endsWith(".pdf");case "image/png"->extension.endsWith(".png");case "image/jpeg"->extension.endsWith(".jpg")||extension.endsWith(".jpeg");case "text/plain"->extension.endsWith(".txt");default->MailOfficePolicy.TYPES.entrySet().stream().anyMatch(e->e.getValue().equals(type)&&extension.endsWith("."+e.getKey()));};
        if(!valid||size<1||size>MAX||name.length()>180||name.matches(".*[\\r\\n\\x00/\\\\].*"))throw denied();
    }
    static void bytes(String name,String type,byte[] bytes){
        metadata(name,type,bytes.length);
        try{
            switch(type){
                case "application/pdf"->{
                    if(bytes.length<5||!new String(bytes,0,5,StandardCharsets.US_ASCII).equals("%PDF-"))throw denied();
                    try(var doc=Loader.loadPDF(bytes)){
                        if(doc.isEncrypted())throw denied("email_pdf_password");
                        if(doc.getNumberOfPages()>200)throw denied("email_pdf_complex");
                        COSBase opening=doc.getDocumentCatalog().getCOSObject().getDictionaryObject(COSName.OPEN_ACTION);
                        if(opening!=null && !(opening instanceof COSArray) && !(opening instanceof COSString) && !(opening instanceof COSName))throw denied("email_pdf_active");
                        var queue=new ArrayDeque<COSBase>();var seen=Collections.newSetFromMap(new IdentityHashMap<COSBase,Boolean>());queue.add(doc.getDocumentCatalog().getCOSObject());int count=0;
                        var blocked=Set.of("JS","JavaScript","AA","EmbeddedFiles","EF","XFA","RichMediaContent","RichMediaSettings","AcroForm","Launch","SubmitForm","ImportData","GoToE","Rendition");
                        while(!queue.isEmpty()){var item=queue.removeFirst();if(!seen.add(item))continue;if(++count>20000)throw denied("email_pdf_complex");
                            if(item instanceof COSObject ref){if(ref.getObject()!=null)queue.add(ref.getObject());}
                            else if(item instanceof COSDictionary dictionary){for(var key:dictionary.keySet()){if(blocked.contains(key.getName()))throw denied(key.getName().equals("AcroForm")?"email_pdf_form":"email_pdf_active");var value=dictionary.getItem(key);if(value!=null){if(value instanceof COSName n&&blocked.contains(n.getName()))throw denied("email_pdf_active");queue.add(value);}}}
                            else if(item instanceof COSArray array)for(var value:array)if(value!=null)queue.add(value);
                        }
                    }
                }
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
    private static ResponseStatusException denied(){return denied("email_attachment_blocked");}
    private static ResponseStatusException denied(String code){return new ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY,code);}
}
