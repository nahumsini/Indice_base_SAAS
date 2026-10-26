-- CRA T4127 Option 1, January/July 2026; Revenu Quebec TP-1015.F-V 2026.
-- New versions preserve every previously stored rule reference.

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','','INCOME_TAX_FEDERAL','Canada federal 2026','income_tax','2026-01-01','2026-12-31','CA reviewed 2026-01-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,58523,0.1400,0,10),
(@ca_rule_id,58523,117045,0.2050,3804,20),
(@ca_rule_id,117045,181440,0.2600,10241,30),
(@ca_rule_id,181440,258482,0.2900,15685,40),
(@ca_rule_id,258482,NULL,0.3300,26024,50);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','AB','INCOME_TAX_PROVINCIAL','Canada AB 2026','income_tax','2026-01-01','2026-12-31','CA reviewed 2026-01-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,61200,0.0800,0,10),
(@ca_rule_id,61200,154259,0.1000,1224,20),
(@ca_rule_id,154259,185111,0.1200,4309,30),
(@ca_rule_id,185111,246813,0.1300,6160,40),
(@ca_rule_id,246813,370220,0.1400,8628,50),
(@ca_rule_id,370220,NULL,0.1500,12331,60);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1),
(@ca_rule_id,'basic_amount',22769);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','BC','INCOME_TAX_PROVINCIAL','Canada BC 2026','income_tax','2026-01-01','2026-12-31','CA reviewed 2026-01-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,50363,0.0506,0,10),
(@ca_rule_id,50363,100728,0.0770,1330,20),
(@ca_rule_id,100728,115648,0.1050,4150,30),
(@ca_rule_id,115648,140430,0.1229,6220,40),
(@ca_rule_id,140430,190405,0.1470,9604,50),
(@ca_rule_id,190405,265545,0.1680,13603,60),
(@ca_rule_id,265545,NULL,0.2050,23428,70);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1),
(@ca_rule_id,'basic_amount',13216),
(@ca_rule_id,'reduction_base',575),
(@ca_rule_id,'reduction_threshold',25570),
(@ca_rule_id,'reduction_limit',41722);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','MB','INCOME_TAX_PROVINCIAL','Canada MB 2026','income_tax','2026-01-01','2026-12-31','CA reviewed 2026-01-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,47000,0.1080,0,10),
(@ca_rule_id,47000,100000,0.1275,917,20),
(@ca_rule_id,100000,NULL,0.1740,5567,30);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','NB','INCOME_TAX_PROVINCIAL','Canada NB 2026','income_tax','2026-01-01','2026-12-31','CA reviewed 2026-01-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,52333,0.0940,0,10),
(@ca_rule_id,52333,104666,0.1400,2407,20),
(@ca_rule_id,104666,193861,0.1600,4501,30),
(@ca_rule_id,193861,NULL,0.1950,11286,40);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1),
(@ca_rule_id,'basic_amount',13664);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','NL','INCOME_TAX_PROVINCIAL','Canada NL 2026','income_tax','2026-01-01','2026-12-31','CA reviewed 2026-01-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,44678,0.0870,0,10),
(@ca_rule_id,44678,89354,0.1450,2591,20),
(@ca_rule_id,89354,159528,0.1580,3753,30),
(@ca_rule_id,159528,223340,0.1780,6943,40),
(@ca_rule_id,223340,285319,0.1980,11410,50),
(@ca_rule_id,285319,570638,0.2080,14263,60),
(@ca_rule_id,570638,1141275,0.2130,17117,70),
(@ca_rule_id,1141275,NULL,0.2180,22823,80);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1),
(@ca_rule_id,'basic_amount',11188);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','NS','INCOME_TAX_PROVINCIAL','Canada NS 2026','income_tax','2026-01-01','2026-12-31','CA reviewed 2026-01-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,30995,0.0879,0,10),
(@ca_rule_id,30995,61991,0.1495,1909,20),
(@ca_rule_id,61991,97417,0.1667,2976,30),
(@ca_rule_id,97417,157124,0.1750,3784,40),
(@ca_rule_id,157124,NULL,0.2100,9283,50);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1),
(@ca_rule_id,'basic_amount',11932);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','NT','INCOME_TAX_PROVINCIAL','Canada NT 2026','income_tax','2026-01-01','2026-12-31','CA reviewed 2026-01-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,53003,0.0590,0,10),
(@ca_rule_id,53003,106009,0.0860,1431,20),
(@ca_rule_id,106009,172346,0.1220,5247,30),
(@ca_rule_id,172346,NULL,0.1405,8436,40);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1),
(@ca_rule_id,'basic_amount',18198);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','NU','INCOME_TAX_PROVINCIAL','Canada NU 2026','income_tax','2026-01-01','2026-12-31','CA reviewed 2026-01-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,55801,0.0400,0,10),
(@ca_rule_id,55801,111602,0.0700,1674,20),
(@ca_rule_id,111602,181439,0.0900,3906,30),
(@ca_rule_id,181439,NULL,0.1150,8442,40);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1),
(@ca_rule_id,'basic_amount',19659);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','ON','INCOME_TAX_PROVINCIAL','Canada ON 2026','income_tax','2026-01-01','2026-12-31','CA reviewed 2026-01-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,53891,0.0505,0,10),
(@ca_rule_id,53891,107785,0.0915,2210,20),
(@ca_rule_id,107785,150000,0.1116,4376,30),
(@ca_rule_id,150000,220000,0.1216,5876,40),
(@ca_rule_id,220000,NULL,0.1316,8076,50);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1),
(@ca_rule_id,'basic_amount',12989);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','PE','INCOME_TAX_PROVINCIAL','Canada PE 2026','income_tax','2026-01-01','2026-12-31','CA reviewed 2026-01-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,33928,0.0950,0,10),
(@ca_rule_id,33928,65820,0.1347,1347,20),
(@ca_rule_id,65820,106890,0.1660,3407,30),
(@ca_rule_id,106890,142520,0.1762,4497,40),
(@ca_rule_id,142520,NULL,0.1900,6464,50);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1),
(@ca_rule_id,'basic_amount',15000);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','SK','INCOME_TAX_PROVINCIAL','Canada SK 2026','income_tax','2026-01-01','2026-12-31','CA reviewed 2026-01-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,54532,0.1050,0,10),
(@ca_rule_id,54532,155805,0.1250,1091,20),
(@ca_rule_id,155805,NULL,0.1450,4207,30);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1),
(@ca_rule_id,'basic_amount',20381);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','YT','INCOME_TAX_PROVINCIAL','Canada YT 2026','income_tax','2026-01-01','2026-12-31','CA reviewed 2026-01-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jan/t4127-jan-payroll-deductions-formulas-computer-programs.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,58523,0.0640,0,10),
(@ca_rule_id,58523,117045,0.0900,1522,20),
(@ca_rule_id,117045,181440,0.1090,3745,30),
(@ca_rule_id,181440,500000,0.1280,7193,40),
(@ca_rule_id,500000,NULL,0.1500,18193,50);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','BC','INCOME_TAX_PROVINCIAL','Canada BC 2026','income_tax','2026-07-01','2026-12-31','CA reviewed 2026-07-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jul/t4127-jul-payroll-deductions-formulas.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,50363,0.0614,0,10),
(@ca_rule_id,50363,100728,0.0770,786,20),
(@ca_rule_id,100728,115648,0.1050,3606,30),
(@ca_rule_id,115648,140430,0.1229,5676,40),
(@ca_rule_id,140430,190405,0.1470,9061,50),
(@ca_rule_id,190405,265545,0.1680,13059,60),
(@ca_rule_id,265545,NULL,0.2050,22884,70);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1),
(@ca_rule_id,'basic_amount',13216),
(@ca_rule_id,'reduction_base',805),
(@ca_rule_id,'reduction_threshold',25570),
(@ca_rule_id,'reduction_limit',44952);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','NL','INCOME_TAX_PROVINCIAL','Canada NL 2026','income_tax','2026-07-01','2026-12-31','CA reviewed 2026-07-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jul/t4127-jul-payroll-deductions-formulas.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,44678,0.0870,0,10),
(@ca_rule_id,44678,89354,0.1450,2591,20),
(@ca_rule_id,89354,159528,0.1580,3753,30),
(@ca_rule_id,159528,223340,0.1780,6943,40),
(@ca_rule_id,223340,285319,0.1980,11410,50),
(@ca_rule_id,285319,570638,0.2080,14263,60),
(@ca_rule_id,570638,1141275,0.2130,17117,70),
(@ca_rule_id,1141275,NULL,0.2180,22823,80);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1),
(@ca_rule_id,'basic_amount',15000);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','PE','INCOME_TAX_PROVINCIAL','Canada PE 2026','income_tax','2026-07-01','2026-12-31','CA reviewed 2026-07-01','CRA / Revenu Quebec','https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4127-payroll-deductions-formulas/t4127-jul/t4127-jul-payroll-deductions-formulas.html');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,33928,0.0950,0,10),
(@ca_rule_id,33928,65820,0.1347,1347,20),
(@ca_rule_id,65820,106890,0.1660,3407,30),
(@ca_rule_id,106890,142520,0.1762,4497,40),
(@ca_rule_id,142520,200000,0.1900,6464,50),
(@ca_rule_id,200000,NULL,0.2100,10464,60);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1),
(@ca_rule_id,'basic_amount',15000);

INSERT INTO payroll_rule_sets (country_code,province_code,rule_code,rule_name,rule_category,effective_from,effective_to,version_label,source_name,source_url) VALUES ('CA','QC','INCOME_TAX_PROVINCIAL','Canada QC 2026','income_tax','2026-01-01','2026-12-31','CA reviewed 2026-01-01','CRA / Revenu Quebec','https://www.revenuquebec.ca/en/online-services/forms-and-publications/current-details/tp-1015-f-v/');
SET @ca_rule_id = LAST_INSERT_ID();

INSERT INTO payroll_rule_brackets (rule_set_id,lower_limit,upper_limit,rate,constant_amount,display_order) VALUES
(@ca_rule_id,0,54345,.14,0,10),
(@ca_rule_id,54345,108680,.19,2717,20),
(@ca_rule_id,108680,132245,.24,8151,30),
(@ca_rule_id,132245,NULL,.2575,10465,40);

INSERT INTO payroll_rule_parameters (rule_set_id,parameter_key,parameter_value) VALUES
(@ca_rule_id,'reviewed_2026',1),
(@ca_rule_id,'basic_amount',18952),
(@ca_rule_id,'worker_deduction_max',1450);
