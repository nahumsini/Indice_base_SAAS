@human-resources @permissions
Feature: HR permissions and absences
  Users create absence or permission requests, while managers review request status.

  @implemented @frontend-only
  Scenario: User opens the Permissions tab
    Given an authenticated user opens Human Resources
    When the user switches to Permissions
    Then the frontend should show permission request totals
    And the frontend should show pending, approved, and rejected counts

  @implemented @frontend-only
  Scenario: User filters permission requests
    Given an authenticated user is viewing the Permissions tab
    When the user filters by search text, status, type, or employee
    Then the frontend should show only matching permission requests

  @implemented @frontend-only
  Scenario: User creates a permission request
    Given an authenticated user is viewing the Permissions tab
    When the user submits a new permission request
    Then the frontend should add a pending request to the current list
    And the request should include the date range, type, reason, and optional attachment name

  @implemented @frontend-only
  Scenario: Manager approves or rejects a permission request
    Given a pending permission request exists
    When a manager approves or rejects the request
    Then the frontend should update the request status
    And the updated timestamp should change

  @planned
  Scenario: Permission requests persist in the backend
    Given an authenticated user submits a permission request
    When the frontend sends the request to the backend
    Then the backend should persist the request
    And the request should be available after page refresh

  @planned @access-control
  Scenario: Normal user sees only their own permission requests
    Given a normal user is authenticated
    When the user opens Permissions
    Then the user should see only their own requests
    And manager approval actions should not be visible

