@human-resources @attendance @control
Feature: Attendance control
  HR users configure attendance locations, schedules, assignments, and manual corrections.

  @implemented
  Scenario: Attendance control overview requires authentication
    Given no user is authenticated
    When the frontend requests the attendance control overview
    Then the backend should return unauthorized

  @implemented
  Scenario: HR user loads attendance control overview
    Given an authenticated company user opens Attendance Control
    When the frontend requests the control overview
    Then the backend should return schedules, locations, assignments, and recent attendance data

  @implemented
  Scenario: Control tab loads management datasets
    Given an authenticated company user opens the Control tab in Human Resources
    When the frontend initializes the Control workspace
    Then it should request the attendance overview
    And it should request attendance locations
    And it should request schedule templates
    And it should request kiosk devices
    And it should request employee access profiles

  @implemented
  Scenario: HR user manages attendance locations
    Given an authenticated company user opens Attendance Control
    When the user creates an attendance location
    Then the backend should return the created location
    When the user updates or deletes the location
    Then the backend should persist the change

  @implemented
  Scenario: HR user extracts attendance location coordinates
    Given an authenticated company user enters a Google Maps link for an attendance location
    When the frontend requests coordinate extraction
    Then the backend should return the extracted location coordinates

  @implemented
  Scenario: HR user manages schedule templates and assignments
    Given an authenticated company user opens Attendance Control
    When the user creates or updates a schedule template
    Then the backend should persist the schedule template
    When the user bulk assigns schedules
    Then the backend should persist the schedule assignments

  @implemented
  Scenario: HR user reviews an employee attendance calendar
    Given an authenticated company user opens Attendance Control
    When the user selects an employee and month
    Then the backend should return that employee's attendance calendar
    And the frontend should show day-level status, punches, photos, and schedule data

  @implemented
  Scenario: HR user records a manual employee attendance punch
    Given an authenticated company user opens an employee attendance day in Control
    When the user records a manual check-in or check-out event
    Then the backend should append the event for that employee
    And the employee calendar should refresh with the updated daily state

  @implemented
  Scenario: HR user manages work-site assignments
    Given an authenticated company user opens Attendance Control
    When the user bulk assigns work sites
    Then the backend should persist work-site assignments
    When the user clears work assignments for a date
    Then affected employees should become available for that date

  @implemented
  Scenario: HR user manages contract sites
    Given an authenticated company user opens the contract site manager
    When the user creates, updates, or removes a contract site
    Then the backend should persist the location as an attendance control location
    And employee work-site assignments should reflect the active contract site dates

  @implemented
  Scenario: HR user manages employee access profiles
    Given an authenticated company user opens Attendance Control
    When the user creates or updates an employee access profile
    Then the backend should persist the employee's allowed access methods and rules

  @implemented
  Scenario: Open schedule allows any active business structure location
    Given an employee has an open schedule
    When the employee records attendance from an active business structure location
    Then the backend should allow the attendance event

  @implemented
  Scenario: Strict schedule uses the employee business location
    Given an employee has a strict schedule without an enforced schedule location
    When the employee records attendance
    Then the backend should validate the event against the employee's assigned business location

  @implemented
  Scenario: HR user corrects an employee daily record
    Given an employee has a daily attendance record
    When an authenticated company user updates the daily record correction
    Then the backend should append a correction event
    And the projected daily state should reflect the correction

  @planned @access-control
  Scenario: Normal user cannot manage attendance control
    Given a normal user is authenticated
    When the user tries to open Attendance Control or call control APIs
    Then the app should deny attendance control management
