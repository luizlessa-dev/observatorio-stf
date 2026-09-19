-- Corrige a unicidade de stf_distribuicao (migration 0031): (classe,
-- numero, tipo_andamento) não bastava — 319 processos foram
-- redistribuídos/registrados mais de uma vez dentro do próprio ano
-- corrente, cada evento com sua própria "Data do andamento". Descoberto
-- na primeira carga real (upsert em lote rejeitado por
-- "ON CONFLICT DO UPDATE command cannot affect row a second time"),
-- não em teste — por isso vira uma migration separada em vez de editar
-- a 0031 depois de aplicada.

alter table stf_distribuicao
  drop constraint stf_distribuicao_classe_numero_tipo_andamento_key;

alter table stf_distribuicao
  add constraint stf_distribuicao_classe_numero_tipo_andamento_data_andamento_key
  unique (classe, numero, tipo_andamento, data_andamento);
