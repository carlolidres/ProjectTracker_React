import assert from "node:assert/strict";
import {
  applyNavHistoryTransition,
  canGoBack,
  canGoForward,
  createInitialNavHistory,
  isSameNavEntry,
  NAV_HISTORY_MAX_ENTRIES,
  type NavHistoryEntry,
} from "../src/lib/navigationHistory";

function entry(key: string, pathname: string, search = ""): NavHistoryEntry {
  return { key, pathname, search };
}

assert.equal(isSameNavEntry(entry("a", "/dashboard"), entry("b", "/dashboard")), true);
assert.equal(isSameNavEntry(entry("a", "/dashboard"), entry("b", "/projects", "?x=1")), false);

let state = createInitialNavHistory(entry("k0", "/dashboard"));
assert.equal(canGoBack(state), false);
assert.equal(canGoForward(state), false);

state = applyNavHistoryTransition(state, entry("k1", "/projects", "?projectId=1"), "PUSH");
assert.equal(state.index, 1);
assert.equal(canGoBack(state), true);
assert.equal(canGoForward(state), false);

// Same URL with a new key (overlay-style history) advances the stack.
state = applyNavHistoryTransition(state, entry("k1b", "/projects", "?projectId=1"), "PUSH");
assert.equal(state.entries.length, 3);
assert.equal(state.index, 2);
assert.equal(state.entries[2]?.key, "k1b");

// Identical key + identity is a no-op.
const beforeNoop = state.entries.length;
state = applyNavHistoryTransition(state, entry("k1b", "/projects", "?projectId=1"), "PUSH");
assert.equal(state.entries.length, beforeNoop);
assert.equal(state.index, 2);

state = applyNavHistoryTransition(state, entry("k2", "/cnf-tracker"), "PUSH");
assert.equal(state.entries.length, 4);
assert.equal(state.index, 3);

state = applyNavHistoryTransition(state, entry("k1b", "/projects", "?projectId=1"), "POP");
assert.equal(state.index, 2);
assert.equal(canGoBack(state), true);
assert.equal(canGoForward(state), true);

state = applyNavHistoryTransition(state, entry("k3", "/projects", "?projectId=1&tab=x"), "REPLACE");
assert.equal(state.entries.length, 4);
assert.equal(state.index, 2);
assert.equal(state.entries[2]?.search, "?projectId=1&tab=x");

// Forward stack truncated on PUSH after back.
state = applyNavHistoryTransition(state, entry("k4", "/support-activities"), "PUSH");
assert.equal(state.entries.length, 4);
assert.equal(state.index, 3);
assert.equal(canGoForward(state), false);

// Cap stack size.
state = createInitialNavHistory(entry("s0", "/dashboard"));
for (let i = 1; i <= NAV_HISTORY_MAX_ENTRIES + 5; i += 1) {
  state = applyNavHistoryTransition(state, entry(`s${i}`, `/p${i}`), "PUSH");
}
assert.ok(state.entries.length <= NAV_HISTORY_MAX_ENTRIES);
assert.equal(state.index, state.entries.length - 1);

console.log("verify-navigation-history: PASS");
