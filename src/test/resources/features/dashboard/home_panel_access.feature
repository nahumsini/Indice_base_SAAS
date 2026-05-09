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

  @planned @access-control
  Scenario: Owner or admin user sees company setup tabs
    Given an owner or admin user is authenticated
    When the user opens the Home Panel
    Then the Profile tab should be visible
    And the Business Structure tab should be visible
    And the Business Profile tab should be visible
    And the Users tab should be visible

  @planned @access-control
  Scenario: Normal user sees only personal areas in Home Panel
    Given a normal user is authenticated
    When the user opens the Home Panel
    Then the Profile tab should be visible
    And the Personal Performance tab should be visible
    And the Business Structure tab should not be visible
    And the Business Profile tab should not be visible
    And the Users tab should not be visible

  @planned @access-control
  Scenario: Normal user cannot open hidden Home Panel routes directly
    Given a normal user is authenticated
    When the user navigates directly to a restricted Home Panel tab URL
    Then the frontend should redirect the user to an allowed tab
    And the backend should reject restricted company setup API requests when applicable
