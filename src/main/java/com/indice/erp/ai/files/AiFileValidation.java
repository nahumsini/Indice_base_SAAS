package com.indice.erp.ai.files;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import static com.indice.erp.ai.files.AiFileContracts.*;

/** Closed passive document/image intake; no remote URL or executable formats. */
public final class AiFileValidation {
    private AiFileValidation() { }
    public static byte[] decode(StageRequest request) {
        if(request==null||request.purpose()==null||request.targetId()==null||request.targetId()<1)
            throw new IllegalArgumentException("File purpose and positive target required.");
        fileName(request.fileName()); key(request.idempotencyKey());
        if(request.contentBase64()==null||request.contentBase64().length()>13981016)
            throw new IllegalArgumentException("File content must be 10 MB or smaller.");
        byte[] bytes;
        try { bytes=Base64.getDecoder().decode(request.contentBase64()); }
        catch(IllegalArgumentException e) { throw new IllegalArgumentException("Valid base64 file content required."); }
        long maximum=request.purpose()==Purpose.asset_photo?2621440:request.purpose()==Purpose.employee_document?5242880:10485760;
        if(bytes.length==0||bytes.length>maximum)throw new IllegalArgumentException("File exceeds the domain size limit.");
        validateMime(request.mimeType(),bytes);
        if(AiCommerceFileOwnerService.supports(request.purpose())&&!Set.of("application/pdf","image/jpeg","image/png","image/webp").contains(request.mimeType()))throw new IllegalArgumentException("Commerce attachments require PDF, JPEG, PNG or WebP.");
        if(request.purpose()==Purpose.inventory_product_image&&!request.mimeType().startsWith("image/"))throw new IllegalArgumentException("Product photographs require an image.");
        if(request.purpose()==Purpose.asset_photo&&!request.mimeType().startsWith("image/"))throw new IllegalArgumentException("An image is required for an asset photo.");
        if(request.purpose()==Purpose.employee_document) {
            if(request.documentType()==null||!Set.of("proof_of_address","resume","profile_photo").contains(request.documentType()))
                throw new IllegalArgumentException("Supported employee document type required.");
            if(request.documentType().equals("profile_photo")&&!request.mimeType().startsWith("image/"))throw new IllegalArgumentException("Profile photos require an image.");
        } else if(request.documentType()!=null)throw new IllegalArgumentException("Document type is only valid for employee documents.");
        return bytes;
    }
    public static void validateMime(String mime,byte[] bytes) {
        boolean valid=switch(mime==null?"":mime) {
            case "application/pdf"->prefix(bytes,"%PDF-");
            case "image/jpeg"->bytes.length>=3&&(bytes[0]&255)==255&&(bytes[1]&255)==216&&(bytes[2]&255)==255;
            case "image/png"->bytes.length>=8&&Arrays.equals(Arrays.copyOf(bytes,8),new byte[]{(byte)137,80,78,71,13,10,26,10});
            case "image/webp"->bytes.length>=12&&prefix(bytes,"RIFF")&&new String(bytes,8,4,StandardCharsets.US_ASCII).equals("WEBP");
            case "image/gif"->prefix(bytes,"GIF87a")||prefix(bytes,"GIF89a");
            case "application/msword"->bytes.length>=8&&Arrays.equals(Arrays.copyOf(bytes,8),new byte[]{(byte)208,(byte)207,17,(byte)224,(byte)161,(byte)177,26,(byte)225});
            case "application/vnd.openxmlformats-officedocument.wordprocessingml.document"->docx(bytes);
            default->false;
        };
        if(!valid)throw new IllegalArgumentException("File content must match its supported document/image MIME type.");
    }
    public static String fileName(String value) {
        if(value==null||value.isBlank()||value.length()>180||value.chars().anyMatch(c->c<32||c==127)||value.contains("/")||value.contains("\\"))
            throw new IllegalArgumentException("A plain file name of 1 to 180 characters is required.");
        return value.trim();
    }
    public static void key(String value) {
        if(value==null||value.length()<8||value.length()>128||value.isBlank())throw new IllegalArgumentException("An idempotency key of 8 to 128 characters is required.");
    }
    public static String hash(String value) { return hash(value.getBytes(StandardCharsets.UTF_8)); }
    public static String hash(byte[] value) {
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value));}
        catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }
    private static boolean prefix(byte[] bytes,String prefix) {
        var expected=prefix.getBytes(StandardCharsets.US_ASCII);
        return bytes.length>=expected.length&&Arrays.equals(Arrays.copyOf(bytes,expected.length),expected);
    }
    private static boolean docx(byte[] bytes) {
        int entries=0,total=0;boolean contentTypes=false,document=false;
        try(var zip=new java.util.zip.ZipInputStream(new java.io.ByteArrayInputStream(bytes))) {
            java.util.zip.ZipEntry entry;byte[] buffer=new byte[8192];
            while((entry=zip.getNextEntry())!=null) {
                if(++entries>1000||entry.getName().contains("..")||entry.getName().startsWith("/"))return false;
                contentTypes|=entry.getName().equals("[Content_Types].xml");document|=entry.getName().equals("word/document.xml");
                int length;while((length=zip.read(buffer))!=-1){total+=length;if(total>20*1024*1024)return false;}
            }
            return contentTypes&&document;
        } catch(java.io.IOException e){return false;}
    }
}
