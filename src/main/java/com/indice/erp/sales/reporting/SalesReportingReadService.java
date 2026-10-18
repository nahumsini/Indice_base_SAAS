package com.indice.erp.sales.reporting;

import com.indice.erp.hr.HrOperationalScope;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import static com.indice.erp.sales.reporting.SalesReportingContracts.*;

/** Explicit, read-only owner boundary consumed by the sales board. */
@Service
public class SalesReportingReadService {
    private final SalesReportingRepository repository;
    public SalesReportingReadService(SalesReportingRepository repository) { this.repository=repository; }
    public Page read(long company,HrOperationalScope scope,Filter filter) {
        if(scope==null || scope.type()==HrOperationalScope.Type.UNASSIGNED) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        var options=repository.options(company,scope);
        if(filter.unitId()!=null && options.units().stream().noneMatch(u->u.id()==filter.unitId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if(filter.businessId()!=null && (filter.unitId()==null || options.businesses().stream().noneMatch(b->b.id()==filter.businessId() && b.unitId()==filter.unitId()))) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return repository.read(company,scope,filter,options);
    }
}
