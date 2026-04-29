UPDATE `hr_employee_number_sequences`
SET `prefix` = CASE
  WHEN TRIM(TRAILING '-' FROM UPPER(TRIM(COALESCE(`prefix`, '')))) = '' THEN 'EMP'
  ELSE TRIM(TRAILING '-' FROM UPPER(TRIM(`prefix`)))
END;
