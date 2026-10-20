package com.indice.erp.messaging;

import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Map;
import java.util.zip.ZipInputStream;
import java.io.ByteArrayInputStream;

/** Bounded format verification, not an antivirus scanner. Never render documents as HTML. */
final class MessagingFileRules {
    private MessagingFileRules() { }
    static final Map<String,String> TYPES=Map.of(
        "jpg","image/jpeg", "jpeg","image/jpeg", "png","image/png", "webp","image/webp",
        "pdf","application/pdf", "doc","application/msword", "xls","application/vnd.ms-excel",
        "docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    static boolean accepts(String name,String type) {
        int dot=name.lastIndexOf('.');
        return dot>=0 && type.equals(TYPES.get(name.substring(dot+1).toLowerCase(Locale.ROOT)));
    }
    static boolean matches(String type,byte[] bytes) {
        if(type.startsWith("image/")) return MessagingAttachmentService.isImage(type,bytes);
        if(bytes==null) return false;
        if(type.equals("application/pdf")) return bytes.length>=5 && new String(bytes,0,5,StandardCharsets.US_ASCII).equals("%PDF-");
        if(type.equals("application/msword") || type.equals("application/vnd.ms-excel"))
            return bytes.length>=8 && java.util.Arrays.equals(java.util.Arrays.copyOf(bytes,8),new byte[]{(byte)0xd0,(byte)0xcf,0x11,(byte)0xe0,(byte)0xa1,(byte)0xb1,0x1a,(byte)0xe1});
        if(!TYPES.containsValue(type)) return false;
        boolean contentTypes=false, document=false;
        String expected=type.endsWith("wordprocessingml.document") ? "word/document.xml" : "xl/workbook.xml";
        try(var zip=new ZipInputStream(new ByteArrayInputStream(bytes))) {
            int count=0; long total=0; byte[] buffer=new byte[8192];
            for(var entry=zip.getNextEntry();entry!=null;entry=zip.getNextEntry()) {
                if(++count>512 || entry.getName().toLowerCase(Locale.ROOT).contains("vbaproject")) return false;
                contentTypes|=entry.getName().equals("[Content_Types].xml"); document|=entry.getName().equals(expected);
                int read; while((read=zip.read(buffer))!=-1) { total+=read; if(total>32L*1024*1024) return false; }
            }
            return contentTypes && document;
        } catch(java.io.IOException malformed) { return false; }
    }
}
