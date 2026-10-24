package com.indice.erp.files;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.hr.users.HrSchedulingDirectoryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validator;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.indice.erp.files.FileAccess.*;
import static com.indice.erp.files.FileContracts.*;
import static org.springframework.http.HttpStatus.*;

@Service
public class FileLibraryService {
 final FileRepository repo;final FileAccess access;private final ObjectMapper mapper;private final Validator validator;private final HrSchedulingDirectoryService directory;
 public FileLibraryService(FileRepository repo,FileAccess access,ObjectMapper mapper,Validator validator,HrSchedulingDirectoryService directory){this.repo=repo;this.access=access;this.mapper=mapper;this.validator=validator;this.directory=directory;}
 FileGraph graph(AuthSessionUser a){return new FileGraph(repo,a);}
 @Transactional(readOnly=true)
 public Page list(AuthSessionUser a,String folder,String scope,String q,int page,int size,String type){
  access.read(a);folder=parent(folder);require(Set.of("OWNED","SHARED","TRASH").contains(scope),BAD_REQUEST,"files_invalid_scope");require(page>=1&&size>=1&&size<=100&&q.length()<=180,BAD_REQUEST,"files_invalid_input");
  var g=graph(a);if(folder!=null)require(g.requireEntry(folder,1,scope.equals("TRASH")).kind().equals("FOLDER"),BAD_REQUEST,"files_folder_required");
  final String searchedFolder=folder;var result=new ArrayList<Entry>();String query=q.toLowerCase(Locale.ROOT);
  for(var row:g.rows.values()){
   if(!row.status().equals("READY")||g.level(row.id())==0)continue;
   boolean deleted=g.trashed(row.id());if(scope.equals("TRASH")?(!deleted||g.level(row.id())<3):deleted)continue;
   if(!query.isBlank()) {if(!row.name().toLowerCase(Locale.ROOT).contains(query))continue;if(folder!=null&&g.chain(row.id()).stream().noneMatch(p->p.id().equals(searchedFolder)))continue;if(folder==null&&scope.equals("OWNED")&&row.owner()!=a.userId())continue;if(folder==null&&scope.equals("SHARED")&&row.owner()==a.userId())continue;}
   else if(folder!=null){if(!folder.equals(row.parent()))continue;}
   else if(scope.equals("OWNED")){if(row.owner()!=a.userId()||row.parent()!=null&&g.level(row.parent())>0&&!g.trashed(row.parent()))continue;}
   else if(scope.equals("SHARED")){if(row.owner()==a.userId()||row.parent()!=null&&g.level(row.parent())>0&&!g.trashed(row.parent()))continue;}
   else if(row.parent()!=null&&g.trashed(row.parent())&&g.level(row.parent())>=3)continue;
   if(!type.equals("ALL")&&!FilePolicy.category(row.kind(),row.type()).equals(type))continue;
   result.add(g.view(row.id()));
  }
  result.sort(Comparator.comparing((Entry e)->!e.kind().equals("FOLDER")).thenComparing(Entry::name,String.CASE_INSENSITIVE_ORDER).thenComparing(Entry::id));
  var crumbs=new ArrayList<Crumb>();if(folder!=null){var chain=g.chain(folder);Collections.reverse(chain);for(var row:chain)if(g.level(row.id())>0)crumbs.add(new Crumb(row.id(),row.name()));}
  int start=(int)Math.min((long)(page-1)*size,result.size());return new Page(result.subList(start,Math.min(start+size,result.size())),result.size(),page,size,crumbs,folder==null?3:g.level(folder),key(a));
 }
 @Transactional(readOnly=true) public Entry get(AuthSessionUser a,String id){access.read(a);var g=graph(a);g.requireEntry(id,1,false);return g.view(id);}
 @Transactional(readOnly=true) public List<Member> members(AuthSessionUser a){access.read(a);return directory.fileMembers(a.companyId()).stream().limit(1000).map(m->new Member(m.id(),m.name())).toList();}
 @Transactional(readOnly=true) public java.util.List<Crumb> destinations(AuthSessionUser a,String exclude){access.read(a);var g=graph(a);if(exclude!=null)g.requireEntry(exclude,3,false);var result=new java.util.ArrayList<Crumb>();for(var row:g.rows.values()){if(!row.kind().equals("FOLDER")||!row.status().equals("READY")||g.level(row.id())<2||g.trashed(row.id()))continue;var chain=g.chain(row.id());if(exclude!=null&&chain.stream().anyMatch(r->r.id().equals(exclude)))continue;java.util.Collections.reverse(chain);result.add(new Crumb(row.id(),chain.stream().filter(r->g.level(r.id())>0).map(FileRepository.Row::name).collect(java.util.stream.Collectors.joining(" / "))));}return result.stream().sorted(java.util.Comparator.comparing(Crumb::name,String.CASE_INSENSITIVE_ORDER)).toList();}
 @Transactional public Entry folder(AuthSessionUser a,String expected,String id,Folder in){
  access.mutation(a,expected);uuid(id);validate(in);String parent=parent(in.parentId()),name=name(in.name()),hash=hash(List.of(name,parent==null?"":parent));var g=graph(a);
  if(g.rows.containsKey(id)){var row=g.row(id);require(row.owner()==a.userId()&&row.kind().equals("FOLDER")&&row.creationDigest().equals(hash),CONFLICT,"files_retry_changed");return g.view(id);}
  g.destination(parent);capacity(g);
  repo.jdbc().update("INSERT INTO file_library_entries(company_id,id,owner_user_id,parent_id,kind,name,creation_digest) VALUES(?,?,?,?,'FOLDER',?,?)",a.companyId(),id,a.userId(),parent,name,hash);repo.audit(a.companyId(),a.userId(),id,"CREATED",1);return graph(a).view(id);
 }
 @Transactional public Entry change(AuthSessionUser a,String expected,String id,Change in){
  access.mutation(a,expected);validate(in);uuid(in.mutationId());var g=graph(a);var row=g.requireEntry(id,in.action().equals("RENAME")?2:3,true);String hash=hash(in);if(retry(row,in.mutationId(),hash))return g.view(id);require(row.version()==in.version(),CONFLICT,"files_version_conflict");
  String name=row.name(),parent=row.parent();boolean trashed=row.trashed();
  switch(in.action()){
   case "RENAME"->{require(!g.trashed(id),CONFLICT,"files_in_trash");name=name(in.name());}
   case "MOVE"->{require(!g.trashed(id),CONFLICT,"files_in_trash");parent=parent(in.parentId());g.destination(parent);if(parent!=null)require(g.chain(parent).stream().noneMatch(r->r.id().equals(id)),CONFLICT,"files_invalid_hierarchy");require(parent!=null||row.owner()==a.userId(),FORBIDDEN,"files_move_owner_required");int depth=parent==null?0:g.chain(parent).size();for(var child:g.rows.values()){var chain=g.chain(child.id());int index=0;for(var part:chain){if(part.id().equals(id))require(depth+index+1<=20,UNPROCESSABLE_ENTITY,"files_depth_limit");index++;}}}
   case "TRASH"->{require(!g.trashed(id),CONFLICT,"files_in_trash");trashed=true;}
   case "RESTORE"->{require(g.trashed(id),CONFLICT,"files_not_in_trash");trashed=false;if(parent!=null&&(g.trashed(parent)||g.level(parent)<2)){require(row.owner()==a.userId(),CONFLICT,"files_restore_parent_first");parent=null;}}
   default->throw new IllegalStateException();
  }
  repo.jdbc().update("UPDATE file_library_entries SET name=?,parent_id=?,trashed_at="+(trashed?"CURRENT_TIMESTAMP(6)":"NULL")+",version=version+1,last_mutation_id=?,last_digest=?,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",name,parent,in.mutationId(),hash,a.companyId(),id);
  repo.audit(a.companyId(),a.userId(),id,in.action(),row.version()+1);return graph(a).view(id);
 }
 @Transactional(readOnly=true) public Sharing sharing(AuthSessionUser a,String id){access.read(a);var g=graph(a);g.requireEntry(id,1,true);return sharing(a,g,id);}
 private Sharing sharing(AuthSessionUser a,FileGraph g,String id){
  var names=new HashMap<Long,String>();repo.jdbc().query("SELECT u.id,u.full_name FROM users u JOIN user_companies m ON m.user_id=u.id AND m.company_id=?",r->{names.put(r.getLong(1),r.getString(2));},a.companyId());
  var result=new ArrayList<Grant>();for(var row:g.chain(id)){result.add(new Grant(row.owner(),names.getOrDefault(row.owner(),row.ownerName()),3,!row.id().equals(id),true));for(var p:g.byEntry.getOrDefault(row.id(),List.of()))result.add(new Grant(p.user(),names.getOrDefault(p.user(),""),p.level(),!row.id().equals(id),false));}
  return new Sharing(g.view(id),result);
 }
 @Transactional public Sharing share(AuthSessionUser a,String expected,String id,Share in){
  access.mutation(a,expected);validate(in);uuid(in.mutationId());var g=graph(a);var row=g.requireEntry(id,3,false);String hash=hash(in);if(retry(row,in.mutationId(),hash))return sharing(a,g,id);require(row.version()==in.version(),CONFLICT,"files_version_conflict");
  var valid=new HashSet<Long>();directory.fileMembers(a.companyId()).forEach(m->valid.add(m.id()));var seen=new HashSet<Long>();for(var grant:in.grants())require(valid.contains(grant.userId())&&seen.add(grant.userId())&&grant.userId()!=row.owner(),BAD_REQUEST,"files_recipient_unavailable");
  repo.jdbc().update("DELETE FROM file_library_grants WHERE company_id=? AND entry_id=?",a.companyId(),id);for(var grant:in.grants())repo.jdbc().update("INSERT INTO file_library_grants(company_id,entry_id,user_id,permission_level) VALUES(?,?,?,?)",a.companyId(),id,grant.userId(),grant.permission());
  repo.jdbc().update("UPDATE file_library_entries SET version=version+1,last_mutation_id=?,last_digest=?,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",in.mutationId(),hash,a.companyId(),id);repo.audit(a.companyId(),a.userId(),id,"SHARED",row.version()+1);return sharing(a,graph(a),id);
 }
 boolean retry(FileRepository.Row row,String mutation,String hash){if(!mutation.equals(row.mutation()))return false;require(hash.equals(row.digest()),CONFLICT,"files_retry_changed");return true;}
 void capacity(FileGraph g){require(g.rows.size()<5000,UNPROCESSABLE_ENTITY,"files_entry_limit");}
 void validate(Object in){require(in!=null&&validator.validate(in).isEmpty(),BAD_REQUEST,"files_invalid_input");}
 String hash(Object in){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(mapper.writeValueAsBytes(in)));}catch(Exception e){throw new IllegalStateException("Unable to encode file operation",e);}}
}
