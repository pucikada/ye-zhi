import assert from "node:assert/strict";
import test from "node:test";

import { removalIds, settleSelection } from "./canvas-changes";

test("尺寸和选中回声不会被当成删除或重新选中", () => {
  assert.deepEqual(
    removalIds([
      { type: "dimensions", id: "node-1" },
      { type: "select", id: "node-1" },
      { type: "position", id: "node-2" },
      { type: "remove", id: "node-3" },
    ]),
    ["node-3"],
  );

  let selected: string | null = "node-1";
  selected = settleSelection(selected, [], "clear");
  assert.equal(selected, null);
  selected = settleSelection(selected, ["node-1"], "echo");
  assert.equal(selected, null);
  selected = settleSelection(selected, ["node-4"], "click");
  assert.equal(selected, "node-4");
  selected = settleSelection(selected, ["node-4"], "echo");
  assert.equal(selected, "node-4");
  selected = settleSelection(selected, ["node-4", "node-5"], "echo");
  assert.equal(selected, "node-4");
});
