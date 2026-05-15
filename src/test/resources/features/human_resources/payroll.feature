@human-resources @payroll
Feature: Payroll
  Payroll users generate, edit, approve, pay, cancel, and export payroll runs.

  @implemented
  Scenario: Payroll overview requires authentication
    Given no user is authenticated
    When the frontend requests payroll overview
    Then the backend should return unauthorized

  @implemented
  Scenario: Payroll user updates preferences
    Given an authenticated payroll user opens Payroll
    When the user updates payroll preferences with valid data
    Then the backend should persist the preferences

  @implemented
  Scenario: Payroll user generates a payroll run
    Given matching users exist for a payroll frequency
    When the user creates a payroll run
    Then the backend should create a draft payroll run with lines

  @implemented
  Scenario: Payroll generation rejects empty user selection
    Given no users match the selected payroll frequency
    When the user creates a payroll run
    Then the backend should reject the request

  @implemented
  Scenario: Payroll run lifecycle works
    Given a draft payroll run exists
    When the user edits a line
    Then the backend should save the edited line
    When the user processes the run
    Then the run should move to processed
    When the user approves the run
    Then the run should move to approved
    When the user marks the run paid
    Then the run should move to paid

  @implemented
  Scenario: Payroll run can be cancelled before paid
    Given a payroll run is not paid or cancelled
    When the user cancels the run
    Then the backend should mark it cancelled

  @implemented
  Scenario: Payroll run can be exported
    Given a payroll run exists
    When the user exports the run as CSV or PDF
    Then the backend should return the export file

  @planned @access-control
  Scenario: Normal user cannot see payroll
    Given a normal user is authenticated
    When the user tries to open Payroll or call payroll APIs
    Then the app should deny payroll access
