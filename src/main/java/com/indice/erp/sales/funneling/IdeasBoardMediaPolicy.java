package com.indice.erp.sales.funneling;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Bounded inert media in private personal boards; no HTML, SVG or remote URLs. */
public final class IdeasBoardMediaPolicy {
    public static final int MAX_BYTES=25*1024*1024;
    private IdeasBoardMediaPolicy() {}
    public static int limit(String mime) {return switch(mime==null?"":mime){case "video/mp4","video/webm"->MAX_BYTES;case "audio/mpeg","audio/mp4","audio/wav","audio/ogg"->10*1024*1024;case "image/png","image/jpeg","image/webp"->5*1024*1024;default->0;};}
    public static boolean matchesKind(String kind,String mime){return switch(kind){case "IMAGE"->mime.startsWith("image/");case "VIDEO"->mime.startsWith("video/");case "AUDIO"->mime.startsWith("audio/");default->false;};}
    public static boolean valid(String name,String mime,byte[] b){
        if(name==null||mime==null||b==null||b.length==0||b.length>limit(mime))return false;
        String ext=name.substring(name.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);
        boolean extension=switch(mime){case "image/png"->ext.equals("png");case "image/jpeg"->Set.of("jpg","jpeg").contains(ext);case "image/webp"->ext.equals("webp");case "video/mp4"->ext.equals("mp4");case "video/webm"->ext.equals("webm");case "audio/mpeg"->ext.equals("mp3");case "audio/mp4"->ext.equals("m4a");case "audio/wav"->ext.equals("wav");case "audio/ogg"->ext.equals("ogg");default->false;};
        if(!extension)return false;
        return switch(mime){case "image/png","image/jpeg","image/webp"->IdeasBoardService.signature(mime,b);case "video/mp4","audio/mp4"->mp4(b,mime.startsWith("video/"));case "video/webm"->b.length>40&&u(b,0)==0x1a&&u(b,1)==0x45&&u(b,2)==0xdf&&u(b,3)==0xa3&&ascii(b,Math.min(b.length,4096)).contains("webm");case "audio/ogg"->b.length>36&&ascii(b,4).equals("OggS")&&b[4]==0&&(ascii(b,Math.min(b.length,512)).contains("OpusHead")||ascii(b,Math.min(b.length,512)).contains("vorbis"));case "audio/wav"->wav(b);case "audio/mpeg"->mp3(b);default->false;};
    }
    private static int u(byte[] b,int at){return b[at]&255;}
    private static String ascii(byte[] b,int length){return new String(b,0,length,StandardCharsets.ISO_8859_1);}
    private static long uint(byte[] b,int at,ByteOrder order){return Integer.toUnsignedLong(ByteBuffer.wrap(b,at,4).order(order).getInt());}
    private static boolean wav(byte[] b){
        if(b.length<44||!new String(b,0,4,StandardCharsets.US_ASCII).equals("RIFF")||!new String(b,8,4,StandardCharsets.US_ASCII).equals("WAVE")||uint(b,4,ByteOrder.LITTLE_ENDIAN)+8!=b.length)return false;
        boolean format=false,data=false;for(int p=12;p+8<=b.length;){String id=new String(b,p,4,StandardCharsets.US_ASCII);long length=uint(b,p+4,ByteOrder.LITTLE_ENDIAN);if(length>b.length-p-8)return false;if(id.equals("fmt ")){if(length<16)return false;format=true;}if(id.equals("data")&&length>0)data=true;p+=(int)(8+length+(length%2));}return format&&data;
    }
    private static boolean mp3(byte[] b){
        int p=0;if(b.length>=10&&ascii(b,3).equals("ID3")){for(int i=6;i<10;i++)if(u(b,i)>127)return false;p=10+(u(b,6)<<21)+(u(b,7)<<14)+(u(b,8)<<7)+u(b,9);}
        for(int i=p;i+4<b.length&&i<p+4096;i++)if(u(b,i)==255&&(u(b,i+1)&0xe0)==0xe0&&(u(b,i+1)&6)!=0&&(u(b,i+2)&0xf0)!=0&&(u(b,i+2)&0xf0)!=0xf0&&(u(b,i+2)&12)!=12)return true;return false;
    }
    private record Box(int payload,int end,String type) {}
    private static Box box(byte[] b,int p,int end){
        if(end-p<8)return null;long size=uint(b,p,ByteOrder.BIG_ENDIAN);int header=8;
        if(size==1){if(end-p<16)return null;size=ByteBuffer.wrap(b,p+8,8).getLong();header=16;}
        else if(size==0)size=end-p;
        if(size<header||size>end-p)return null;
        return new Box(p+header,p+(int)size,new String(b,p+4,4,StandardCharsets.US_ASCII));
    }
    private static boolean mp4(byte[] b,boolean video){
        if(b.length<48)return false;boolean ftyp=false,moov=false,mdat=false;Set<String> handlers=new HashSet<>();
        for(int p=0;p<b.length;){Box box=box(b,p,b.length);if(box==null)return false;
            if(box.type().equals("ftyp")){if(box.end()-box.payload()<8||box.end()-box.payload()>4096)return false;ftyp=true;}
            if(box.type().equals("moov")){moov=true;if(!handlers(b,box.payload(),box.end(),0,handlers))return false;}
            if(box.type().equals("mdat")&&box.end()>box.payload())mdat=true;p=box.end();
        }
        return ftyp&&moov&&mdat&&(video?handlers.contains("vide"):handlers.contains("soun")&&!handlers.contains("vide"));
    }
    private static boolean handlers(byte[] b,int start,int end,int depth,Set<String> result){
        if(depth>6)return false;for(int p=start;p<end;){Box box=box(b,p,end);if(box==null)return false;if(box.type().equals("hdlr")&&box.end()-box.payload()>=12)result.add(new String(b,box.payload()+8,4,StandardCharsets.US_ASCII));if(Set.of("trak","mdia").contains(box.type())&&!handlers(b,box.payload(),box.end(),depth+1,result))return false;p=box.end();}return true;
    }
}
