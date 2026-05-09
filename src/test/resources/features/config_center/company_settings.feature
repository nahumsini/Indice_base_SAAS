@config-center @company-settings
Feature: Company settings
  Company administrators manage the shared company profile and configuration data.

  @implemented
  Scenario: User loads company settings
    Given an authenticated company user opens company settings
    When the frontend requests the company profile
    Then the backend should return the company settings envelope
    And the response should include saved configuration values when they exist

  @implemented
  Scenario: User saves company settings
    Given an authenticated company user edits company settings
    When the user saves the company profile
    Then the backend should persist the settings JSON
    And existing template fields should be preserved

  @implemented
  Scenario: User saves headquarters location
    Given an authenticated company user enters headquarters location and address values
    When the user saves company settings
    Then the backend should persist the headquarters location and address

  @planned @access-control
  Scenario: Normal user cannot manage company settings
    Given a normal user is authenticated
    When the user tries to open or save company settings
    Then the app should deny access to company settings management
