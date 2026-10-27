import assert from "node:assert/strict";
import test from "node:test";
import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv-provider.js";
import type { JsonSchemaType } from "@modelcontextprotocol/sdk/validation/types.js";
import { compactToolSchema } from "../compactToolSchema.js";

const entry: JsonSchemaType = { type: "object", properties: {
  confirmation: { type: "string", pattern: "^idx_confirm_.*", minLength: 20 },
  amount: { type: "number", exclusiveMinimum: 0, multipleOf: 0.01 },
  currency: { type: "string", enum: ["MXN", "CAD"] }
}, required: ["confirmation", "amount", "currency"], additionalProperties: false };

test("local schema references preserve acceptance and rejection of complete nested contracts", () => {
  const schema: JsonSchemaType = { $schema: "http://json-schema.org/draft-07/schema#", type: "object",
    properties: { before: entry, after: entry, history: { type: "array", items: entry, maxItems: 2 } },
    required: ["before", "after"], additionalProperties: false };
  const original = structuredClone(schema);
  const compact = compactToolSchema(schema);
  assert.ok(JSON.stringify(compact).length < JSON.stringify(schema).length);
  assert.match(JSON.stringify(compact), /#\/definitions\/schema/);
  assert.deepEqual(schema, original, "Registered schemas must never be mutated");
  const provider = new AjvJsonSchemaValidator();
  const before = provider.getValidator(schema), after = provider.getValidator(compact);
  const valid = { confirmation: "idx_confirm_synthetic_1", amount: 1.25, currency: "MXN" };
  const samples: [unknown, boolean][] = [
    [{ before: valid, after: valid, history: [valid] }, true],
    [{ before: valid, after: { ...valid, amount: 0 } }, false],
    [{ before: valid, after: { ...valid, amount: -1 } }, false],
    [{ before: valid, after: { ...valid, amount: 1.255 } }, false],
    [{ before: valid, after: { ...valid, currency: "USD" } }, false],
    [{ before: valid, after: { ...valid, confirmation: "invalid" } }, false],
    [{ before: valid, after: { ...valid, extra: true } }, false],
    [{ before: valid, after: { amount: 1.25, currency: "CAD" } }, false],
    [{ before: valid, after: valid, extra: true }, false],
    [{ before: valid, after: valid, history: [valid, valid, valid] }, false]
  ];
  for (const [sample, accepted] of samples) {
    assert.equal(before(sample).valid, accepted);
    assert.equal(after(sample).valid, accepted);
  }
});

test("existing reference scopes, definitions and nested dialects remain untouched", () => {
  for (const keyword of ["$ref", "$id", "id", "$anchor", "$dynamicRef", "$dynamicAnchor",
    "$recursiveRef", "$recursiveAnchor", "definitions", "$defs"]) {
    const schema = { type: "object", properties: { before: entry, after: entry,
      scoped: { type: "object", [keyword]: keyword.includes("defs") || keyword === "definitions" ? {} : "existing" } } };
    assert.equal(compactToolSchema(schema), schema);
  }
  const dialect = { type: "object", properties: { before: entry, after: entry,
    nested: { $schema: "https://json-schema.org/draft/2020-12/schema", type: "string" } } };
  assert.equal(compactToolSchema(dialect), dialect);
});

test("schema-shaped enum, const, default and example data are never rewritten", () => {
  const literal = { $ref: "literal-not-a-schema", type: "object", properties: { before: entry, after: entry } };
  const schema = { type: "object", properties: { before: entry, after: entry,
    data: { const: literal, enum: [literal], default: literal, examples: [literal] } } };
  const compact = compactToolSchema(schema);
  assert.deepEqual(compact.properties.data, schema.properties.data);
  assert.notEqual(compact, schema, "Literal $ref data must not suppress safe schema compaction");
  assert.deepEqual(compactToolSchema(compact), compact, "Existing generated definitions must be stable");
  for (const simple of [true, false, null, {}, { type: "string" }]) assert.equal(compactToolSchema(simple), simple);
});
