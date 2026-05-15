@authentication
Feature: Session state
  The application uses the current session to decide whether protected flows are available.

  @implemented
  Scenario: Authenticated user loads current session
    Given a user has an active session
    When the frontend requests the current session
    Then the backend should return the current user id, name, user type, and company id

  @implemented
  Scenario: Anonymous user requests current session
    Given no user is authenticated
    When the frontend requests the current session
    Then the backend should return unauthorized

  @planned @access-control
  Scenario: User type is reused by module access rules
    Given a user has an active session
    When the frontend renders module tabs
    Then the visible tabs should be based on the user's type and module access
