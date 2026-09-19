-- Corrige o tipo de stf_informacao_sociedade.numero (migration 0034):
-- "Número" nesta fonte nem sempre é puramente numérico — ex. "1072485-ED"
-- (embargos de declaração). Descoberto na primeira carga real, não em
-- teste.

alter table stf_informacao_sociedade alter column numero type text using numero::text;
