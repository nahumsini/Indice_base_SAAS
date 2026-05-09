@config-center @users
Feature: Users and invitations
  Administrators manage company users, roles, module access, and invitations.

  @implemented
  Scenario: Authenticated user loads the users catalog
    Given an authenticated company user opens the Users tab
    When the frontend requests the users list
    Then the backend should return users, invitations, and module catalog data

  @implemented
  Scenario: User updates another user's role, status, and module access
    Given an authenticated company user opens the Users tab
    When the user updates a target user's role, status, or module access
    Then the backend should persist the company access changes

  @implemented
  Scenario: User invites a new company user
    Given an authenticated company user opens the Users tab
    When the user submits a new invitation
    Then the backend should create a pending invitation
    And the response should include the invite link and email delivery status

  @implemented
  Scenario: Pending invitation can be resent
    Given a pending invitation exists
    When the user resends the invitation
    Then the backend should return a refreshed invite response

  @implemented
  Scenario: Pending invitation can be cancelled
    Given a pending invitation exists
    When the user cancels the invitation
    Then the backend should remove or cancel the pending invite from the company list

  @implemented
  Scenario: Public invitation details can be viewed
    Given a valid invitation token exists
    When the invitee opens the invitation link
    Then the backend should return company, email, role, and invitation status details

  @implemented
  Scenario: Invitee accepts a valid invitation
    Given a valid pending invitation exists
    When the invitee submits a valid password and confirmation
    Then the backend should create or activate the user access
    And the invitation should be marked accepted

  @implemented
  Scenario: Current session user cannot delete their own company access
    Given an authenticated user is viewing the Users tab
    When the user tries to remove their own company access
    Then the backend should reject the request

  @planned @access-control
  Scenario: Normal user cannot manage users or invitations
    Given a normal user is authenticated
    When the user tries to open the Users tab or call user management APIs
    Then the app should deny access to user administration
