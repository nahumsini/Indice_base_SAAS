@human-resources @records
Feature: HR records
  HR users manage employee records, witnesses, activity, and attachments.

  @implemented
  Scenario: Records list requires authentication
    Given no user is authenticated
    When the frontend requests HR records
    Then the backend should return unauthorized

  @implemented
  Scenario: HR user creates, updates, views, and deletes a record
    Given an authenticated company user opens Records
    When the user creates a record
    Then the backend should persist the record
    When the user views, updates, or deletes the record
    Then the backend should return the expected record state

  @implemented
  Scenario: HR user uploads a record attachment
    Given object storage is enabled
    And an HR record exists
    When the user requests a record attachment upload URL
    Then the backend should return a presigned upload payload
    When the user confirms the uploaded attachment
    Then the attachment should be linked to the record

  @implemented
  Scenario: Record attachment upload is unavailable when storage is disabled
    Given object storage is disabled
    When the user requests a record attachment upload URL
    Then the backend should return service unavailable

  @planned @access-control
  Scenario: Normal user cannot manage HR records
    Given a normal user is authenticated
    When the user tries to open Records or call record management APIs
    Then the app should deny access to HR records
