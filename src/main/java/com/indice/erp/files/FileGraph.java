package com.indice.erp.files;
import java.util.*;
import com.indice.erp.auth.AuthSessionUser;
import static com.indice.erp.files.FileAccess.*;
import static com.indice.erp.files.FileContracts.*;
import static org.springframework.http.HttpStatus.*;
/** One bounded tenant metadata graph per operation; no hidden ancestor names leave the owner. */
final class FileGraph {
 final Map<String,FileRepository.Row> rows;final List<FileRepository.Permission> grants;final AuthSessionUser actor;final Map<String,List<FileRepository.Permission>> byEntry=new HashMap<>();final Map<String,Integer> levels=new HashMap<>();
 FileGraph(FileRepository repo,AuthSessionUser actor){this.actor=actor;rows=repo.rows(actor.companyId());grants=repo.grants(actor.companyId());grants.forEach(p->byEntry.computeIfAbsent(p.entry(),k->new ArrayList<>()).add(p));require(rows.size()<=5000,UNPROCESSABLE_ENTITY,"files_entry_limit");}
 FileRepository.Row row(String id){uuid(id);var r=rows.get(id);require(r!=null,NOT_FOUND,"files_not_found");return r;}
 List<FileRepository.Row> chain(String id){var result=new ArrayList<FileRepository.Row>();var seen=new HashSet<String>();while(id!=null){require(seen.add(id)&&seen.size()<=20,CONFLICT,"files_invalid_hierarchy");var r=row(id);result.add(r);id=r.parent();}return result;}
 Map<Long,Integer> effective(String id){var result=new HashMap<Long,Integer>();for(var r:chain(id)){result.merge(r.owner(),3,Math::max);byEntry.getOrDefault(r.id(),List.of()).forEach(g->result.merge(g.user(),g.level(),Math::max));}return result;}
 int level(String id){return levels.computeIfAbsent(id,k->{int level=0;for(var row:chain(k)){if(row.owner()==actor.userId())level=3;for(var grant:byEntry.getOrDefault(row.id(),List.of()))if(grant.user()==actor.userId())level=Math.max(level,grant.level());}return level;});}
 boolean trashed(String id){return chain(id).stream().anyMatch(FileRepository.Row::trashed);}
 FileRepository.Row requireEntry(String id,int level,boolean trash){var r=row(id);require(r.status().equals("READY")&&level(id)>=level,NOT_FOUND,"files_not_found");require(trash||!trashed(id),NOT_FOUND,"files_not_found");return r;}
 void destination(String id){if(id==null)return;var r=requireEntry(id,2,false);require(r.kind().equals("FOLDER"),BAD_REQUEST,"files_folder_required");require(chain(id).size()<20,UNPROCESSABLE_ENTITY,"files_depth_limit");}
 Entry view(String id){var r=row(id);return new Entry(r.id(),r.parent()!=null&&level(r.parent())==0?null:r.parent(),r.kind(),r.name(),r.type(),r.size(),r.ownerName(),r.owner()==actor.userId(),level(id),trashed(id),r.version(),r.updated());}
}
