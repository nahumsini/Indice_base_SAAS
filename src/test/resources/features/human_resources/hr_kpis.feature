@human-resources @kpis
Feature: HR KPIs
  HR users review user, attendance, payroll, assets, records, and team health metrics.

  @implemented @frontend-only
  Scenario: User opens the HR KPIs tab
    Given an authenticated user opens Human Resources
    When the user switches to KPIs
    Then the frontend should show team KPIs
    And the frontend should show workforce management KPIs
    And the frontend should show operation KPIs
    And the frontend should show attendance charts

  @implemented @frontend-only
  Scenario: User changes HR KPI filters
    Given an authenticated user is viewing the HR KPIs tab
    When the user selects year, month, unit, or department filters
    Then the frontend should keep the selected filters in the KPI workspace

  @planned
  Scenario: HR KPIs are calculated from backend data
    Given HR data exists for users, attendance, payroll, permissions, assets, and records
    When the user opens HR KPIs
    Then the backend should calculate the KPI values for the selected period and scope
    And the frontend should render backend values instead of static demo values

  @planned @access-control
  Scenario: HR KPIs respect user data scope
    Given a user has limited HR data access
    When the user opens HR KPIs
    Then the KPI values should include only data the user is allowed to see
