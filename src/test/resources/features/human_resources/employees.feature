@human-resources @employees
Feature: Employee management
  HR users manage employees, assignments, contracts, documents, and termination.

  @implemented
  Scenario: Employee list requires authentication
    Given no user is authenticated
    When the frontend requests the employee list
    Then the backend should return unauthorized

  @implemented
  Scenario: HR user lists employees
    Given an authenticated company user opens Collaborators
    When the frontend requests employees
    Then the backend should return an employee list envelope

  @implemented
  Scenario: HR user creates and updates an employee
    Given an authenticated company user opens Collaborators
    When the user creates an employee with valid profile, assignment, compensation, and contract data
    Then the backend should create the employee
    When the user updates the employee
    Then the backend should persist the changes

  @implemented
  Scenario: HR user views expanded employee details
    Given an employee exists
    When an authenticated company user opens the employee details
    Then the backend should return profile, documents, portal access, and related employee information

  @implemented
  Scenario: HR user terminates an employee
    Given an active employee exists
    When an authenticated company user submits termination data
    Then the backend should update the employee termination fields

  @implemented
  Scenario: HR user uploads an employee document when storage is enabled
    Given object storage is enabled
    And an employee exists
    When the user requests a document upload URL
    Then the backend should return a presigned upload payload
    When the user confirms the uploaded document
    Then the document should be linked to the employee

  @implemented
  Scenario: Employee document upload is unavailable when storage is disabled
    Given object storage is disabled
    When the user requests an employee document upload URL
    Then the backend should return service unavailable

  @planned @access-control
  Scenario: Normal user cannot see all employees
    Given a normal user is authenticated
    When the user tries to open the Collaborators tab
    Then the app should deny access
    And the backend should not return the company employee list
