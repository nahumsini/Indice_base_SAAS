package com.indice.erp.email.mailbox;

import java.io.*;
import java.util.Set;
import javax.swing.text.html.*;
import javax.swing.text.html.parser.ParserDelegator;

/** Rebuild a formatting-only document. No source attributes, URLs, CSS, images or active elements survive. */
public final class SafeMailHtml {
    private SafeMailHtml() { }
    private static final Set<String> TAGS=Set.of("p","br","div","span","b","strong","i","em","u","s","blockquote","pre","code","ul","ol","li","h1","h2","h3","h4","table","tbody","tr","td","th","hr");
    public static String clean(String input) {
        if(input==null||input.isBlank())return null;
        if(input.length()>100_000)input=input.substring(0,100_000);
        var out=new StringBuilder();
        try{new ParserDelegator().parse(new StringReader(MailContent.withoutHiddenBlocks(input)),new HTMLEditorKit.ParserCallback(){
            @Override public void handleStartTag(HTML.Tag t,javax.swing.text.MutableAttributeSet a,int p){if(TAGS.contains(t.toString()))out.append('<').append(t).append('>');}
            @Override public void handleEndTag(HTML.Tag t,int p){if(TAGS.contains(t.toString()))out.append("</").append(t).append('>');}
            @Override public void handleSimpleTag(HTML.Tag t,javax.swing.text.MutableAttributeSet a,int p){if(TAGS.contains(t.toString()))out.append('<').append(t).append('>');}
            @Override public void handleText(char[] value,int p){out.append(escape(new String(value)));}
        },true);}catch(IOException e){throw new IllegalStateException("email_html_invalid");}
        return out.toString();
    }
    public static String escape(String text){return text.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;").replace("'","&#39;");}
}
