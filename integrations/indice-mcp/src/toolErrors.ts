import { IndiceApiError } from "./indiceClient.js";

export function toolError(error: unknown) {
  const known = error instanceof IndiceApiError;
  const reconnect = known && error.status === 401;
  const message = reconnect ? "La autorización de Índice venció o fue revocada. Vuelve a conectar tu cuenta."
    : known ? error.message : "No se pudo completar la consulta u operación en Índice. No confirmes que se realizó.";
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
    ...(reconnect && error.authenticate ? { _meta: { "mcp/www_authenticate": [error.authenticate] } } : {})
  };
}
