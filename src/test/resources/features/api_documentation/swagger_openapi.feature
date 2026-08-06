@api-documentation @swagger @openapi
Feature: Swagger and OpenAPI documentation
  Developers and QA can inspect the backend API contract through generated documentation.

  @implemented
  Scenario: Swagger UI is available
    Given the backend application is running
    When a developer opens the Swagger UI path
    Then the application should serve the Swagger UI

  @implemented
  Scenario: OpenAPI JSON is available
    Given the backend application is running
    When a developer requests the OpenAPI JSON path
    Then the application should return the generated OpenAPI document
    And the document should describe the Indice ERP API

  @implemented
  Scenario: Protected APIs document session requirements
    Given the OpenAPI document is generated
    When a developer reviews protected endpoints
    Then the documentation should explain that most business APIs require the login session cookie
