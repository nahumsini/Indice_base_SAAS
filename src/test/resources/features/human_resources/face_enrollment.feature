@human-resources @face
Feature: Face enrollment
  HR users manage biometric enrollment for attendance verification.

  @implemented
  Scenario: HR user starts a face enrollment session
    Given an authenticated hr user opens a user's attendance settings
    When the user starts a face enrollment session
    Then the backend should create an enrollment session

  @implemented
  Scenario: HR user uploads face enrollment captures
    Given a face enrollment session exists
    When the user requests a capture upload URL
    Then the backend should return a presigned upload payload

  @implemented
  Scenario: HR user completes face enrollment
    Given enough valid captures exist for a face enrollment session
    When the user completes the enrollment
    Then the backend should store the active face enrollment

  @implemented
  Scenario: HR user views and deletes face enrollment
    Given a user has a face enrollment
    When the user requests the user's enrollment
    Then the backend should return the enrollment
    When the user deletes the enrollment
    Then the backend should remove or deactivate it

  @planned @access-control
  Scenario: Normal user cannot manage biometric enrollment
    Given a normal user is authenticated
    When the user tries to manage face enrollment
    Then the app should deny biometric enrollment management
