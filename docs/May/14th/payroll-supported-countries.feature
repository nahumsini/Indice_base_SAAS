Feature: Payroll support is resolved consistently for every supported country
  In order to run payroll safely across all supported countries
  As an HR administrator
  I want payroll country packs and run scope to be resolved by backend rules

  Background:
    Given the payroll country catalog supports "AR, BR, CA, CL, CO, ES, MX, PE, US"
    And payroll rules are versioned with effective dates

  Scenario Outline: A supported worker country resolves to the correct payroll pack
    Given a legal entity payroll profile for country "<country_code>" and currency "<currency>"
    And a worker payroll profile for user company "<user_company_id>" in country "<country_code>" and subdivision "<subdivision_code>"
    When I request a payroll preview for period "<period_start>" to "<period_end>"
    Then the resolved payroll pack should be "<payroll_pack>"
    And the preview currency should be "<currency>"

    Examples:
      | user_company_id | country_code | subdivision_code | payroll_pack  | currency | period_start | period_end  |
      | 101             | AR           |                   | AR_STANDARD   | ARS      | 2026-05-01   | 2026-05-31  |
      | 102             | BR           |                   | BR_STANDARD   | BRL      | 2026-05-01   | 2026-05-31  |
      | 103             | CA           | ON                | CA_STANDARD   | CAD      | 2026-05-01   | 2026-05-31  |
      | 104             | CL           |                   | CL_STANDARD   | CLP      | 2026-05-01   | 2026-05-31  |
      | 105             | CO           |                   | CO_STANDARD   | COP      | 2026-05-01   | 2026-05-31  |
      | 106             | ES           |                   | ES_STANDARD   | EUR      | 2026-05-01   | 2026-05-31  |
      | 107             | MX           |                   | MX_STANDARD   | MXN      | 2026-05-01   | 2026-05-15  |
      | 108             | PE           |                   | PE_STANDARD   | PEN      | 2026-05-01   | 2026-05-31  |
      | 109             | US           | TX                | US_STATE      | USD      | 2026-05-01   | 2026-05-15  |

  Scenario: Quebec workers resolve the Quebec payroll pack
    Given a legal entity payroll profile for country "CA" and currency "CAD"
    And a worker payroll profile for user company "201" in country "CA" and subdivision "QC"
    When I request a payroll preview for period "2026-05-01" to "2026-05-31"
    Then the resolved payroll pack should be "CA_QUEBEC"
    And the preview should include subdivision-aware statutory components

  Scenario: A payroll run cannot mix countries
    Given a legal entity payroll profile for country "MX" and currency "MXN"
    And worker payroll profiles for the following user companies:
      | user_company_id | country_code | subdivision_code |
      | 301             | MX           |                   |
      | 302             | US           | TX                |
    When I create a draft payroll run for both user companies
    Then the request should be rejected
    And the validation message should say "Payroll runs cannot mix countries or subdivisions."

  Scenario: A payroll run cannot mix currencies
    Given a legal entity payroll profile for country "US" and currency "USD"
    And another legal entity payroll profile for country "CA" and currency "CAD"
    And worker payroll profiles exist in both legal entities
    When I create one payroll run across both legal entities
    Then the request should be rejected
    And the validation message should say "Payroll runs cannot mix currencies."

  Scenario Outline: Country preview returns componentized statutory results
    Given a legal entity payroll profile for country "<country_code>" and currency "<currency>"
    And a worker payroll profile for user company "<user_company_id>" in country "<country_code>" and subdivision "<subdivision_code>"
    And the worker has attendance and compensation inputs for the requested period
    When I request a payroll preview for period "<period_start>" to "<period_end>"
    Then the worker preview should include component code "<employee_component>"
    And the worker preview should include component code "<employer_component>"

    Examples:
      | user_company_id | country_code | subdivision_code | currency | period_start | period_end  | employee_component        | employer_component         |
      | 401             | MX           |                   | MXN      | 2026-05-01   | 2026-05-15  | employee_income_tax       | employer_social_security   |
      | 402             | CA           | QC                | CAD      | 2026-05-01   | 2026-05-31  | employee_pension          | employer_pension           |
      | 403             | US           | FL                | USD      | 2026-05-01   | 2026-05-15  | employee_payroll_tax      | employer_payroll_tax       |
      | 404             | CO           |                   | COP      | 2026-05-01   | 2026-05-31  | employee_health           | employer_pension           |
      | 405             | BR           |                   | BRL      | 2026-05-01   | 2026-05-31  | employee_social_security  | employer_fgts              |
      | 406             | AR           |                   | ARS      | 2026-05-01   | 2026-05-31  | employee_social_security  | employer_social_security   |
      | 407             | CL           |                   | CLP      | 2026-05-01   | 2026-05-31  | employee_pension          | employer_insurance         |
      | 408             | ES           |                   | EUR      | 2026-05-01   | 2026-05-31  | employee_social_security  | employer_social_security   |
      | 409             | PE           |                   | PEN      | 2026-05-01   | 2026-05-31  | employee_pension          | employer_social_security   |
