import { z } from "zod";

const lngLat = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);

// Pedido de rota. Vai no corpo de um POST (e não na URL) para que origem e
// destino não fiquem nos registros de acesso da hospedagem (regra 8, D20).
export const routeRequestSchema = z.object({
  o: lngLat,
  d: lngLat,
  mode: z.enum(["walk", "drive"]),
  bucket: z.number().int().min(0).max(7),
});

export type RouteRequest = z.infer<typeof routeRequestSchema>;
