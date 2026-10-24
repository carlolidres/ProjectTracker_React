-- The API role can reach these tables. Row policies still decide which projects a person can read or change.

grant select, insert, update, delete on public.pm_board_labels to authenticated;
grant select, insert, update, delete on public.pm_board_columns to authenticated;
grant select, insert, update, delete on public.pm_board_cell_values to authenticated;
