-- New portal request type (must be committed before use in 113).
alter type public.portal_request_type add value if not exists 'member_enrollment_cancellation';
