#!/usr/bin/env bash
# Backfill de stf_decisoes, ano a ano (achado D1).
#
# Roda o conector Qlik para cada ano do intervalo. É seguro interromper e
# retomar: o upsert usa id_fato_decisao como chave natural, então reexecutar
# um ano já ingerido não duplica nada (validado em 2026-08-18: duas execuções
# completas de 2026, 71.961 chaves distintas, zero duplicatas).
#
# Um ano que falhar NÃO derruba o backfill inteiro — fica registrado no
# resumo final para ser reexecutado sozinho. Falhar em silêncio é o que esta
# ingestão inteira veio corrigir.
#
# Uso:
#   scripts/backfill_decisoes.sh 2000 2025
#   scripts/backfill_decisoes.sh 2015 2015    # um ano só, para retomar
set -uo pipefail

DE="${1:?ano inicial}"
ATE="${2:?ano final}"
LOGDIR="${LOGDIR:-/tmp/backfill-stf}"
mkdir -p "$LOGDIR"

RESUMO="$LOGDIR/_resumo.txt"
: > "$RESUMO"

falhas=()
total=0

for ano in $(seq "$DE" "$ATE"); do
  log="$LOGDIR/$ano.log"
  inicio=$(date -u +%s)
  echo "[$(date -u +%H:%M:%S)] ano $ano ..." | tee -a "$RESUMO"

  if python3 -u ingestao/stf/fetch_decisoes_qlik.py --ano "$ano" --escrever > "$log" 2>&1; then
    n=$(grep -oE '^[0-9.]+ registros gravados' "$log" | head -1 | grep -oE '^[0-9.]+' || echo "?")
    dur=$(( $(date -u +%s) - inicio ))
    echo "  ok  $ano: $n linhas em ${dur}s" | tee -a "$RESUMO"
    total=$((total + 1))
  else
    falhas+=("$ano")
    echo "  FALHA $ano — ver $log" | tee -a "$RESUMO"
    tail -3 "$log" | sed 's/^/    /' | tee -a "$RESUMO"
  fi
done

echo "" | tee -a "$RESUMO"
echo "anos concluídos: $total de $(( ATE - DE + 1 ))" | tee -a "$RESUMO"
if [ ${#falhas[@]} -gt 0 ]; then
  echo "anos com falha: ${falhas[*]}" | tee -a "$RESUMO"
  echo "reexecute com: scripts/backfill_decisoes.sh <ano> <ano>" | tee -a "$RESUMO"
  exit 1
fi
echo "backfill completo, sem falhas" | tee -a "$RESUMO"
