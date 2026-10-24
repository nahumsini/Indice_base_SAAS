package com.indice.erp.files;
import java.util.*;
import java.nio.*;
import java.nio.charset.*;
import static com.indice.erp.files.FileAccess.*;
import static org.springframework.http.HttpStatus.*;
/** Unknown formats remain opaque attachments. Only verified passive media can render inline. */
public final class FilePolicy {
 public static final long MAX_BYTES=100L*1024*1024;
 private static final Map<String,String> TYPES=Map.ofEntries(Map.entry("png","image/png"),Map.entry("jpg","image/jpeg"),Map.entry("jpeg","image/jpeg"),Map.entry("gif","image/gif"),Map.entry("webp","image/webp"),Map.entry("mp4","video/mp4"),Map.entry("webm","video/webm"),Map.entry("mp3","audio/mpeg"),Map.entry("m4a","audio/mp4"),Map.entry("wav","audio/wav"),Map.entry("ogg","audio/ogg"),Map.entry("txt","text/plain"),Map.entry("csv","text/csv"),Map.entry("pdf","application/pdf"),Map.entry("docx","application/vnd.openxmlformats-officedocument.wordprocessingml.document"),Map.entry("xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),Map.entry("pptx","application/vnd.openxmlformats-officedocument.presentationml.presentation"));
 public static String contentType(String name){int dot=name.lastIndexOf('.');return TYPES.getOrDefault(dot<0?"":name.substring(dot+1).toLowerCase(Locale.ROOT),"application/octet-stream");}
 public static String category(String kind,String type){if(kind.equals("FOLDER"))return "FOLDER";if(type.startsWith("image/"))return "IMAGE";if(type.startsWith("video/"))return "VIDEO";if(type.startsWith("audio/"))return "AUDIO";if(type.startsWith("text/"))return "TEXT";return "DOCUMENT";}
 public static boolean inline(String type){return type.startsWith("image/")||type.startsWith("video/")||type.startsWith("audio/")||type.startsWith("text/");}
 private static boolean at(byte[] b,int offset,int... signature){if(b.length<offset+signature.length)return false;for(int i=0;i<signature.length;i++)if((b[offset+i]&255)!=signature[i])return false;return true;}
 private static boolean ascii(byte[] b,int offset,String text){return at(b,offset,text.chars().toArray());}
 public static void validate(String type,byte[] b){
  require(b!=null&&b.length>0,BAD_REQUEST,"files_content_invalid");boolean valid=switch(type){
   case "image/png"->at(b,0,137,80,78,71,13,10,26,10);
   case "image/jpeg"->at(b,0,255,216,255);
   case "image/gif"->ascii(b,0,"GIF87a")||ascii(b,0,"GIF89a");
   case "image/webp"->ascii(b,0,"RIFF")&&ascii(b,8,"WEBP");
   case "video/mp4","audio/mp4"->ascii(b,4,"ftyp");
   case "video/webm"->at(b,0,26,69,223,163);
   case "audio/mpeg"->ascii(b,0,"ID3")||b.length>1&&(b[0]&255)==255&&(b[1]&224)==224;
   case "audio/wav"->ascii(b,0,"RIFF")&&ascii(b,8,"WAVE");
   case "audio/ogg"->ascii(b,0,"OggS");
   case "application/pdf"->ascii(b,0,"%PDF-");
   case "text/plain","text/csv"->utf8(b);
   default->true;
  };require(valid,BAD_REQUEST,"files_content_invalid");
 }
 private static boolean utf8(byte[] b){try{for(byte value:b)if(value==0)return false;var decoder=StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT);return !decoder.decode(ByteBuffer.wrap(b),CharBuffer.allocate(b.length),false).isError();}catch(RuntimeException e){return false;}}
}
