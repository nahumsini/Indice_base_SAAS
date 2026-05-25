@human-resources @access-control
Feature: Human Resources access control
  HR module visibility should match the user's type and data ownership.

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
    Given an hr user is authenticated
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

  @implemented @access-control
  Scenario: Normal user cannot call HR administration endpoints directly
    Given a normal user is authenticated
    When the user calls an HR administration endpoint directly
    Then the backend should reject the request
    And the response should not include company-wide user or user-profile data

  @implemented @access-control
  Scenario: Configured HR tab permissions reject direct backend administration calls
    Given an HR management user has explicit Human Resources tab permissions from the Users tab
    When the user calls a backend endpoint for a denied HR management tab
    Then the backend should reject the request
    And the response should not include data for that HR management tab

  @implemented @access-control
  Scenario: HR collaborator data is filtered by operational scope
    Given an HR management user is assigned to a specific unit or business from the Users tab
    When the user opens the Collaborators workspace or calls an HR user endpoint directly
    Then the backend should return only collaborators inside the assigned operational scope
    And direct access to collaborators outside that scope should be rejected

  @implemented @access-control
  Scenario: HR records are filtered by operational scope
    Given an HR management user is assigned to a specific unit or business from the Users tab
    When the user opens HR Records or calls an HR records endpoint directly
    Then the backend should return only records for collaborators inside the assigned operational scope
    And direct access to records outside that scope should be rejected

  @implemented @access-control
  Scenario: HR assets are filtered by operational scope
    Given an HR management user is assigned to a specific unit or business from the Users tab
    When the user opens HR Assets or calls an HR assets endpoint directly
    Then the backend should return only assets inside the assigned operational scope
    And direct access to assets outside that scope should be rejected

  @implemented @access-control
  Scenario: HR payroll runs are filtered by operational scope
    Given an HR management user is assigned to a specific unit or business from the Users tab
    When the user opens Payroll or calls an HR payroll endpoint directly
    Then the backend should return only payroll run lines inside the assigned operational scope
    And run-level payroll actions should be rejected when the run contains out-of-scope lines

  @implemented @access-control
  Scenario: HR attendance dashboards are filtered by operational scope
    Given an HR management user is assigned to a specific unit or business from the Users tab
    When the user opens Attendance or Control dashboards
    Then the backend should return only collaborators, locations, kiosks, and recent events inside the assigned operational scope
    And attendance summary counts should be calculated from the visible scoped records

  @implemented @access-control
  Scenario: HR attendance management writes are filtered by operational scope
    Given an HR management user is assigned to a specific unit or business from the Users tab
    When the user manages attendance schedules, corrections, locations, work sites, access profiles, kiosk devices, photo uploads, or face-verification sessions
    Then the backend should reject users and attendance resources outside the assigned operational scope
    And non-corporate actors should not create or mutate company-wide attendance resources without a scoped unit or business assignment

  @implemented @access-control
  Scenario: HR announcement management is filtered by operational scope
    Given an HR management user is assigned to a specific unit or business from the Users tab
    When the user opens Announcements management or creates a new announcement
    Then the backend should return only announcements whose targets are manageable inside the assigned operational scope
    And global or department-wide announcement targets should remain corporate-only until scoped department targeting exists

  @implemented @access-control
  Scenario: HR shell filters tabs by current user role
    Given a normal user with Human Resources module access is authenticated
    When the user opens Human Resources
    Then the Attendance tab should be visible
    And the Collaborators, Control, Payroll, Announcements, Assets, Records, Permissions, Incentives, and KPIs tabs should not be visible
    When an admin user with Human Resources module access opens Human Resources
    Then the HR management tabs should be visible

  @implemented @access-control
  Scenario: Configured tab permissions filter Human Resources tabs
    Given a user has explicit Human Resources tab permissions from the Users tab
    When the user opens Human Resources
    Then only the allowed Human Resources tabs should be visible
    And direct navigation to a denied Human Resources tab should move the user to an allowed tab
