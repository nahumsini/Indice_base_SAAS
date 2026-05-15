@human-resources @attendance @self-service
Feature: Self attendance
  Normal users can see and manage only their own attendance data.

  @implemented
  Scenario: User opens their own attendance dashboard
    Given a user is authenticated
    When the frontend requests the self attendance dashboard
    Then the backend should return attendance data for the logged-in user only

  @implemented
  Scenario: User opens their own attendance calendar
    Given a user is authenticated
    When the frontend requests the self attendance calendar
    Then the backend should return calendar data for the logged-in user only

  @implemented
  Scenario: User opens the Attendance tab recorder
    Given a user is authenticated
    When the user opens the Attendance tab in Human Resources
    Then the frontend should show the user's current attendance state
    And the frontend should show photo capture, location selection, and check-in or check-out actions

  @implemented
  Scenario: User records a self attendance event
    Given a user is authenticated
    And the user's device is inside an allowed saved location
    When the user records a self check-in or check-out event
    Then the backend should append the event to user attendance records
    And the daily attendance state should update for that user

  @implemented
  Scenario: Self attendance requires photo and location before check-in
    Given a user is authenticated
    And the user has not captured a photo
    When the user attempts to check in from the Attendance tab
    Then the frontend should require a photo before submitting the attendance event
    And the backend should receive the selected attendance location with the event

  @implemented
  Scenario: User views their attendance records dialog
    Given a user is authenticated
    When the user opens View my records from the Attendance tab
    Then the frontend should show the user's attendance calendar
    And the records should come from the self attendance calendar endpoint

  @implemented
  Scenario: Self attendance uses the logged-in user
    Given a normal user is authenticated
    When the user opens self attendance and records an event
    Then the backend should store the event against the logged-in user
    And no duplicate user profile should be automatically provisioned

  @implemented
  Scenario: User corrects their own daily record
    Given a user is authenticated
    And the user has an attendance daily record
    When the user updates their own daily record
    Then the backend should save the correction only for that user's record

  @planned @access-control
  Scenario: Normal user cannot request another user's attendance
    Given a normal user is authenticated
    When the user tries to request another user's attendance calendar
    Then the backend should reject the request
    And the response should not include another person's attendance data
