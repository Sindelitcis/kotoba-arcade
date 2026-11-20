// Ponto de entrada das Pages Functions: tudo em /api/* cai aqui. A lógica fica em nuvem/app.ts.
import { tratar, type Env } from '../../nuvem/app';

export const onRequest = (ctx: { request: Request; env: Env }): Promise<Response> => tratar(ctx.request, ctx.env);
