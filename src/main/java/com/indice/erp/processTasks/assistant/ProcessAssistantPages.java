package com.indice.erp.processTasks.assistant;

import static com.indice.erp.processTasks.assistant.ProcessAssistantContracts.*;
import com.indice.erp.auth.AuthSessionUser;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

final class ProcessAssistantPages {
    private ProcessAssistantPages() { }
    record Window(int page, int limit, String binding) {
        int offset() { return (page-1)*limit; }
        <T> Page<T> result(List<T> items,long total) {
            boolean more=(long)page*limit<total;
            String next=more?Base64.getUrlEncoder().withoutPadding().encodeToString((binding+":"+(page+1)).getBytes(StandardCharsets.UTF_8)):null;
            return new Page<>(List.copyOf(items),items.size(),total,more,more?page+1:null,next);
        }
        <T> Page<T> slice(List<T> items) { return result(items.stream().skip(offset()).limit(limit).toList(),items.size()); }
    }
    static Window window(AuthSessionUser user,String tool,PageRequest request) {
        int limit=request==null||request.limit()==null?25:request.limit();
        int page=request==null||request.page()==null?1:request.page();
        if(limit<1||limit>100||page<1)throw new IllegalArgumentException("Positive page and limit 1–100 required.");
        String binding=ProcessAssistantService.hash(user.companyId()+":"+user.userCompanyId()+":"+tool+":"+limit+":"+requestFilters(request));
        if(request!=null&&request.cursor()!=null){
            if(request.page()!=null||request.cursor().length()>256)throw new IllegalArgumentException("Invalid continuation.");
            try{var parts=new String(Base64.getUrlDecoder().decode(request.cursor()),StandardCharsets.UTF_8).split(":");
                if(parts.length!=2||!parts[0].equals(binding))throw new IllegalArgumentException(); page=Integer.parseInt(parts[1]);
            }catch(IllegalArgumentException error){throw new IllegalArgumentException("Continuation does not match this query.");}
        }
        if(page<1||(long)page*limit>Integer.MAX_VALUE)throw new IllegalArgumentException("Invalid page.");
        return new Window(page,limit,binding);
    }
    private static String requestFilters(PageRequest p){ return p==null?"":field(p.query())+field(p.status())+field(p.unitId())+field(p.businessId()); }
    private static String field(Object value){var s=value==null?"":value.toString();return s.length()+":"+s;}
}
