import { createHash } from "node:crypto";

const pageSize = 64;
const cursorPrefix = "idx_discovery_";

export class ToolDiscoveryCursorError extends Error { }

/** A cursor selects metadata within the current grant; it never supplies authority. */
export function getToolDiscoveryPage(allowedTools: ReadonlySet<string>, cursor: unknown) {
  const names = [...allowedTools].sort();
  const contextIndex = names.indexOf("get_my_business_context");
  if (contextIndex > 0) names.unshift(...names.splice(contextIndex, 1));
  const catalog = createHash("sha256").update(names.join("\n")).digest("hex");
  let offset = 0;
  if (cursor !== undefined) {
    const invalid = () => new ToolDiscoveryCursorError("Invalid tool discovery cursor.");
    if (typeof cursor !== "string" || cursor.length > 256 || !cursor.startsWith(cursorPrefix)) throw invalid();
    const encoded = cursor.slice(cursorPrefix.length);
    if (!/^[A-Za-z0-9_-]+$/.test(encoded)) throw invalid();
    let value: unknown;
    try {
      const bytes = Buffer.from(encoded, "base64url");
      if (bytes.toString("base64url") !== encoded) throw invalid();
      value = JSON.parse(bytes.toString("utf8"));
    } catch { throw invalid(); }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw invalid();
    const decoded = value as Record<string, unknown>;
    if (decoded.version !== 1 || typeof decoded.catalog !== "string"
      || !/^[a-f0-9]{64}$/.test(decoded.catalog) || !Number.isSafeInteger(decoded.offset)) throw invalid();
    if (decoded.catalog !== catalog) {
      throw new ToolDiscoveryCursorError("Tool catalog changed; restart tools/list without a cursor.");
    }
    offset = decoded.offset as number;
    if (offset < pageSize || offset >= names.length || offset % pageSize !== 0) throw invalid();
  }
  const nextOffset = offset + pageSize;
  const nextCursor = nextOffset < names.length
    ? cursorPrefix + Buffer.from(JSON.stringify({ version: 1, catalog, offset: nextOffset })).toString("base64url")
    : undefined;
  return { tools: new Set(names.slice(offset, nextOffset)), nextCursor };
}
