package com.indice.erp.pos.cashclosing;

import com.indice.erp.pos.PosApiException;
import com.indice.erp.pos.PosContext;
import com.indice.erp.pos.cashclosing.dto.CashClosingDetailResponse;
import com.indice.erp.pos.cashclosing.dto.CashClosingListResponse;
import java.util.Comparator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CashClosingHistoryService {

    private final CashClosingHistoryRepository repository;

    public CashClosingHistoryService(CashClosingHistoryRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public CashClosingListResponse list(PosContext context, CashClosingQueryFilter filter) {
        var sanitized = filter.sanitized();
        var rows = repository.findAll(context, sanitized).stream()
            .sorted(Comparator.comparing(com.indice.erp.pos.cashclosing.dto.CashClosingSummaryRow::closedAt)
                .reversed())
            .toList();
        var totalCount = repository.countAll(context, sanitized);
        return new CashClosingListResponse(rows, totalCount, sanitized.limit(), sanitized.offset());
    }

    @Transactional(readOnly = true)
    public CashClosingDetailResponse detail(PosContext context, long closingId) {
        return repository.findById(context, closingId)
            .orElseThrow(() -> PosApiException.notFound("Cash closing not found."));
    }
}
