-- Persist generated official e-receipt HTML at approval (email + reprint).

alter table public.class_payments
  add column if not exists receipt_html text not null default '';

comment on column public.class_payments.receipt_html is
  'Generated official e-receipt HTML snapshot when payment is approved (email and print).';
