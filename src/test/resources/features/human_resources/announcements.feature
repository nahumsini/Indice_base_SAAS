@human-resources @announcements
Feature: HR announcements
  HR users publish announcements to selected user audiences.

  @implemented
  Scenario: HR user creates and lists announcements
    Given an authenticated hr user opens Announcements
    When the user creates an announcement
    Then the backend should persist the announcement
    When the user lists announcements
    Then the created announcement should be included

  @implemented
  Scenario: Scheduled announcement is published
    Given a scheduled announcement has reached its scheduled time
    When the publishing job runs
    Then the announcement should be marked published
    And the published timestamp should be set

  @planned @access-control
  Scenario: Normal user can read targeted announcements only
    Given a normal user is authenticated
    When the user opens announcements
    Then the user should see only announcements targeted to them
    And announcement creation controls should not be visible
