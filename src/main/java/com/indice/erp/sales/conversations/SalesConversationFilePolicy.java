package com.indice.erp.sales.conversations;

import static com.indice.erp.sales.conversations.SalesConversationAccess.require;
import static org.springframework.http.HttpStatus.*;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;
import javax.imageio.ImageIO;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.cos.*;

/** Bounded signature/container checks, not antivirus certification. V1 only JPEG/PNG/PDF. */
public final class SalesConversationFilePolicy {
    private SalesConversationFilePolicy(){ }
    public static int max(String mime){return switch(mime){case "image/jpeg","image/png"->4*1024*1024;case "application/pdf"->8*1024*1024;default->0;};}
    public static void metadata(String name,String mime,long size){
        require(name!=null&&mime!=null,UNPROCESSABLE_ENTITY,"conversation_file_rejected");
        boolean suffix=switch(mime){case "image/jpeg"->name.endsWith(".jpg")||name.endsWith(".jpeg");case "image/png"->name.endsWith(".png");case "application/pdf"->name.endsWith(".pdf");default->false;};
        require(name.length()<=180&&!name.matches(".*[\\r\\n\\x00/\\\\].*")&&suffix&&size>0&&size<=max(mime),UNPROCESSABLE_ENTITY,"conversation_file_rejected");
    }
    public static void verify(String name,String mime,byte[] bytes){metadata(name.toLowerCase(Locale.ROOT),mime,bytes.length);
        try{
            if(mime.startsWith("image/")){
                boolean signature=mime.equals("image/png")?bytes.length>=8&&Arrays.equals(Arrays.copyOf(bytes,8),new byte[]{(byte)137,80,78,71,13,10,26,10}):bytes.length>=3&&bytes[0]==(byte)255&&bytes[1]==(byte)216&&bytes[2]==(byte)255;
                require(signature,UNPROCESSABLE_ENTITY,"conversation_file_rejected");
                try(var stream=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))){var readers=ImageIO.getImageReaders(stream);require(readers.hasNext(),UNPROCESSABLE_ENTITY,"conversation_file_rejected");var reader=readers.next();try{reader.setInput(stream);require((long)reader.getWidth(0)*reader.getHeight(0)<=20_000_000,UNPROCESSABLE_ENTITY,"conversation_file_rejected");}finally{reader.dispose();}}
            }else{
                require(bytes.length>=5&&new String(bytes,0,5,StandardCharsets.US_ASCII).equals("%PDF-"),UNPROCESSABLE_ENTITY,"conversation_file_rejected");
                try(var document=Loader.loadPDF(bytes)){require(!document.isEncrypted()&&document.getNumberOfPages()<=200,UNPROCESSABLE_ENTITY,"conversation_pdf_rejected");
                    var queue=new ArrayDeque<COSBase>();var seen=Collections.newSetFromMap(new IdentityHashMap<COSBase,Boolean>());queue.add(document.getDocumentCatalog().getCOSObject());int count=0;
                    var blocked=Set.of("JS","JavaScript","AA","EmbeddedFiles","EF","XFA","RichMediaContent","AcroForm","Launch","SubmitForm","ImportData","GoToE","Rendition");
                    while(!queue.isEmpty()){var item=queue.remove();if(!seen.add(item))continue;require(++count<=20000,UNPROCESSABLE_ENTITY,"conversation_pdf_rejected");
                        if(item instanceof COSObject reference){if(reference.getObject()!=null)queue.add(reference.getObject());}
                        else if(item instanceof COSDictionary dictionary)for(var key:dictionary.keySet()){require(!blocked.contains(key.getName()),UNPROCESSABLE_ENTITY,"conversation_pdf_rejected");var value=dictionary.getItem(key);if(value!=null){require(!(value instanceof COSName n&&blocked.contains(n.getName())),UNPROCESSABLE_ENTITY,"conversation_pdf_rejected");queue.add(value);}}
                        else if(item instanceof COSArray array)for(var value:array)if(value!=null)queue.add(value);
                    }
                }
            }
        }catch(org.springframework.web.server.ResponseStatusException e){throw e;}catch(Exception e){throw new org.springframework.web.server.ResponseStatusException(UNPROCESSABLE_ENTITY,"conversation_file_rejected");}
    }
}
