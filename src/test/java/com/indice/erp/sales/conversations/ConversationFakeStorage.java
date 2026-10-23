package com.indice.erp.sales.conversations;

import com.indice.erp.storage.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** No sockets, URLs are inert synthetic origins and every object is in memory. */
final class ConversationFakeStorage implements ObjectStorageService {
    record Value(String type,byte[] bytes){}
    final Map<String,Value> objects=new ConcurrentHashMap<>();
    boolean failCopy;
    public boolean isEnabled(){return true;}
    public void validateConfiguration(){}
    public void ensureBucketExists(String b){}
    public PresignedUpload presignUpload(String b,String key,String type,int seconds){return new PresignedUpload(key,"https://storage.invalid/staging",Instant.now().plusSeconds(seconds),Map.of("Content-Type",type));}
    public boolean objectExists(String b,String key){return objects.containsKey(key);}
    public StoredObjectMetadata objectMetadata(String b,String key){var v=objects.get(key);if(v==null)throw new IllegalArgumentException("Missing synthetic object");return new StoredObjectMetadata(v.bytes.length,v.type);}
    public byte[] readObjectPrefix(String b,String key,int max){var bytes=objects.get(key).bytes;return Arrays.copyOf(bytes,Math.min(max,bytes.length));}
    public byte[] readObject(String b,String key,int max){var bytes=objects.get(key).bytes;if(bytes.length>max)throw new IllegalArgumentException("Synthetic size limit");return bytes.clone();}
    public void writeObject(String b,String key,String type,byte[] bytes){objects.put(key,new Value(type,bytes.clone()));}
    public void copyObject(String b,String from,String to){if(failCopy)throw new IllegalStateException("Synthetic storage unavailable");var v=objects.get(from);objects.put(to,new Value(v.type,v.bytes.clone()));}
    public void moveObject(String b,String from,String to){copyObject(b,from,to);objects.remove(from);}
    public String presignDownload(String b,String key,int seconds){throw new AssertionError("Must use authorized proxy");}
    public String presignServiceDownload(String b,String key,int seconds){throw new AssertionError("Never give a private file to provider as URL");}
    public void deleteObject(String b,String key){objects.remove(key);}
}
