@authentication
Feature: Session state
  The application uses the current session to decide whether protected flows are available.

  @implemented
  Scenario: Authenticated user loads current session
    Given a user has an active session
    When the frontend requests the current session
    Then the backend should return the current user id, name, user type, company id, assigned modules, and tab permissions
    And the backend should say whether tab permissions have been explicitly configured

  @implemented
  Scenario: Anonymous user requests current session
    Given no user is authenticated
    When the frontend requests the current session
    Then the backend should return unauthorized

  @implemented @access-control
  Scenario: User type and module assignments drive module navigation
    Given a user has an active session
    When the frontend renders module tabs
    Then the visible module cards should be based on the user's assigned modules
    And restricted module routes should redirect to the dashboard
