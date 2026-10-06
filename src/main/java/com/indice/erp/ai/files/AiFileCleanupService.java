package com.indice.erp.ai.files;

import com.indice.erp.billing.storage.CompanyStorageMeter;
import com.indice.erp.storage.ObjectStorageService;
import java.time.Clock;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiFileCleanupService {
    private final AiStagedFileRepository files;private final ObjectStorageService storage;private final CompanyStorageMeter meter;private final Clock clock;
    public AiFileCleanupService(AiStagedFileRepository files,ObjectStorageService storage,CompanyStorageMeter meter,Clock clock){this.files=files;this.storage=storage;this.meter=meter;this.clock=clock;}
    @Scheduled(fixedDelayString="${indice.ai.file-cleanup-delay-ms:60000}")
    @Transactional
    public void expire() {
        if(!storage.isEnabled())return;
        for(var file:files.expiredCandidates(clock.instant())) {
            // Row lock serializes cleanup with confirmed registration; attached files cannot enter this set.
            try{storage.deleteObject(file.bucket(),file.key());}
            catch(RuntimeException e){continue;}
            meter.release(file.companyId(),file.key(),"ai_file_intake_expired");files.expired(file.id());
        }
    }
}
