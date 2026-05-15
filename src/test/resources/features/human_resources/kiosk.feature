@human-resources @kiosk
Feature: Attendance kiosk
  Kiosk devices allow users to identify and record attendance events from configured locations.

  @implemented
  Scenario: HR user manages kiosk devices
    Given an authenticated hr user opens Attendance Control
    When the user creates, updates, deletes, or rotates a kiosk device public token
    Then the backend should persist the kiosk device change

  @implemented
  Scenario: Public kiosk loads without an authenticated session
    Given an active kiosk device has a public access token
    When a user opens the public kiosk link
    Then the backend should return kiosk bootstrap data without requiring a session

  @implemented
  Scenario: User identifies with PIN on public kiosk
    Given an active kiosk device exists
    And a user has active PIN access
    When the user submits the PIN on the public kiosk
    Then the backend should identify the user for the kiosk session

  @implemented
  Scenario: Public kiosk records a punch event
    Given a user has identified successfully on the public kiosk
    When the user submits a check-in, break, or check-out event
    Then the backend should record the attendance event
    And the response should include the updated attendance state

  @implemented
  Scenario: Kiosk rejects invalid checkout but records the auth attempt
    Given a user has no active check-in
    When the user attempts to check out from the kiosk
    Then the backend should reject the checkout
    And the failed authorization attempt should be recorded

  @implemented
  Scenario: Kiosk rejects checkout while break is open
    Given a user has checked in
    And the user has started a break without ending it
    When the user attempts to check out
    Then the backend should reject the checkout

  @planned @access-control
  Scenario: Normal user can use kiosk but cannot manage kiosk devices
    Given a normal user is authenticated
    When the user opens Human Resources
    Then kiosk check-in and check-out actions should be available where allowed
    And kiosk device management should not be visible
