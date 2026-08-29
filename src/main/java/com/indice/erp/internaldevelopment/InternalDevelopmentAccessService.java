package com.indice.erp.internaldevelopment;

import com.indice.erp.platformadmin.PlatformAdminAccessService;
import com.indice.erp.platformadmin.PlatformAdminForbiddenException;
import org.springframework.stereotype.Service;

@Service
public class InternalDevelopmentAccessService {

    private final PlatformAdminAccessService platformAccess;

    public InternalDevelopmentAccessService(PlatformAdminAccessService platformAccess) {
        this.platformAccess = platformAccess;
    }

    public void requireRoot(long userId) {
        var access = platformAccess.find(userId);
        if (access == null || !"PLATFORM_ROOT".equals(access.role())) {
            throw new PlatformAdminForbiddenException(
                "Only active Root platform users can access the internal development registry."
            );
        }
    }
}
