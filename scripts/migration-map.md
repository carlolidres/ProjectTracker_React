# Google Sheets → Supabase Column Mapping

## PROJECTS → cnf_projects

| Sheet Column | Supabase Column |
|---|---|
| Record ID | record_id |
| project_id | project_id |
| project_owner | project_owner |
| activity_type | activity_type |
| client_name | client_name |
| so_no | so_no |
| fg_code | fg_code |
| product_name | product_name |
| batch_instance_id | batch_instance_id |
| unique_batch | unique_batch |
| mo_instance_id | mo_instance_id |
| mo_control_no | mo_control_no |
| po_instance_id | po_instance_id |
| po_control_no | po_control_no |
| fg_month | fg_month |
| business_unit | business_unit |
| updatedDocsVer | updateddocsver |
| cnf_reference | cnf_reference |
| qrmr_ref_no | qrmr_ref_no |
| change_description | change_description |
| cnf_status | cnf_status |
| client_approval_target_date | client_approval_target_date |
| remarks | remarks |
| cnf_entries_json | cnf_entries_json |
| manufacturing_start_week | manufacturing_start_week |
| mo_bmr_po_submission_status | mo_bmr_po_submission_status |
| mo_bmr_po_target_date | mo_bmr_po_target_date |
| mo_bmr_po_activation_status | mo_bmr_po_activation_status |
| mo_bmr_po_activation_date | mo_bmr_po_activation_date |
| protocol_no | protocol_no |
| protocol_Status | protocol_status |
| protocol_target_date | protocol_target_date |
| Val_Activity | val_activity |
| Val_Stability | val_stability |
| Val_Batch_Seq_No | val_batch_seq_no |
| Val_Strategy | val_strategy |
| Val_Strategy_remarks | val_strategy_remarks |
| val_report_no | val_report_no |
| Report_Sub_Status | report_sub_status |
| Report_target_Date | report_target_date |
| ar_availability_date | ar_availability_date |
| packaging_schedule | packaging_schedule |
| final_status | final_status |
| final_status_other | final_status_other |
| Created By | created_by |
| Created At | created_at |
| Updated By | updated_by |
| Updated At | updated_at |
| Is Active | is_active |

## SUPPORT_ACTIVITIES → support_activities

| Sheet Column | Supabase Column |
|---|---|
| activity_id | activity_id |
| project_id | project_id |
| activity_kind | activity_kind |
| Department | department |
| Material | material |
| Line | line |
| Bulk | bulk |
| Machinability_Protocol | machinability_protocol |
| Machinability_Protocol_Status | machinability_protocol_status |
| Machinability_Report | machinability_report |
| Machinability_Report_Status | machinability_report_status |
| Product_User | product_user |
| Principal | principal |
| Product | product |
| Target_Date | target_date |
| Planning_Schedule | planning_schedule |
| Created By | created_by |
| Created At | created_at |
| Updated By | updated_by |
| Updated At | updated_at |
| Is Active | is_active |

## Cleaning Rules

- Replace display `N/A` with database default `N/A` or empty string where appropriate
- Convert `Is Active` TRUE/FALSE strings to boolean
- Parse date strings to ISO timestamps where possible
- Preserve `project_id`, `batch_instance_id`, `mo_instance_id`, `po_instance_id`

## Run Migration

1. Export sheets to `exports/projects.csv` and `exports/support_activities.csv` (see `exports/README.md`)
2. Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (never commit)
3. Validate: `npm run migrate:validate`
4. Dry run: `npm run migrate:dry-run`
5. Import: `npm run migrate:import`
6. Verify: `npm run smoke:supabase`
