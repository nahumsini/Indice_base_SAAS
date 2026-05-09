@authentication
Feature: Login
  Users must authenticate before they can use protected Indice modules.

  @implemented
  Scenario: User logs in with valid credentials
    Given an active company user exists
    When the user logs in with valid credentials
    Then the backend should create an authenticated session
    And the session response should include the user id, user name, role, and company id
    And the frontend should navigate the user to the dashboard

  @implemented
  Scenario: User cannot log in with invalid credentials
    Given a user is on the login page
    When the user submits an invalid email or password
    Then the backend should reject the login request
    And the frontend should show a login error message
    And no authenticated session should be created

  @implemented
  Scenario: User without an active company cannot log in
    Given a registered user has no active company access
    When the user logs in with valid account credentials
    Then the backend should reject the login request
    And the response should explain that no active company is assigned

  @implemented
  Scenario: User logs out
    Given a user is authenticated
    When the user logs out
    Then the backend should invalidate the session
    And future protected API requests should require login again
