interface Props {
  mini?: boolean;
}

// Suspenso na Fase C0 (contenção de integridade): a heurística de scores
// ideológicos não tem sustentação metodológica suficiente para exposição
// pública. Ver docs/auditoria-integridade-dados.md.
export default function Termometro({ mini = false }: Props) {
  if (mini) {
    return (
      <div className="text-[8.5px] text-subtle italic">
        Em revisão metodológica
      </div>
    );
  }

  return (
    <div className="border border-border2 rounded-sm bg-card px-3 py-[10px]">
      <div className="text-[10.5px] font-semibold text-ink mb-[3px]">
        Análise de padrões decisórios em revisão metodológica
      </div>
      <div className="text-[10px] text-subtle leading-[1.5]">
        Esta funcionalidade está temporariamente indisponível enquanto revisamos o
        corpus, os critérios de classificação, as amostras mínimas e o processo de
        validação.
      </div>
    </div>
  );
}
