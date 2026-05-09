@config-center @business-structure
Feature: Business Structure
  Company administrators define units, businesses, and physical location data.

  @implemented
  Scenario: User loads company structure configuration
    Given an authenticated company user opens Business Structure
    When the frontend requests company settings and structure config
    Then the backend should return the saved company settings
    And the backend should preserve an explicit empty structure map when one exists

  @implemented
  Scenario: User saves business structure
    Given an authenticated company user has edited units and businesses
    When the user saves Business Structure
    Then the backend should validate and persist the structure
    And the frontend should display the committed units and businesses

  @implemented
  Scenario: User saves headquarters location with address
    Given an authenticated company user enters headquarters address fields
    When the user saves company settings
    Then the backend should persist the headquarters location and address

  @implemented
  Scenario: User extracts coordinates from a Google Maps link
    Given an authenticated company user enters a Google Maps link
    When the frontend requests coordinate extraction
    Then the backend should return the extracted latitude and longitude

  @implemented
  Scenario: Invalid headquarters latitude is rejected
    Given an authenticated company user enters an invalid headquarters latitude
    When the user saves company settings
    Then the backend should reject the request

  @planned @access-control
  Scenario: Normal user cannot manage Business Structure
    Given a normal user is authenticated
    When the user tries to open or save Business Structure
    Then the app should deny access to company structure management
