package com.indice.erp.storage;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.apache.pdfbox.pdmodel.*;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.*;
/** Passive formatting with the existing PDFBox dependency; owners supply the authorized rows. */
public final class OperationalReportFormatter {
    private OperationalReportFormatter(){}
    public static byte[] csv(List<String> columns,List<List<String>> rows){
        var out=new StringBuilder();out.append(String.join(",",columns)).append('\n');
        for(var row:rows){for(int i=0;i<row.size();i++){if(i>0)out.append(',');String value=row.get(i);if(!value.isEmpty()&&"=+-@".indexOf(value.stripLeading().isEmpty()?' ':value.stripLeading().charAt(0))>=0)value="'"+value;out.append('"').append(value.replace("\"","\"\"")).append('"');}out.append('\n');}
        return out.toString().getBytes(StandardCharsets.UTF_8);
    }
    public static byte[] pdf(String title,List<String> columns,List<List<String>> rows){
        try(var doc=new PDDocument();var out=new ByteArrayOutputStream()){
            var font=new PDType1Font(Standard14Fonts.FontName.HELVETICA);PDPageContentStream content=null;float y=0;float width=732f/columns.size();
            try {for(int index=-1;index<rows.size();index++){
                var values=index<0?columns:rows.get(index);var lines=values.stream().map(v->wrap(safe(v),Math.max(8,(int)(width/4.5f)))).toList();int height=lines.stream().mapToInt(List::size).max().orElse(1)*11+5;
                if(height>490)throw new IllegalArgumentException("A report cell is too large for PDF. Use CSV.");
                if(content==null||y-height<30){if(content!=null)content.close();var page=new PDPage(new PDRectangle(792,612));doc.addPage(page);content=new PDPageContentStream(doc,page);text(content,font,title+" | records: "+rows.size(),30,580,11);y=558;
                    if(index>=0){for(int c=0;c<columns.size();c++)text(content,font,safe(columns.get(c)),30+c*width,y,7);y-=18;}}
                for(int c=0;c<lines.size();c++)for(int line=0;line<lines.get(c).size();line++)text(content,font,lines.get(c).get(line),30+c*width,y-line*11,7);
                y-=height;
            }}finally{if(content!=null)content.close();}doc.save(out);return out.toByteArray();
        }catch(IOException e){throw new IllegalStateException("Commerce PDF export unavailable.",e);}
    }
    private static void text(PDPageContentStream s,PDType1Font f,String value,float x,float y,int size)throws IOException{s.beginText();s.setFont(f,size);s.newLineAtOffset(x,y);s.showText(value);s.endText();}
    private static String safe(String s){return s.codePoints().collect(StringBuilder::new,(b,c)->b.append(c>=32&&c<=255&&(c<127||c>=160)?(char)c:'?'),StringBuilder::append).toString();}
    private static List<String> wrap(String s,int width){if(s.isEmpty())return List.of("");var out=new ArrayList<String>();for(int i=0;i<s.length();i+=width)out.add(s.substring(i,Math.min(s.length(),i+width)));return out;}
}
