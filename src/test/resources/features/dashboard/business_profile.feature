@dashboard @business-profile
Feature: Business Profile
  Company administrators can record the company's business diagnosis answers.

  @implemented
  Scenario: Business Profile loads default sections when empty
    Given an authenticated admin user opens Business Profile for a company with no saved profile
    When the frontend requests the Business Profile
    Then the backend should return a draft profile
    And the response should include people, processes, products, and finance sections

  @implemented
  Scenario: Business Profile saves section answers
    Given an authenticated admin user opens Business Profile
    When the user answers profile questions and saves
    Then the backend should normalize and store the section answers
    And the frontend should display the saved profile envelope

  @implemented @access-control
  Scenario: Normal user cannot manage Business Profile
    Given a normal user is authenticated
    When the user tries to open or save Business Profile
    Then the app should deny the business profile management flow
