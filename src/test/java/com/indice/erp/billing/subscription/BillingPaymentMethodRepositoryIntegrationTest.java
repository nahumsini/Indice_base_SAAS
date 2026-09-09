package com.indice.erp.billing.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class BillingPaymentMethodRepositoryIntegrationTest {
    @Autowired private JdbcTemplate jdbc;
    @Autowired private BillingPaymentMethodRepository repository;

    @Test
    void identitiesStayWithinCompanyAndIgnoreInternalAndEndedSubscriptions() {
        long company = company();
        long other = company();
        String customer = customer(company);
        String otherCustomer = customer(other);
        subscription(other, otherCustomer, "sub_other", "ACTIVE");
        subscription(company, customer, "internal_fixture", "ACTIVE");
        subscription(company, customer, "sub_ended", "canceled");
        String current = subscription(company, customer, "sub_current", "ACTIVE");

        assertThat(repository.find(company)).isEqualTo(new BillingPaymentMethodRepository.Identity(customer, current, false));
        assertThat(repository.find(other).customerId()).isEqualTo(otherCustomer);
        assertThat(repository.find(company()).customerId()).isNull();
    }

    @Test
    void multipleCurrentStripeSubscriptionsAreNotGuessed() {
        long company = company();
        String customer = customer(company);
        subscription(company, customer, "sub_one", "ACTIVE");
        subscription(company, customer, "sub_two", "TRIALING");
        assertThat(repository.find(company).ambiguous()).isTrue();
    }

    @Test
    void conflictingCustomerProjectionFailsClosed() {
        long company = company();
        customer(company);
        subscription(company, "cus_mismatched", "sub_current", "ACTIVE");
        assertThat(repository.find(company).ambiguous()).isTrue();
    }

    @Test
    void subscriptionCanSupplyCustomerOnlyFromItsOwnCompany() {
        long company = company();
        String subscription = subscription(company, "cus_subscription_fixture", "sub_current", "PAST_DUE");
        assertThat(repository.find(company)).isEqualTo(
            new BillingPaymentMethodRepository.Identity("cus_subscription_fixture", subscription, false));
    }

    @Test
    void customerWithNoCurrentSubscriptionCanStillHavePortalCardSettings() {
        long company = company();
        String customer = customer(company);
        subscription(company, customer, "sub_expired", "INCOMPLETE_EXPIRED");
        assertThat(repository.find(company)).isEqualTo(new BillingPaymentMethodRepository.Identity(customer, null, false));
    }

    private long company() {
        jdbc.update("INSERT INTO companies (name) VALUES (?)", "payment-method-fixture-" + UUID.randomUUID());
        return jdbc.queryForObject("SELECT LAST_INSERT_ID()", Long.class);
    }

    private String customer(long companyId) {
        String id = "cus_fixture_" + UUID.randomUUID().toString().replace("-", "");
        jdbc.update("INSERT INTO company_billing_customers (company_id, stripe_customer_id) VALUES (?, ?)", companyId, id);
        return id;
    }

    private String subscription(long companyId, String customerId, String prefix, String status) {
        String id = prefix + "_" + UUID.randomUUID().toString().replace("-", "");
        jdbc.update("""
            INSERT INTO company_billing_subscriptions (company_id, stripe_customer_id, stripe_subscription_id,
                status, last_event_id, last_event_created_at)
            VALUES (?, ?, ?, ?, 'evt_payment_method_fixture', CURRENT_TIMESTAMP(6))
            """, companyId, customerId, id, status);
        return id;
    }
}
