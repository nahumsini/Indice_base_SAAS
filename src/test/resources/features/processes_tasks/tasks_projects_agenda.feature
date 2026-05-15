@processes-tasks @tasks @projects @agenda
Feature: Tasks, projects, and agenda
  The module contains task, project, and agenda workspaces that still need full backend persistence.

  @implemented
  Scenario: User can open every Processes and Tasks tab
    Given an authenticated user opens Processes and Tasks
    When the user switches between Agenda, Projects, Processes, KPIs, and Org Chart
    Then the frontend should render each workspace
    And the active tab should be reflected in the route

  @implemented @frontend-only
  Scenario: User filters and reviews the Agenda tab
    Given an authenticated user opens the Agenda tab
    When the user filters by period, status, priority, unit, business, or collaborator
    Then the frontend should filter the visible task table and kanban board
    And the task detail, files, report, and audit dialogs should open from the selected task

  @implemented @frontend-only
  Scenario: User creates a quick task from Agenda
    Given an authenticated user opens the Agenda tab
    When the user creates a quick task
    Then the task should appear in the current Agenda state
    And the frontend should record a task history entry in memory

  @implemented @frontend-only
  Scenario: User reviews Projects in task and diagram views
    Given an authenticated user opens the Projects tab
    When the user switches between task view and diagram view
    Then the frontend should show project status, owners, linked tasks, and project relationships

  @implemented @frontend-only
  Scenario: User creates a quick task from a project
    Given an authenticated user opens a project in the Projects tab
    When the user creates a quick project task
    Then the task should appear in the selected project's task workspace
    And the frontend should keep the change in the current browser state

  @implemented @frontend-only
  Scenario: User filters process KPIs
    Given an authenticated user opens the KPIs tab in Processes and Tasks
    When the user searches or filters KPI categories
    Then the frontend should show matching process, task, project, and collaborator KPIs

  @implemented @frontend-only
  Scenario: User edits the Org Chart locally
    Given an authenticated user opens the Org Chart tab
    When the user changes reporting assignments
    Then the frontend should update the visible organization chart
    And the chart state should be stored in browser local storage

  @planned
  Scenario: User creates a task linked to a process or project
    Given an authenticated user opens Tasks or Agenda
    When the user creates a task
    Then the backend should persist the task in process task storage
    And the task should appear in Agenda and Projects where relevant

  @planned
  Scenario: User updates task status and assignment
    Given a task exists
    When the user changes status, due date, or assignee
    Then the backend should persist the change
    And the frontend should refresh the task in all related views

  @planned
  Scenario: User manages project tasks
    Given a project exists
    When the user creates, duplicates, completes, or audits project tasks
    Then the backend should persist the project and task state

  @planned
  Scenario: User persists org chart changes
    Given an authenticated user opens Org Chart
    When the user changes reporting assignments
    Then the backend should persist the org chart state
    And the structure should not depend only on browser local storage
