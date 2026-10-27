const schemaMaps = new Set(["properties", "patternProperties", "dependentSchemas", "dependencies"]);
const schemaArrays = new Set(["allOf", "anyOf", "oneOf", "prefixItems"]);
const schemaSingles = new Set(["additionalProperties", "additionalItems", "contains", "propertyNames",
  "not", "if", "then", "else", "unevaluatedProperties", "unevaluatedItems", "contentSchema"]);
const existingReferenceKeywords = new Set(["$ref", "$id", "id", "$anchor", "$dynamicRef",
  "$dynamicAnchor", "$recursiveRef", "$recursiveAnchor", "definitions", "$defs"]);
type SchemaObject = Record<string, unknown>;

function isObject(value: unknown): value is SchemaObject {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

/** Visit schema locations only. Defaults, enum/const values and examples are data. */
function mapChildren(schema: SchemaObject, visit: (child: unknown) => unknown): SchemaObject {
  return Object.fromEntries(Object.entries(schema).map(([key, value]) => {
    if (schemaMaps.has(key) && isObject(value)) {
      return [key, Object.fromEntries(Object.entries(value).map(([name, child]) => [name, visit(child)]))];
    }
    if (schemaArrays.has(key) && Array.isArray(value)) return [key, value.map(visit)];
    if (key === "items") return [key, Array.isArray(value) ? value.map(visit) : visit(value)];
    return [key, schemaSingles.has(key) ? visit(value) : value];
  }));
}

/** Lossless HTTP metadata encoding; registered validators and tool results stay unchanged. */
export function compactToolSchema<T>(schema: T): T {
  if (!isObject(schema)) return schema;
  const repeated = new Map<string, number>();
  let hasExistingReferenceScope = false;
  const count = (value: unknown): unknown => {
    if (!isObject(value)) return value;
    if (Object.keys(value).some(key => existingReferenceKeywords.has(key))
      || (value !== schema && "$schema" in value)) hasExistingReferenceScope = true;
    const key = JSON.stringify(value);
    if (key.length >= 64) repeated.set(key, (repeated.get(key) ?? 0) + 1);
    mapChildren(value, count);
    return value;
  };
  count(schema);
  // Existing reference bases/definitions are preserved byte-for-byte, never rebased.
  if (hasExistingReferenceScope) return schema;
  const definitions: SchemaObject = {};
  const names = new Map<string, string>();
  const render = (value: unknown, root = false): unknown => {
    if (!isObject(value)) return value;
    const key = JSON.stringify(value);
    if (!root && (repeated.get(key) ?? 0) > 1) {
      let name = names.get(key);
      if (!name) {
        name = "schema" + names.size;
        names.set(key, name);
        definitions[name] = mapChildren(value, child => render(child));
      }
      return { $ref: "#/definitions/" + name };
    }
    return mapChildren(value, child => render(child));
  };
  const result = render(schema, true) as SchemaObject;
  if (!names.size) return schema;
  const candidate = { ...result, definitions };
  return JSON.stringify(candidate).length < JSON.stringify(schema).length ? candidate as T : schema;
}
