@human-resources @incentives
Feature: HR incentives
  HR users configure manual and automated incentives for collaborators.

  @implemented @frontend-only
  Scenario: User opens the Incentives tab
    Given an authenticated user opens Human Resources
    When the user switches to Incentives
    Then the frontend should show active, automated, manual, and coverage totals
    And the frontend should list existing incentive rules

  @implemented @frontend-only
  Scenario: User creates a manual incentive
    Given an authenticated user is viewing the Incentives tab
    When the user creates a manual incentive for selected collaborators
    Then the frontend should add the incentive to the current list
    And the incentive should show manual type, amount, application date, and status

  @implemented @frontend-only
  Scenario: User creates an automated incentive
    Given an authenticated user is viewing the Incentives tab
    When the user creates an automated incentive rule
    Then the frontend should add the incentive to the current list
    And the incentive should show automated type, rule scope, amount, and status

  @planned
  Scenario: Incentives persist in the backend
    Given an HR user creates or edits an incentive
    When the frontend sends the incentive to the backend
    Then the backend should persist the incentive rule
    And payroll should be able to consume approved incentive data

  @planned @access-control
  Scenario: Normal user cannot manage incentives
    Given a normal user is authenticated
    When the user tries to open Incentives or call incentive management APIs
    Then the app should deny incentive management

