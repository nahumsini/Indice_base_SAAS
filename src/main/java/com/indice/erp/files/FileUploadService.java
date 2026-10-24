package com.indice.erp.files;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.storage.*;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import java.util.*;
import java.io.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.*;
import static com.indice.erp.files.FileAccess.*;
import static com.indice.erp.files.FileContracts.*;
import static org.springframework.http.HttpStatus.*;
@Service
public class FileUploadService {
 private final FileRepository repo;private final FileLibraryService library;private final FileAccess access;private final ObjectStorageService storage;private final CompanyStorageMeter meter;private final String bucket;
 public FileUploadService(FileRepository repo,FileLibraryService library,FileAccess access,ObjectStorageService storage,CompanyStorageMeter meter,ObjectStorageProperties properties){this.repo=repo;this.library=library;this.access=access;this.storage=storage;this.meter=meter;bucket=properties.getMinio().getBucketFiles();}
 @Transactional public Upload prepare(AuthSessionUser a,String expected,String id,UploadInput in){
  access.mutation(a,expected);uuid(id);library.validate(in);String name=name(in.name()),parent=parent(in.parentId()),type=FilePolicy.contentType(name),hash=library.hash(List.of(name,parent==null?"":parent,in.sizeBytes()));var g=library.graph(a);
  require(storage.isEnabled(),SERVICE_UNAVAILABLE,"files_storage_unavailable");String key="company-files/"+a.companyId()+"/staging/"+id;
  if(g.rows.containsKey(id)){var old=g.row(id);require(old.owner()==a.userId()&&old.kind().equals("FILE")&&old.creationDigest().equals(hash),CONFLICT,"files_retry_changed");if(old.status().equals("READY")){g.requireEntry(id,1,false);return new Upload(id,null,Map.of(),g.view(id));}}
  else{g.destination(parent);library.capacity(g);require(repo.jdbc().queryForObject("SELECT COUNT(*) FROM file_library_entries WHERE company_id=? AND owner_user_id=? AND status='PENDING' AND created_at>CURRENT_TIMESTAMP(6)-INTERVAL 15 MINUTE",Long.class,a.companyId(),a.userId())<10,UNPROCESSABLE_ENTITY,"files_pending_limit");repo.jdbc().update("INSERT INTO file_library_entries(company_id,id,owner_user_id,parent_id,kind,name,content_type,size_bytes,object_key,status,creation_digest) VALUES(?,?,?,?,'FILE',?,?,?,?,'PENDING',?)",a.companyId(),id,a.userId(),parent,name,type,in.sizeBytes(),key,hash);}
  try{meter.initializeIncludedCapacityIfMissing(a.companyId());var signed=meter.presignExistingCapacity(a.companyId(),"FILES",bucket,key,type,in.sizeBytes(),600);return new Upload(id,signed.uploadUrl(),signed.uploadHeaders(),null);}catch(IllegalStateException failure){throw capacityFailure(failure);}
 }
 @Transactional public Entry register(AuthSessionUser a,String expected,String id){
  access.mutation(a,expected);var g=library.graph(a);var row=g.row(id);require(row.owner()==a.userId()&&row.kind().equals("FILE"),NOT_FOUND,"files_not_found");if(row.status().equals("READY")){g.requireEntry(id,1,false);return g.view(id);}g.destination(row.parent());
  require(storage.objectExists(bucket,row.key()),BAD_REQUEST,"files_upload_incomplete");var meta=storage.objectMetadata(bucket,row.key());require(meta.sizeBytes()==row.size()&&meta.contentType().equalsIgnoreCase(row.type()),BAD_REQUEST,"files_content_invalid");
  String sealed="company-files/"+a.companyId()+"/assets/"+id+"/"+UUID.randomUUID();storage.copyObject(bucket,row.key(),sealed);
  TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCompletion(int status){if(status!=STATUS_COMMITTED)remove(sealed);}});
  var finalMeta=storage.objectMetadata(bucket,sealed);require(finalMeta.sizeBytes()==row.size()&&finalMeta.contentType().equalsIgnoreCase(row.type()),BAD_REQUEST,"files_content_invalid");FilePolicy.validate(row.type(),storage.readObjectPrefix(bucket,sealed,64*1024));
  try{meter.commitExistingCapacity(a.companyId(),bucket,row.key(),sealed,row.size());}catch(IllegalStateException failure){throw capacityFailure(failure);}repo.jdbc().update("UPDATE file_library_entries SET status='READY',object_key=?,updated_at=CURRENT_TIMESTAMP(6) WHERE company_id=? AND id=?",sealed,a.companyId(),id);repo.audit(a.companyId(),a.userId(),id,"UPLOADED",1);StorageCommitCleanup.afterCommit(()->remove(row.key()));return library.graph(a).view(id);
 }
 @Transactional(readOnly=true) public Entry content(AuthSessionUser a,String id){access.read(a);var g=library.graph(a);require(g.requireEntry(id,1,false).kind().equals("FILE"),NOT_FOUND,"files_not_found");return g.view(id);}
 public void stream(AuthSessionUser a,String id,long start,long length,OutputStream output){access.read(a);var g=library.graph(a);var row=g.requireEntry(id,1,false);require(row.kind().equals("FILE")&&start>=0&&length>=0&&start+length<=row.size()&&length<=FilePolicy.MAX_BYTES,BAD_REQUEST,"files_invalid_range");storage.streamObject(bucket,row.key(),start,length,output);}
 private RuntimeException capacityFailure(IllegalStateException failure){return failure.getMessage()!=null&&failure.getMessage().startsWith("Existing storage capacity")?new org.springframework.web.server.ResponseStatusException(UNPROCESSABLE_ENTITY,"files_storage_capacity"):failure;}
 private void remove(String key){try{storage.deleteObject(bucket,key);}catch(RuntimeException ignored){}}
}
