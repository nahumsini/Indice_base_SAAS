@dashboard @personal-performance
Feature: Personal Performance
  Users can answer personal performance questions for their own profile.

  @implemented
  Scenario: Personal Performance loads default sections when empty
    Given an authenticated user has no saved personal performance profile
    When the frontend requests the current user's Personal Performance profile
    Then the backend should return a draft profile
    And the response should include the default personal performance sections

  @implemented
  Scenario: User saves Personal Performance answers
    Given an authenticated user opens Personal Performance
    When the user answers questions and saves
    Then the backend should store the answers for the current user
    And the frontend should display the saved profile envelope

  @implemented @access-control
  Scenario: User sees only their own Personal Performance
    Given a normal user is authenticated
    When the user opens Personal Performance
    Then the profile should belong only to the logged-in user
    And the user should not see other users' answers
