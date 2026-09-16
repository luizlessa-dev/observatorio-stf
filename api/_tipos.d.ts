/**
 * Substitui a dependência `@vercel/node` (removida — ver npm audit / decisão
 * de 2026-09-15). As duas funções serverless (checkout.ts, webhook.ts) só
 * usavam `import type { VercelRequest, VercelResponse }` de lá — nenhum
 * valor em runtime, só anotação de tipo — então bastava replicar a forma
 * exata dos tipos.
 *
 * Definição copiada literalmente de `@vercel/node@5.10.2`'s
 * `dist/index.d.ts` (VercelRequest/VercelResponse), pra não mudar
 * comportamento nenhum de type-checking. O runtime real da função
 * serverless, no ar na Vercel, já era o próprio `req`/`res` do Node.js
 * (IncomingMessage/ServerResponse) mais os campos que a plataforma injeta
 * (query/cookies/body parseado, os métodos send/json/status/redirect) —
 * isso nunca dependeu do pacote `@vercel/node` estar instalado; o pacote só
 * existia neste repositório para o TypeScript local enxergar essa forma.
 *
 * Por que remover em vez de só atualizar a versão: `npm audit` reportava 5
 * vulnerabilidades (das 7 totais do projeto) na árvore de dependências do
 * `@vercel/node` — path-to-regexp, undici, ajv (via @vercel/static-config).
 * Nenhuma delas é alcançável de verdade (é devDependency, usada só como
 * `import type`, apagada na compilação — o código dessas dependências nunca
 * roda nem em produção nem em nenhum script deste projeto), mas mesmo assim
 * a versão mais recente publicada (13.0.1, conferida em 2026-09-15) continua
 * fixando undici@5.28.4 e path-to-regexp@6.1.0 — ambos dentro da faixa
 * vulnerável. Não tem "atualizar" que resolva; só remover a dependência.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

export type VercelRequestQuery = { [key: string]: string | string[] };
export type VercelRequestCookies = { [key: string]: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mesma forma do tipo original de @vercel/node (body já vem parseado pela plataforma, sem tipo estático possível aqui)
export type VercelRequestBody = any;

export type VercelRequest = IncomingMessage & {
  query: VercelRequestQuery;
  cookies: VercelRequestCookies;
  body: VercelRequestBody;
};

export type VercelResponse = ServerResponse & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mesma forma do tipo original de @vercel/node
  send: (body: any) => VercelResponse;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mesma forma do tipo original de @vercel/node
  json: (jsonBody: any) => VercelResponse;
  status: (statusCode: number) => VercelResponse;
  redirect: (statusOrUrl: string | number, url?: string) => VercelResponse;
};
