@human-resources @access-control
Feature: Human Resources access control
  HR module visibility should match the user's role and data ownership.

  @implemented
  Scenario: HR shell contains all HR workspaces
    Given an authenticated user opens Human Resources
    Then the HR shell can render Collaborators, Attendance, Control, Payroll, Announcements, Assets, Records, Permissions, Incentives, and KPIs

  @implemented
  Scenario: User switches between every Human Resources tab
    Given an authenticated user opens Human Resources
    When the user switches between Collaborators, Attendance, Control, Payroll, Announcements, Assets, Records, Permissions, Incentives, and KPIs
    Then each selected tab should render inside the Human Resources shell
    And the active tab should be reflected in the route

  @planned @access-control
  Scenario: HR user sees HR management tabs
    Given an HR user is authenticated
    When the user opens Human Resources
    Then the Collaborators tab should be visible
    And the Attendance tab should be visible
    And the Control tab should be visible
    And the Payroll tab should be visible if the user's modules allow payroll
    And the Announcements tab should be visible if the user's modules allow announcements
    And the Assets and Records tabs should be visible if the user's modules allow them
    And the Permissions, Incentives, and KPIs tabs should be visible if the user's modules allow them

  @planned @access-control
  Scenario: Normal user sees only personal HR access
    Given a normal user is authenticated
    When the user opens Human Resources
    Then the personal Attendance tab should be visible
    And the user's own schedule should be visible
    And the user's own check-in and check-out actions should be available
    And the Collaborators tab should not be visible
    And the Control tab should not be visible
    And the Payroll tab should not be visible
    And the Kiosk management controls should not be visible
    And the Announcements management tab should not be visible
    And the Assets, Records, Permissions, Incentives, and KPIs management tabs should not be visible

  @planned @access-control
  Scenario: Normal user cannot call HR administration endpoints directly
    Given a normal user is authenticated
    When the user calls an HR administration endpoint directly
    Then the backend should reject the request
    And the response should not include company-wide employee data
