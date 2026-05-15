@human-resources @users
Feature: Human Resources user management
  HR users manage users, assignments, contracts, documents, and termination.
  Each managed record is a user with an assigned user type, profile, and supporting HR data.

  @implemented
  Scenario: User list requires authentication
    Given no user is authenticated
    When the frontend requests the user list
    Then the backend should return unauthorized

  @implemented
  Scenario: HR user lists users
    Given an authenticated hr user opens Collaborators
    When the frontend requests users
    Then the backend should return a user list envelope
    And each item should include the user identity, assigned user type, and profile identifiers

  @implemented
  Scenario: HR user creates and updates a user
    Given an authenticated hr user opens Collaborators
    When the user creates a user with valid profile, assignment, compensation, and contract data
    Then the backend should create or reuse the shared user identity by email
    And the backend should assign the selected user type
    And the backend should create or update the user's profile and HR details
    And the backend should ensure the user's default attendance settings exist
    When the user updates the user
    Then the backend should persist changes to the shared identity, assigned user type, and profile

  @implemented
  Scenario: HR user views expanded user details
    Given a user exists
    When an authenticated hr user opens the user details
    Then the backend should return the user identity, profile, documents, and related assignment information

  @implemented
  Scenario: HR user deactivates a user
    Given an active user exists
    When an authenticated hr user deactivates the user
    Then the backend should mark the user profile inactive
    And the user should no longer appear as active in collaborator lists

  @implemented
  Scenario: HR user terminates a user
    Given an active user exists
    When an authenticated hr user submits termination data for the user
    Then the backend should update the user termination fields
    And the user should no longer appear as active in collaborator lists

  @implemented
  Scenario: HR user uploads a user document when storage is enabled
    Given object storage is enabled
    And a user exists
    When the user requests a user document upload URL
    Then the backend should return a presigned upload payload
    When the user confirms the uploaded document
    Then the document should be linked to the user profile

  @implemented
  Scenario: User document upload is unavailable when storage is disabled
    Given object storage is disabled
    When the user requests a user document upload URL
    Then the backend should return service unavailable

  @planned @access-control
  Scenario: Normal user cannot see all users
    Given a normal user is authenticated
    When the user tries to open the Collaborators tab
    Then the app should deny access
    And the backend should not return the user list
