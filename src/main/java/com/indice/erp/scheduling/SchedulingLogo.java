package com.indice.erp.scheduling;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import javax.imageio.ImageIO;

/** Bounded inline brand mark only. Other public/private files use the object-storage owner. */
final class SchedulingLogo {
    static final int MAX_BYTES=128*1024;
    private static final String PREFIX="data:image/png;base64,";
    private SchedulingLogo() { }
    static String normalize(String value) {
        if(value==null||value.isBlank())return null;
        if(value.length()>175000||!value.startsWith(PREFIX))throw new IllegalArgumentException("scheduling_logo_invalid");
        try {
            byte[] source=Base64.getDecoder().decode(value.substring(PREFIX.length()));
            if(source.length==0||source.length>MAX_BYTES)throw new IllegalArgumentException("scheduling_logo_invalid");
            try(var input=ImageIO.createImageInputStream(new ByteArrayInputStream(source))) {
                var readers=ImageIO.getImageReaders(input);
                if(!readers.hasNext())throw new IllegalArgumentException("scheduling_logo_invalid");
                var reader=readers.next();
                try {
                    reader.setInput(input,true,true);
                    if(!"png".equalsIgnoreCase(reader.getFormatName())||reader.getWidth(0)<1||reader.getHeight(0)<1||reader.getWidth(0)>512||reader.getHeight(0)>512)
                        throw new IllegalArgumentException("scheduling_logo_invalid");
                    var decoded=reader.read(0);
                    if(decoded==null)throw new IllegalArgumentException("scheduling_logo_invalid");
                    // Copy pixels only; metadata, appended bytes and alternate frames never survive.
                    var clean=new BufferedImage(decoded.getWidth(),decoded.getHeight(),BufferedImage.TYPE_INT_ARGB);
                    clean.setRGB(0,0,decoded.getWidth(),decoded.getHeight(),decoded.getRGB(0,0,decoded.getWidth(),decoded.getHeight(),null,0,decoded.getWidth()),0,decoded.getWidth());
                    var output=new ByteArrayOutputStream();ImageIO.write(clean,"png",output);
                    if(output.size()>MAX_BYTES)throw new IllegalArgumentException("scheduling_logo_invalid");
                    return PREFIX+Base64.getEncoder().encodeToString(output.toByteArray());
                } finally {reader.dispose();}
            }
        } catch(java.io.IOException|IllegalArgumentException ex) {throw new IllegalArgumentException("scheduling_logo_invalid");}
    }
}
