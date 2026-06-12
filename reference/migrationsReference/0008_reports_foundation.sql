-- Reports and CSV export foundation.
-- Extends the existing audit-ready auth activity event whitelist for report export traceability.

alter table public.auth_activity_log
  drop constraint if exists auth_activity_log_event_type_check,
  add constraint auth_activity_log_event_type_check
    check (
      event_type in (
        'sign_up_created',
        'login_success',
        'failed_login',
        'status_check',
        'sign_out',
        'user_activated',
        'user_deactivated',
        'user_reactivated',
        'user_role_changed',
        'user_department_changed',
        'user_profile_updated',
        'cnf_created',
        'cnf_updated',
        'cnf_archived',
        'cnf_restored',
        'notification_created',
        'notification_read',
        'notification_unread',
        'notification_all_read',
        'report_exported'
      )
    );
