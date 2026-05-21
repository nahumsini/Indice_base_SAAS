@config-center @users
Feature: Users and invitations
  Administrators manage users, user types, module roles, and invitations.
  Accepted users should receive the invited user type and module roles when they accept an invitation.

  @implemented
  Scenario: Authenticated user loads the users catalog
    Given an authenticated admin user opens the Users tab
    When the frontend requests the users list
    Then the backend should return users, pending invitations, units, businesses, module catalog data, and tab permission catalog data
    And each active user should include its user identity, assigned user type, and membership assignment

  @implemented
  Scenario: User updates another user's type, status, membership, module access, and tab permissions
    Given an authenticated admin user opens the Users tab
    When the user updates a target user's type, status, membership, module access, or tab permissions
    Then the backend should persist the user's type, membership, module access, and tab permission changes
    And the backend should keep the user's profile aligned with the selected user type

  @implemented
  Scenario: User configures tab permissions from module assignments
    Given an authenticated admin user opens the Users tab
    When the user opens the module access dialog for an active user
    Then the frontend should show tab permissions for the selected Home Panel and Human Resources modules
    And removing a module should remove tab permissions for that module from the saved assignment

  @implemented
  Scenario: User invites a new user
    Given an authenticated admin user opens the Users tab
    When the user submits a new invitation
    Then the backend should create a pending invitation
    And the invitation should include the selected module access and tab permissions
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
    Then the backend should return company, email, user type, and invitation status details

  @implemented
  Scenario: Invitee accepts a valid invitation
    Given a valid pending invitation exists
    When the invitee submits a valid password and confirmation
    Then the backend should create the user identity, user profile, and invited user type
    And the backend should assign the invitation's membership assignment to the user
    And the backend should assign the invitation's module roles to the user
    And the backend should assign the invitation's tab permissions to the user
    And the invitation should be marked accepted

  @implemented
  Scenario: Current session user cannot remove their own user assignment
    Given an authenticated user is viewing the Users tab
    When the user tries to remove their own user assignment
    Then the backend should reject the request

  @implemented
  Scenario: User removes another user
    Given an authenticated admin user is viewing the Users tab
    And a removable user exists
    When the administrator removes the target user
    Then the backend should deactivate the target user's assignment instead of deleting the global user identity
    And the user's profile should be marked inactive unless it is already terminated

  @implemented
  Scenario: Protected or last active admin user cannot be removed
    Given an authenticated admin user is viewing the Users tab
    When the administrator tries to remove a protected user or the last active admin user
    Then the backend should reject the request

  @implemented @access-control
  Scenario: Normal user cannot manage users or invitations
    Given a normal user is authenticated
    When the user tries to open the Users tab or call user management APIs
    Then the app should deny access to user administration

  @implemented @access-control
  Scenario: User management APIs require the Users tab permission
    Given an admin user is authenticated without the Users tab permission
    When the user calls a user management API directly
    Then the backend should return forbidden
