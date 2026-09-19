-- Permite que a pessoa desfaça a própria confirmação de presença num evento
-- (checkInToEvent só tinha insert — sem policy de delete, o RLS recusava
-- silenciosamente qualquer tentativa de desmarcar).

drop policy if exists attendance_delete on public.event_attendance;
create policy attendance_delete on public.event_attendance for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());
