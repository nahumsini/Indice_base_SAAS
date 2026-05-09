@human-resources @assets
Feature: HR assets
  HR users manage company assets and employee assignments.

  @implemented
  Scenario: Assets list requires authentication
    Given no user is authenticated
    When the frontend requests HR assets
    Then the backend should return unauthorized

  @implemented
  Scenario: HR user creates and updates an asset
    Given an authenticated company user opens Assets
    When the user creates an asset with valid lifecycle data
    Then the backend should return the created asset
    When the user updates editable asset fields
    Then the backend should persist the update

  @implemented
  Scenario: HR user reassigns an asset
    Given an assigned asset exists
    When the user reassigns the asset to another employee
    Then the backend should record the assignment change

  @implemented
  Scenario: HR user changes asset status
    Given an asset exists
    When the user changes the asset status
    Then the backend should validate the transition
    And the asset history should record the status change

  @implemented
  Scenario: HR user views asset history
    Given an asset exists
    When the user opens asset history
    Then the backend should return the asset status and assignment history

  @planned @access-control
  Scenario: Normal user cannot manage company assets
    Given a normal user is authenticated
    When the user tries to open Assets or call asset management APIs
    Then the app should deny asset management access
