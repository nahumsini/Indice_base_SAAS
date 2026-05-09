UPDATE process_tasks task
LEFT JOIN user_companies assigned_uc
  ON assigned_uc.id = task.assigned_user_company_id
 AND assigned_uc.company_id = task.company_id
LEFT JOIN user_companies assigned_user_uc
  ON assigned_user_uc.company_id = task.company_id
 AND assigned_user_uc.user_id = task.assigned_user_id
LEFT JOIN hr_employee_portal_access assigned_access
  ON assigned_access.company_id = task.company_id
 AND assigned_access.employee_id = task.assigned_employee_id
LEFT JOIN user_companies assigned_legacy_uc
  ON assigned_legacy_uc.company_id = task.company_id
 AND assigned_legacy_uc.user_id = assigned_access.linked_user_id
LEFT JOIN user_companies completed_uc
  ON completed_uc.id = task.completed_by_user_company_id
 AND completed_uc.company_id = task.company_id
LEFT JOIN user_companies completed_user_uc
  ON completed_user_uc.company_id = task.company_id
 AND completed_user_uc.user_id = task.completed_by_user_id
LEFT JOIN hr_employee_portal_access completed_access
  ON completed_access.company_id = task.company_id
 AND completed_access.employee_id = task.completed_by_employee_id
LEFT JOIN user_companies completed_legacy_uc
  ON completed_legacy_uc.company_id = task.company_id
 AND completed_legacy_uc.user_id = completed_access.linked_user_id
SET task.assigned_user_company_id = COALESCE(task.assigned_user_company_id, assigned_user_uc.id, assigned_legacy_uc.id),
    task.assigned_user_id = COALESCE(task.assigned_user_id, assigned_uc.user_id, assigned_legacy_uc.user_id),
    task.completed_by_user_company_id = COALESCE(task.completed_by_user_company_id, completed_user_uc.id, completed_legacy_uc.id),
    task.completed_by_user_id = COALESCE(task.completed_by_user_id, completed_uc.user_id, completed_legacy_uc.user_id)
WHERE task.assigned_user_company_id IS NULL
   OR task.assigned_user_id IS NULL
   OR task.completed_by_user_company_id IS NULL
   OR task.completed_by_user_id IS NULL;

UPDATE projects project
LEFT JOIN user_companies owner_uc
  ON owner_uc.id = project.owner_user_company_id
 AND owner_uc.company_id = project.company_id
LEFT JOIN user_companies owner_user_uc
  ON owner_user_uc.company_id = project.company_id
 AND owner_user_uc.user_id = project.owner_user_id
LEFT JOIN hr_employee_portal_access owner_access
  ON owner_access.company_id = project.company_id
 AND owner_access.employee_id = project.owner_employee_id
LEFT JOIN user_companies owner_legacy_uc
  ON owner_legacy_uc.company_id = project.company_id
 AND owner_legacy_uc.user_id = owner_access.linked_user_id
SET project.owner_user_company_id = COALESCE(project.owner_user_company_id, owner_user_uc.id, owner_legacy_uc.id),
    project.owner_user_id = COALESCE(project.owner_user_id, owner_uc.user_id, owner_legacy_uc.user_id)
WHERE project.owner_user_company_id IS NULL
   OR project.owner_user_id IS NULL;

UPDATE process_tasks
SET assigned_employee_id = NULL
WHERE assigned_user_company_id IS NOT NULL;

UPDATE process_tasks
SET completed_by_employee_id = NULL
WHERE completed_by_user_company_id IS NOT NULL;

UPDATE projects
SET owner_employee_id = NULL
WHERE owner_user_company_id IS NOT NULL;
