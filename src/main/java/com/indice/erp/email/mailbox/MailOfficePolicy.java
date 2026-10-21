package com.indice.erp.email.mailbox;

import java.io.ByteArrayInputStream;
import java.util.*;
import java.util.zip.ZipInputStream;
import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilderFactory;
import org.w3c.dom.Document;

/** Bounded OOXML downloads. No extraction, rendering, macros, embedded packages or external data. */
final class MailOfficePolicy {
    private MailOfficePolicy() { }
    static final Map<String,String> TYPES = Map.of(
        "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
    static void validate(String name, byte[] bytes) throws Exception {
        String extension=name.substring(name.lastIndexOf('.')+1).toLowerCase(Locale.ROOT);
        String main=switch(extension){case "docx"->"word/document.xml";case "xlsx"->"xl/workbook.xml";case "pptx"->"ppt/presentation.xml";default->throw new IllegalArgumentException();};
        String expected=switch(extension){case "docx"->"application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";case "xlsx"->"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml";default->"application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml";};
        Set<String> names=new HashSet<>(); byte[] contentTypes=null, mainXml=null; int total=0, count=0;
        try(var zip=new ZipInputStream(new ByteArrayInputStream(bytes))) {
            java.util.zip.ZipEntry entry;
            while((entry=zip.getNextEntry())!=null) {
                String path=entry.getName(), lower=path.toLowerCase(Locale.ROOT);
                if(++count>1000||!names.add(lower)||path.startsWith("/")||path.contains("\\")||Arrays.asList(path.split("/")).contains("..")
                    ||lower.contains("vbaproject")||lower.contains("activex")||lower.contains("embeddings/")||lower.contains("externallinks/")
                    ||lower.endsWith(".exe")||lower.endsWith(".bin")&&!lower.matches("(word|xl|ppt)/printersettings/printersettings[0-9]+\\.bin")||lower.endsWith(".html")||lower.endsWith(".js"))throw new IllegalArgumentException();
                byte[] data=zip.readNBytes(8*1024*1024+1); total+=data.length;
                if(data.length>8*1024*1024||total>32*1024*1024)throw new IllegalArgumentException();
                if(path.equals("[Content_Types].xml"))contentTypes=data;
                if(path.equals(main))mainXml=data;
                if(lower.endsWith(".rels")) {
                    var relationships=xml(data).getElementsByTagNameNS("*","Relationship");
                    for(int i=0;i<relationships.getLength();i++) {
                        var rel=(org.w3c.dom.Element)relationships.item(i);
                        String relationType=rel.getAttribute("Type").toLowerCase(Locale.ROOT);
                        if(List.of("vbaproject","oleobject","package","control","attachedtemplate","externallink").stream().anyMatch(relationType::endsWith))throw new IllegalArgumentException();
                        if("External".equalsIgnoreCase(rel.getAttribute("TargetMode"))
                            && !rel.getAttribute("Type").endsWith("/hyperlink"))throw new IllegalArgumentException();
                    }
                }
                // Word fields can invoke external data even without an external relationship.
                if(lower.startsWith("word/")&&lower.endsWith(".xml")) {
                    var document=xml(data);var content=new StringBuilder();
                    var instructions=document.getElementsByTagNameNS("*","instrText");for(int i=0;i<instructions.getLength();i++)content.append(" ").append(instructions.item(i).getTextContent());
                    var elements=document.getElementsByTagNameNS("*","*");for(int i=0;i<elements.getLength();i++){var attributes=elements.item(i).getAttributes();for(int j=0;j<attributes.getLength();j++)if("instr".equals(attributes.item(j).getLocalName()))content.append(" ").append(attributes.item(j).getNodeValue());}
                    String text=content.toString().toUpperCase(Locale.ROOT);
                    if(text.contains("DDEAUTO")||text.matches("(?s).*\\bDDE\\s+.*"))throw new IllegalArgumentException();
                }
            }
        }
        if(contentTypes==null||mainXml==null)throw new IllegalArgumentException();
        var declarations=xml(contentTypes).getElementsByTagNameNS("*","*"); boolean match=false;
        for(int i=0;i<declarations.getLength();i++) {
            var item=(org.w3c.dom.Element)declarations.item(i);String type=item.getAttribute("ContentType");
            if(type.toLowerCase(Locale.ROOT).contains("macroenabled")||type.toLowerCase(Locale.ROOT).contains("vbaproject")||type.toLowerCase(Locale.ROOT).contains("oleobject"))throw new IllegalArgumentException();
            if(item.getAttribute("PartName").equals("/"+main)&&type.equals(expected))match=true;
        }
        String root=xml(mainXml).getDocumentElement().getLocalName();
        if(!match||!root.equals(switch(extension){case "docx"->"document";case "xlsx"->"workbook";default->"presentation";}))throw new IllegalArgumentException();
    }
    private static Document xml(byte[] data) throws Exception {
        var factory=DocumentBuilderFactory.newInstance();factory.setNamespaceAware(true);
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING,true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl",true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities",false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities",false);
        factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_DTD,"");factory.setAttribute(XMLConstants.ACCESS_EXTERNAL_SCHEMA,"");
        factory.setXIncludeAware(false);factory.setExpandEntityReferences(false);
        var builder=factory.newDocumentBuilder();builder.setErrorHandler(new org.xml.sax.helpers.DefaultHandler(){
            @Override public void fatalError(org.xml.sax.SAXParseException e) throws org.xml.sax.SAXException {throw e;}
        });
        return builder.parse(new ByteArrayInputStream(data));
    }
}
