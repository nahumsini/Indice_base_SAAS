@dashboard @access-control
Feature: Home Panel access control
  The Home Panel should expose company setup only to users with administrative access.

  @implemented
  Scenario: Home Panel contains profile and company setup tabs
    Given an authenticated user opens the Home Panel
    Then the Home Panel can render the Profile, Business Structure, Business Profile, Personal Performance, and Users tabs

  @implemented
  Scenario: User switches between every Home Panel tab
    Given an authenticated user opens the Home Panel
    When the user switches between Profile, Business Structure, Business Profile, Personal Performance, and Users
    Then each selected tab should render inside the Home Panel shell
    And the active tab should be reflected in the route

  @implemented @access-control
  Scenario: Owner or admin user sees company setup tabs
    Given an owner or admin user is authenticated
    When the user opens the Home Panel
    Then the Profile tab should be visible
    And the Business Structure tab should be visible
    And the Business Profile tab should be visible
    And the Users tab should be visible

  @implemented @access-control
  Scenario: Normal user sees only personal areas in Home Panel
    Given a normal user is authenticated
    When the user opens the Home Panel
    Then the Profile tab should be visible
    And the Personal Performance tab should be visible
    And the Business Structure tab should not be visible
    And the Business Profile tab should not be visible
    And the Users tab should not be visible

  @implemented @access-control
  Scenario: Configured tab permissions filter Home Panel tabs
    Given a user has explicit Home Panel tab permissions from the Users tab
    When the user opens the Home Panel
    Then only the allowed Home Panel tabs should be visible
    And direct navigation to a denied Home Panel tab should move the user to an allowed tab

  @implemented @access-control
  Scenario: Normal user cannot open hidden Home Panel routes directly
    Given a normal user is authenticated
    When the user navigates directly to a restricted Home Panel tab URL
    Then the frontend should redirect the user to an allowed tab
    And the backend should reject restricted Users, Business Structure, and Business Profile API requests when applicable

  @implemented @access-control
  Scenario: Home Panel backend APIs enforce configured tab permissions
    Given an admin user has Config Center module access with explicit tab permissions
    When the user calls a Home Panel backend API for a denied tab
    Then the backend should return forbidden
    And the backend should not run the denied Config Center use case
