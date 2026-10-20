import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeAudience,
  audienceQuery,
} from "../src/app/BasicModules/Sales/Mailing/audienceModel.ts";
const contact = (id) => ({
  id,
  name: `Person ${id}`,
  email: `contact${id}@example.com`,
});
test("selection persists across pages and merges current identities without duplicating contacts", () => {
  const initial = [contact(1), contact(2)];
  const result = mergeAudience(initial, [
    { ...contact(2), name: "Updated" },
    contact(3),
  ]);
  assert.deepEqual(
    result.map((c) => c.id),
    [1, 2, 3],
  );
  assert.equal(result[1].name, "Updated");
  assert.equal(initial[1].name, "Person 2");
});
test("bulk selection accepts exactly 500 and refuses overflow without truncating the current audience", () => {
  const current = Array.from({ length: 499 }, (_, i) => contact(i + 1));
  assert.equal(mergeAudience(current, [contact(500)]).length, 500);
  assert.equal(mergeAudience(current, [contact(500), contact(501)]), null);
  assert.equal(current.length, 499);
});
test("all-results query keeps the exact filtered scope and omits page controls", () => {
  const q = audienceQuery(
    {
      search: "Ana & clinic",
      source: "website",
      owner: "17",
      tag: "salud",
      eligibility: "READY",
      listId: "all",
    },
    "email",
    "desc",
  );
  assert.equal(q.get("search"), "Ana & clinic");
  assert.equal(q.get("owner"), "17");
  assert.equal(q.get("tag"), "salud");
  assert.equal(q.get("eligibility"), "READY");
  assert.equal(q.has("listId"), false);
  assert.equal(q.has("page"), false);
});
