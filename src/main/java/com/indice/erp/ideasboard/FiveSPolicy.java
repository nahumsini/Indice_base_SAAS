package com.indice.erp.ideasboard;

import com.indice.erp.sales.funneling.IdeasBoardContracts.*;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Personal 5S data only; evidence follows the same private owner/asset boundary as photos. */
public final class FiveSPolicy {
    private FiveSPolicy() {}
    public static void validate(Node n) {
        var f=n.fiveS();if(f==null)return;
        boolean valid="TEXT".equals(n.kind())&&n.catalog()==null&&n.drawing()==null&&!n.text().isBlank();
        try{valid=valid&&UUID.fromString(f.templateId()).toString().equals(f.templateId());}catch(RuntimeException e){valid=false;}
        if("ACTION".equals(f.role()))valid=valid&&f.status()!=null&&n.text().length()<=180&&f.action()!=null&&!f.action().isBlank()&&(!"VERIFIED".equals(f.status())||(f.result()!=null&&!f.result().isBlank()));
        else valid=valid&&evidence(n).isEmpty();
        if(!valid)throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"ideas_board_invalid");
    }
    public static List<String> evidence(Node n){var f=n.fiveS();if(f==null)return List.of();return java.util.stream.Stream.of(f.beforeAssetId(),f.afterAssetId()).filter(Objects::nonNull).distinct().toList();}
    public static List<String> assets(Node n){return java.util.stream.Stream.concat(java.util.stream.Stream.of(n.assetId()).filter(Objects::nonNull),evidence(n).stream()).distinct().toList();}
    public static FiveS remap(FiveS f,Map<String,String> assets){if(f==null)return null;return new FiveS(f.templateId(),f.role(),f.section(),f.area(),f.action(),f.owner(),f.dueDate(),f.status(),f.details(),f.result(),f.reviewDate(),map(f.beforeAssetId(),assets),map(f.afterAssetId(),assets));}
    private static String map(String id,Map<String,String> assets){return id==null?null:assets.getOrDefault(id,id);}
}
