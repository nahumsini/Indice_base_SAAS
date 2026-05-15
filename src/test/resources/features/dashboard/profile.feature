@dashboard @profile
Feature: Home Panel personal profile
  Users can manage their own profile from the Home Panel.

  @implemented
  Scenario: User loads their personal profile
    Given a user is authenticated
    When the user opens the Home Panel profile tab
    Then the backend should return only the current user's profile data
    And the profile form should display the user's name, phone, country, language, user type, and avatar when available

  @implemented
  Scenario: User saves their personal profile
    Given a user is authenticated
    When the user updates their profile fields
    Then the backend should save the current user's profile
    And the frontend should refresh the displayed user identity

  @implemented
  Scenario: User changes their password from profile
    Given a user is authenticated
    When the user submits a matching new password and confirmation
    Then the backend should update the user's password hash

  @implemented
  Scenario: User uploads a profile avatar
    Given object storage is enabled
    And a user is authenticated
    When the user requests an avatar upload URL
    Then the backend should return a presigned upload payload
    When the user saves the avatar metadata
    Then the profile should store the avatar object key and content type
