package com.indice.erp.email.mailbox;

import java.io.*;
import java.net.URI;
import java.util.*;
import javax.swing.text.MutableAttributeSet;
import javax.swing.text.html.*;
import javax.swing.text.html.parser.ParserDelegator;

/** Email-owned format contract shared by private drafts and Sales templates.
 * Rebuild only bounded formatting, explicit links and validated embedded raster images.
 * Remote images, arbitrary CSS, scripts, forms and source attributes never survive. */
public final class SafeMailHtml {
    private SafeMailHtml() { }
    public static final int MAX_HTML=500_000;
    private static final Set<String> TAGS=Set.of("p","br","div","span","b","strong","i","em","u","s","blockquote","pre","code","ul","ol","li","h1","h2","h3","h4","table","tbody","tr","td","th","hr","a","font");
    public static String clean(String input) {
        return clean(input, Map.of());
    }
    // Only the MIME reader supplies validated resources from this related body.
    static String clean(String input, Map<String,String> relatedImages) {
        if(input==null||input.isBlank())return null;
        if(input.length()>MAX_HTML)throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"email_html_too_long");
        var out=new StringBuilder();
        try{new ParserDelegator().parse(new StringReader(MailContent.withoutHiddenBlocks(input)),new HTMLEditorKit.ParserCallback(){
            int images;
            private void start(HTML.Tag t,MutableAttributeSet a){
                String tag=t.toString();
                if(tag.equals("img")){
                    String src=attr(a,"src");
                    if(src.regionMatches(true,0,"cid:",0,4))src=relatedImages.getOrDefault(src.substring(4),"");
                    if(images<3&&validImage(src)){images++;out.append("<img src=\"").append(escape(src)).append("\" alt=\"").append(escape(attr(a,"alt").substring(0,Math.min(180,attr(a,"alt").length())))).append("\" style=\"max-width:100%;height:auto\">");}
                    return;
                }
                if(!TAGS.contains(tag))return;
                out.append('<').append(tag.equals("font")?"span":tag);
                if(tag.equals("a")){String href=attr(a,"href");if(validLink(href))out.append(" href=\"").append(escape(href)).append("\" rel=\"noopener noreferrer\" target=\"_blank\"");}
                String source=attr(a,"style");
                if(tag.equals("font")){source+=";font-family:"+attr(a,"face")+";color:"+attr(a,"color");String size=attr(a,"size");if(size.matches("[1-7]"))source+=";font-size:"+new int[]{0,10,13,16,18,24,32,40}[Integer.parseInt(size)]+"px";}
                String style=styles(source);if(!style.isEmpty())out.append(" style=\"").append(escape(style)).append('"');
                out.append('>');
            }
            @Override public void handleStartTag(HTML.Tag t,MutableAttributeSet a,int p){start(t,a);}
            @Override public void handleEndTag(HTML.Tag t,int p){if(TAGS.contains(t.toString()))out.append("</").append(t.toString().equals("font")?"span":t).append('>');}
            @Override public void handleSimpleTag(HTML.Tag t,MutableAttributeSet a,int p){start(t,a);}
            @Override public void handleText(char[] value,int p){out.append(escape(new String(value)));}
        },true);}catch(IOException e){throw new IllegalStateException("email_html_invalid");}
        if(out.length()>MAX_HTML)throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,"email_html_too_long");
        return out.toString();
    }
    private static String attr(MutableAttributeSet attrs,String key){for(var keys=attrs.getAttributeNames();keys.hasMoreElements();){var k=keys.nextElement();if(k.toString().equalsIgnoreCase(key))return Objects.toString(attrs.getAttribute(k),"");}return "";}
    static String styles(String source){
        var values=new LinkedHashMap<String,String>();
        for(String declaration:source.split(";")){var pair=declaration.trim().split(":",2);if(pair.length!=2)continue;String key=pair[0].trim().toLowerCase(Locale.ROOT),value=pair[1].trim().toLowerCase(Locale.ROOT).replace("\"","").replace("'","");
            boolean allowed=switch(key){
                case "color","background-color"->value.matches("#[0-9a-f]{3}(?:[0-9a-f]{3})?|rgb\\(\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*\\)|black|white|red|blue|green|transparent");
                case "font-family"->Set.of("arial","georgia","verdana","tahoma","times new roman","courier new","system-ui").contains(value);
                case "font-size"->value.matches("(?:10|12|13|14|16|18|20|24|28|32|36|40)px");
                case "font-weight"->Set.of("normal","bold","400","700").contains(value);
                case "font-style"->Set.of("normal","italic").contains(value);
                case "text-decoration","text-decoration-line"->Set.of("none","underline","line-through").contains(value);
                case "text-align"->Set.of("left","center","right","justify").contains(value);
                default->false;
            };if(allowed)values.put(key,value);
        }return String.join(";",values.entrySet().stream().map(e->e.getKey()+":"+e.getValue()).toList());
    }
    public static boolean validLink(String value){
        if(value==null||value.length()>2000||value.matches("(?s).*[\\x00-\\x20\\x7f<>].*"))return false;
        try{var uri=URI.create(value);String scheme=Objects.toString(uri.getScheme(),"").toLowerCase(Locale.ROOT);return Set.of("https","http").contains(scheme)?uri.getHost()!=null&&uri.getUserInfo()==null:scheme.equals("mailto")&&value.substring(7).matches("[^?\\s@]+@[^?\\s@]+\\.[^?\\s@]+");}catch(IllegalArgumentException e){return false;}
    }
    static boolean validImage(String value){
        if(value==null||value.length()>140000||!value.matches("data:image/(?:png|jpeg);base64,[A-Za-z0-9+/=]+"))return false;
        try{byte[] bytes=Base64.getDecoder().decode(value.substring(value.indexOf(',')+1));if(bytes.length>102400)return false;
            String type=value.startsWith("data:image/png;")?"image/png":"image/jpeg";
            MailFilePolicy.bytes(type.equals("image/png")?"inline.png":"inline.jpg",type,bytes);return true;
        }catch(Exception e){return false;}
    }
    public static String escape(String text){return text.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;").replace("'","&#39;");}
}
