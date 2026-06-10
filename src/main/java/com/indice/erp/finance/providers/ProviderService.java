package com.indice.erp.finance.providers;

import com.indice.erp.finance.FinanceApiException;
import com.indice.erp.finance.providers.dto.CreateProviderRequest;
import com.indice.erp.finance.providers.dto.DeleteProviderResponse;
import com.indice.erp.finance.providers.dto.ProviderListResponse;
import com.indice.erp.finance.providers.dto.ProviderResponse;
import com.indice.erp.finance.providers.dto.UpdateProviderRequest;
import com.indice.erp.finance.shared.FinanceContext;
import java.util.NoSuchElementException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProviderService {

    private final ProviderRepository repository;
    private final ProviderMapper mapper;
    private final ProviderValidator validator;
    private final ProviderReferenceValidator referenceValidator;

    public ProviderService(
            ProviderRepository repository,
            ProviderMapper mapper,
            ProviderValidator validator,
            ProviderReferenceValidator referenceValidator) {
        this.repository = repository;
        this.mapper = mapper;
        this.validator = validator;
        this.referenceValidator = referenceValidator;
    }

    @Transactional(readOnly = true)
    public ProviderListResponse list(FinanceContext context) {
        var providers = repository.findAll(context).stream()
            .map(mapper::toResponse)
            .toList();
        return new ProviderListResponse(providers, providers.size());
    }

    @Transactional(readOnly = true)
    public ProviderResponse get(FinanceContext context, long providerId) {
        return mapper.toResponse(requireProvider(context, providerId));
    }

    @Transactional
    public ProviderResponse create(FinanceContext context, CreateProviderRequest request) {
        var assignment = validator.validateCreate(context, request);
        referenceValidator.validateAssignment(context, assignment);
        var command = mapper.toCreateCommand(context, request, assignment);
        requireUnique(context, command, null);
        return mapper.toResponse(repository.insert(context, command));
    }

    @Transactional
    public ProviderResponse update(FinanceContext context, long providerId, UpdateProviderRequest request) {
        requireProvider(context, providerId);
        var assignment = validator.validateUpdate(context, request);
        referenceValidator.validateAssignment(context, assignment);
        var command = mapper.toUpdateCommand(context, request, assignment);
        requireUnique(context, command, providerId);
        if (!repository.update(context, providerId, command)) {
            throw new NoSuchElementException("Provider not found.");
        }
        return get(context, providerId);
    }

    @Transactional
    public DeleteProviderResponse delete(FinanceContext context, long providerId) {
        requireProvider(context, providerId);
        if (!repository.softDelete(context, providerId)) {
            throw new NoSuchElementException("Provider not found.");
        }
        return new DeleteProviderResponse(true);
    }

    private void requireUnique(FinanceContext context, ProviderCommand command, Long excludedProviderId) {
        if (repository.existsByName(context, command.name(), excludedProviderId)) {
            throw FinanceApiException.conflict("Provider name already exists for this company.");
        }
        if (repository.existsByTaxId(context, command.taxId(), excludedProviderId)) {
            throw FinanceApiException.conflict("Provider taxId already exists for this company.");
        }
    }

    private ProviderRecord requireProvider(FinanceContext context, long providerId) {
        return repository.findById(context, providerId)
            .orElseThrow(() -> new NoSuchElementException("Provider not found."));
    }
}
