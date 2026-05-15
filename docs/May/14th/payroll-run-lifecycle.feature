Feature: Payroll runs are previewed, snapshotted, approved, and exported safely
  In order to preserve auditable payroll history
  As an HR administrator
  I want payroll runs to freeze inputs and rules before approval

  Background:
    Given a legal entity payroll profile exists
    And worker payroll profiles exist
    And effective payroll rule versions exist for the requested period

  Scenario: Preview does not mutate approved history
    Given an approved payroll run already exists for period "2026-04-01" to "2026-04-30"
    When I request a new payroll preview for period "2026-05-01" to "2026-05-31"
    Then no existing approved run should be modified
    And the response should return preview-only totals and validations

  Scenario: Draft creation snapshots inputs and rules
    Given a payroll preview was generated for period "2026-05-01" to "2026-05-31"
    When I create a payroll draft run from that preview
    Then the run should store worker input snapshots
    And the run should store the resolved payroll rule version
    And the run status should be "draft"

  Scenario: Approval locks the rule version and totals
    Given a payroll draft run exists for period "2026-05-01" to "2026-05-31"
    When I approve the payroll run
    Then the run status should be "approved"
    And the stored rule version should become immutable
    And recalculation should require an explicit re-open workflow

  Scenario: Backdated HR changes do not rewrite approved payroll
    Given an approved payroll run exists for user company "501"
    When the worker salary is edited after approval
    Then the approved run totals should remain unchanged
    And a new preview for a future run may use the updated salary

  Scenario: Manual adjustments stay auditable
    Given a payroll draft run exists
    When I add a manual earning adjustment labeled "Performance bonus"
    And I add a manual deduction labeled "Salary advance repayment"
    Then both adjustments should be stored with actor, timestamp, and source type "manual"
    And the run event stream should contain an audit record for each adjustment

  Scenario: Export uses run snapshots only
    Given an approved payroll run exists
    When I export the run to CSV and PDF
    Then both exports should use stored run snapshots
    And the exported totals should match the approved run totals exactly
