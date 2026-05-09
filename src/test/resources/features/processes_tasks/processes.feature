@processes-tasks @processes
Feature: Recurring processes
  Users manage recurring process definitions from the Processes tab.

  @implemented
  Scenario: User lists recurring processes
    Given an authenticated company user opens the Processes tab
    When the frontend requests recurring processes
    Then the backend should return the company's non-deleted process records

  @implemented
  Scenario: User creates a recurring process
    Given an authenticated company user opens the Processes tab
    When the user submits a valid process definition
    Then the backend should create the process
    And the process should receive the next yearly process folio

  @implemented
  Scenario: User updates a recurring process
    Given a recurring process exists
    When the user edits the process fields or recurrence
    Then the backend should persist the update

  @implemented
  Scenario: User toggles a recurring process active state
    Given a recurring process exists
    When the user toggles the process active state
    Then the backend should save the new active state

  @implemented
  Scenario: User duplicates a recurring process from the frontend
    Given a recurring process exists
    When the user duplicates the process
    Then the frontend should create a new process with copied fields
    And the backend should assign a new folio

  @implemented
  Scenario: User deletes a recurring process
    Given a recurring process exists
    When the user deletes the process
    Then the backend should soft delete the process
    And the process should no longer appear in the list

  @planned @access-control
  Scenario: Normal user sees only allowed process data
    Given a normal user is authenticated
    When the user opens Processes and Tasks
    Then the user should see only process data allowed by their module access and assignments
