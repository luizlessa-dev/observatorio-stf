const MESES = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

/** "2002-06-20" → "20 jun 2002". Devolve a entrada se não for ISO. */
export function fmtData(iso: string | null): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return iso ?? "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia} ${MESES[parseInt(mes, 10) - 1]} ${ano}`;
}

/** Achado B4: o ano só some quando a decisão é do ano corrente. */
export function fmtDataCurta(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  const curto = `${dia} ${MESES[parseInt(mes, 10) - 1]}`;
  return ano === String(new Date().getFullYear()) ? curto : `${curto} ${ano}`;
}

export function fmtMes(mes: number, ano: number) {
  return `${MESES[mes - 1]}/${ano}`;
}

export function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function fmtNum(v: number) {
  return v.toLocaleString("pt-BR");
}
