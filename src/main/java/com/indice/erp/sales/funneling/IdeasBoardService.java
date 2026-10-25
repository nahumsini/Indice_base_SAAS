package com.indice.erp.sales.funneling;

import static com.indice.erp.sales.funneling.IdeasBoardContracts.*;
import com.indice.erp.access.module.ModuleAccessService;
import com.indice.erp.auth.AuthSessionUser;
import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.storage.ObjectStorageService;
import com.indice.erp.storage.ObjectStorageProperties;
import jakarta.validation.Validator;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
public class IdeasBoardService {
    public static final int MAX_BYTES=5*1024*1024;
    private final IdeasBoardRepository repository;private final ModuleAccessService modules;private final Validator validator;
    private final ObjectStorageService storage;private final ObjectStorageProperties properties;private final CompanyStorageMeter meter;
    public IdeasBoardService(IdeasBoardRepository repository,ModuleAccessService modules,Validator validator,ObjectStorageService storage,ObjectStorageProperties properties,CompanyStorageMeter meter) {
        this.repository=repository;this.modules=modules;this.validator=validator;this.storage=storage;this.properties=properties;this.meter=meter;
    }
    @Transactional(readOnly=true)
    public Board get(AuthSessionUser actor) { return get(actor,IdeasBoardScope.FUNNEL); }
    @Transactional(readOnly=true)
    public Board get(AuthSessionUser actor,IdeasBoardScope scope) { return repository.find(actor,scope).map(IdeasBoardRepository.Row::board).orElseGet(()->new Board(empty(),0,null,IdeasBoardRepository.key(actor,scope))); }
    private void mutation(AuthSessionUser a,String expectedActor,IdeasBoardScope scope) {
        require(IdeasBoardRepository.key(a,scope).equals(expectedActor),HttpStatus.CONFLICT,"ideas_board_actor_changed");
        repository.lock(a);require(modules.companyCanAccessForMutation(a.companyId(),scope.module()),HttpStatus.FORBIDDEN,"ideas_board_unavailable");
    }
    @Transactional
    public Board save(AuthSessionUser a,String expectedActor,Input input) { return save(a,expectedActor,input,IdeasBoardScope.FUNNEL); }
    @Transactional
    public Board save(AuthSessionUser a,String expectedActor,Input input,IdeasBoardScope scope) {
        require(input!=null && validator.validate(input).isEmpty(),HttpStatus.BAD_REQUEST,"ideas_board_invalid");uuid(input.mutationId());
        mutation(a,expectedActor,scope);validate(a,input.content(),scope);
        String json=repository.encode(input.content());require(json.getBytes(StandardCharsets.UTF_8).length<=512*1024,HttpStatus.BAD_REQUEST,"ideas_board_invalid");
        String digest=digest(json.getBytes(StandardCharsets.UTF_8));var current=repository.find(a,scope);
        if(current.isPresent() && input.mutationId().equals(current.get().mutationId())) {
            require(current.get().digest().equals(digest) && current.get().board().version()==input.version()+1,HttpStatus.CONFLICT,"ideas_board_conflict");return current.get().board();
        }
        require(current.map(r->r.board().version()).orElse(0L)==input.version(),HttpStatus.CONFLICT,"ideas_board_conflict");
        repository.save(a,input,digest,scope);return get(a,scope);
    }
    /** Read-only technical validation exported to immutable idea-workspace snapshots. */
    @Transactional(readOnly=true)
    public void validateSnapshot(AuthSessionUser a,Document content,IdeasBoardScope scope) {
        require(content!=null && validator.validate(content).isEmpty(),HttpStatus.BAD_REQUEST,"ideas_board_invalid");
        validate(a,content,scope);
        require(repository.encode(content).getBytes(StandardCharsets.UTF_8).length<=512*1024,HttpStatus.BAD_REQUEST,"ideas_board_invalid");
    }
    private void validate(AuthSessionUser a,Document content,IdeasBoardScope scope) {
        var ids=new HashSet<String>();
        for(var n:content.nodes()) {
            uuid(n.id());require(ids.add(n.id()) && finite(n.x(),n.y(),n.width(),n.height()),HttpStatus.BAD_REQUEST,"ideas_board_invalid");
            if(scope==IdeasBoardScope.FUNNEL) require(n.width()>=120&&n.height()>=80&&n.appearance()==null&&n.drawing()==null&&n.catalog()==null&&n.fiveS()==null&&!Set.of("DRAWING","VIDEO","AUDIO").contains(n.kind())&&Set.of("NOTE","RECTANGLE","ELLIPSE","PLAIN").contains(n.shape()),HttpStatus.BAD_REQUEST,"ideas_board_invalid");
            if(scope==IdeasBoardScope.PERSONAL) {
                com.indice.erp.ideasboard.IdeaCatalogPolicy.validate(n);
                com.indice.erp.ideasboard.FiveSPolicy.validate(n);
                for(String asset:com.indice.erp.ideasboard.FiveSPolicy.evidence(n)) {
                    uuid(asset);var stored=repository.asset(a,asset,scope);
                    require(stored.isPresent()&&IdeasBoardMediaPolicy.matchesKind("IMAGE",stored.get().asset().contentType()),HttpStatus.BAD_REQUEST,"ideas_board_photo_invalid");
                }
            }
            if("DRAWING".equals(n.kind())) {
                require(scope==IdeasBoardScope.PERSONAL&&n.drawing()!=null&&n.text().isEmpty()&&n.appearance()==null&&"PLAIN".equals(n.shape()),HttpStatus.BAD_REQUEST,"ideas_board_invalid");
                require(finite(n.drawing().width())&&n.drawing().points().stream().allMatch(p->finite(p.x(),p.y())),HttpStatus.BAD_REQUEST,"ideas_board_invalid");
            } else require(n.drawing()==null&&n.width()<=1000&&n.height()<=800,HttpStatus.BAD_REQUEST,"ideas_board_invalid");
            if(n.appearance()!=null) require(finite(n.appearance().fontSize(),n.appearance().borderWidth()),HttpStatus.BAD_REQUEST,"ideas_board_invalid");
            if(Set.of("IMAGE","VIDEO","AUDIO").contains(n.kind())) {
                uuid(n.assetId());var stored=repository.asset(a,n.assetId(),scope);require(stored.isPresent()&&IdeasBoardMediaPolicy.matchesKind(n.kind(),stored.get().asset().contentType()),HttpStatus.BAD_REQUEST,"ideas_board_photo_invalid");
            } else require(n.assetId()==null,HttpStatus.BAD_REQUEST,"ideas_board_invalid");
        }
        var links=new HashSet<String>();var pairs=new HashSet<String>();
        for(var link:content.connections()) {
            if(scope==IdeasBoardScope.FUNNEL)require(link.direction()==null,HttpStatus.BAD_REQUEST,"ideas_board_invalid");
            uuid(link.id());require(links.add(link.id()) && !ids.contains(link.id()) && ids.contains(link.from()) && ids.contains(link.to()) && !link.from().equals(link.to()) && pairs.add(link.from()+":"+link.to()),HttpStatus.BAD_REQUEST,"ideas_board_invalid");
        }
        require(finite(content.viewport().x(),content.viewport().y(),content.viewport().zoom()),HttpStatus.BAD_REQUEST,"ideas_board_invalid");
    }
    @Transactional
    public Asset upload(AuthSessionUser a,String expectedActor,String id,String name,String mime,byte[] bytes) { return upload(a,expectedActor,id,name,mime,bytes,IdeasBoardScope.FUNNEL); }
    @Transactional
    public Asset upload(AuthSessionUser a,String expectedActor,String id,String name,String mime,byte[] bytes,IdeasBoardScope scope) {
        mutation(a,expectedActor,scope);uuid(id);
        require(bytes!=null && bytes.length>0 && bytes.length<=(scope==IdeasBoardScope.PERSONAL?IdeasBoardMediaPolicy.limit(mime):MAX_BYTES) && mime!=null && (scope==IdeasBoardScope.PERSONAL||Set.of("image/png","image/jpeg","image/webp").contains(mime)),HttpStatus.BAD_REQUEST,"ideas_board_photo_invalid");
        require(name!=null && !name.isBlank() && name.length()<=180 && name.chars().noneMatch(c->c<32 || c==127 || c=='/' || c=='\\'),HttpStatus.BAD_REQUEST,"ideas_board_photo_invalid");
        require(scope==IdeasBoardScope.PERSONAL?IdeasBoardMediaPolicy.valid(name,mime,bytes):signature(mime,bytes),HttpStatus.BAD_REQUEST,"ideas_board_photo_invalid");String hash=digest(bytes);
        var existing=repository.asset(a,id,scope);if(existing.isPresent()) {
            var row=existing.get();require(row.digest().equals(hash) && row.asset().name().equals(name) && row.asset().contentType().equals(mime),HttpStatus.CONFLICT,"ideas_board_conflict");return row.asset();
        }
        require(repository.assetCount(a,scope)<50,HttpStatus.BAD_REQUEST,"ideas_board_photo_limit");enabled();
        String bucket=bucket(scope),key=scope.storagePrefix()+"/"+a.companyId()+"/"+a.userId()+"/"+id;
        meter.reserve(a.companyId(),scope.storageOwner(),bucket,key,bytes.length);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization(){@Override public void afterCompletion(int status){if(status==STATUS_ROLLED_BACK)try{storage.deleteObject(bucket,key);}catch(RuntimeException ignored){/* The private orphan can be reclaimed by storage reconciliation. */}}});
        storage.ensureBucketExists(bucket);
        storage.writeObject(bucket,key,mime,bytes);meter.commit(a.companyId(),bucket,key,bytes.length);
        var asset=new Asset(id,name,mime,bytes.length);repository.insertAsset(a,new StoredAsset(asset,key,hash),scope);return asset;
    }
    /** Personal workspace owner supplies only assets authorized by an explicit project read/copy grant.
     * References retain private blobs in the same tenant; no storage bytes are duplicated or exposed. */
    @Transactional
    public Map<String,String> copyPersonalAssetReferences(AuthSessionUser target,List<StoredAsset> approved) {
        repository.lock(target);
        require(modules.companyCanAccessForMutation(target.companyId(),"ideas_board"),HttpStatus.FORBIDDEN,"ideas_board_unavailable");
        require(repository.assetCount(target,IdeasBoardScope.PERSONAL)+approved.size()<=50,HttpStatus.UNPROCESSABLE_ENTITY,"ideas_board_photo_limit");
        var result=new HashMap<String,String>();
        for(var stored:approved){
            require(stored.objectKey().startsWith("ideas-board/"+target.companyId()+"/"),HttpStatus.BAD_REQUEST,"ideas_board_photo_invalid");
            var asset=stored.asset();String id=UUID.randomUUID().toString();
            repository.insertAsset(target,new StoredAsset(new Asset(id,asset.name(),asset.contentType(),asset.size()),stored.objectKey(),stored.digest()),IdeasBoardScope.PERSONAL);
            result.put(asset.id(),id);
        }
        return Map.copyOf(result);
    }
    @Transactional(readOnly=true)
    public StoredAsset asset(AuthSessionUser a,String id) { return asset(a,id,IdeasBoardScope.FUNNEL); }
    @Transactional(readOnly=true)
    public StoredAsset asset(AuthSessionUser a,String id,IdeasBoardScope scope) { uuid(id);return repository.asset(a,id,scope).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"ideas_board_photo_not_found")); }
    public byte[] bytes(StoredAsset asset) { return bytes(asset,IdeasBoardScope.FUNNEL); }
    public byte[] bytes(StoredAsset asset,IdeasBoardScope scope) { enabled();return storage.readObject(bucket(scope),asset.objectKey(),scope==IdeasBoardScope.PERSONAL?IdeasBoardMediaPolicy.limit(asset.asset().contentType()):MAX_BYTES); }
    private void enabled(){require(storage.isEnabled(),HttpStatus.SERVICE_UNAVAILABLE,"ideas_board_storage_unavailable");}
    private String bucket(IdeasBoardScope scope){return scope==IdeasBoardScope.FUNNEL ? properties.getMinio().getBucketSalesDocuments() : properties.getMinio().getBucketIdeasBoard();}
    static boolean signature(String mime, byte[] bytes) {
        if ("image/webp".equals(mime)) return webp(bytes);
        if (bytes.length < 24) return false;
        if ("image/png".equals(mime) && !(bytes[0] == (byte)137 && bytes[1] == 80 && bytes[2] == 78 && bytes[3] == 71 && bytes[4] == 13 && bytes[5] == 10 && bytes[6] == 26 && bytes[7] == 10)) return false;
        if ("image/jpeg".equals(mime) && !(bytes[0] == (byte)255 && bytes[1] == (byte)216 && bytes[2] == (byte)255 && bytes[bytes.length-2] == (byte)255 && bytes[bytes.length-1] == (byte)217)) return false;
        // Read metadata without allocating a full decoded image; bound image dimensions as well as bytes.
        try (var stream = javax.imageio.ImageIO.createImageInputStream(new java.io.ByteArrayInputStream(bytes))) {
            var readers = javax.imageio.ImageIO.getImageReaders(stream);
            if (!readers.hasNext()) return false;
            var reader = readers.next();
            try { reader.setInput(stream); String format=reader.getFormatName(); return ("image/png".equals(mime) ? format.equalsIgnoreCase("png") : format.equalsIgnoreCase("jpeg")) && dimensions(reader.getWidth(0), reader.getHeight(0)); }
            finally { reader.dispose(); }
        } catch (java.io.IOException | RuntimeException error) { return false; }
    }
    private static boolean dimensions(int width,int height) { return width>0 && height>0 && width<=8192 && height<=8192 && (long)width*height<=24000000; }
    private static boolean webp(byte[] b) {
        if(b.length<30 || !new String(b,0,4,StandardCharsets.US_ASCII).equals("RIFF") || !new String(b,8,4,StandardCharsets.US_ASCII).equals("WEBP")) return false;
        long length=Integer.toUnsignedLong(java.nio.ByteBuffer.wrap(b,4,4).order(java.nio.ByteOrder.LITTLE_ENDIAN).getInt());
        if(length+8!=b.length) return false;
        String chunk=new String(b,12,4,StandardCharsets.US_ASCII);
        long size=Integer.toUnsignedLong(java.nio.ByteBuffer.wrap(b,16,4).order(java.nio.ByteOrder.LITTLE_ENDIAN).getInt());
        if(size<10 || size>b.length-20) return false;
        int width,height;
        if(chunk.equals("VP8X")) { width=1+le24(b,24);height=1+le24(b,27); if(b.length<40) return false; }
        else if(chunk.equals("VP8 ")) { if(b[23]!=(byte)0x9d || b[24]!=1 || b[25]!=0x2a) return false; width=((b[26]&255)|((b[27]&255)<<8))&0x3fff;height=((b[28]&255)|((b[29]&255)<<8))&0x3fff; }
        else if(chunk.equals("VP8L")) { if(b[20]!=0x2f) return false; width=1+((b[21]&255)|((b[22]&0x3f)<<8));height=1+(((b[22]&0xc0)>>6)|((b[23]&255)<<2)|((b[24]&15)<<10)); }
        else return false;
        return dimensions(width,height);
    }
    private static int le24(byte[] b,int at) { return (b[at]&255)|((b[at+1]&255)<<8)|((b[at+2]&255)<<16); }
    static void uuid(String id){try{require(id!=null && UUID.fromString(id).toString().equals(id),HttpStatus.BAD_REQUEST,"ideas_board_invalid");}catch(IllegalArgumentException e){throw new ResponseStatusException(HttpStatus.BAD_REQUEST,"ideas_board_invalid");}}
    private static boolean finite(Double... values){return Arrays.stream(values).allMatch(v->v!=null&&Double.isFinite(v));}
    private static String digest(byte[] bytes){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));}catch(Exception e){throw new IllegalStateException(e);}}
    private static void require(boolean ok,HttpStatus status,String code){if(!ok)throw new ResponseStatusException(status,code);}
}
