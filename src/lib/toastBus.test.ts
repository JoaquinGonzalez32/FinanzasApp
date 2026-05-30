import { test } from "node:test";
import assert from "node:assert/strict";
import { toastBus } from "./toastBus.ts";

test("show() with no subscriber is a no-op (does not throw)", () => {
  assert.doesNotThrow(() => toastBus.show({ type: "info", message: "hola" }));
});

test("a subscriber receives subsequent show() payloads", () => {
  const seen: any[] = [];
  const unsub = toastBus.subscribe((cfg) => seen.push(cfg));
  toastBus.show({ type: "error", message: "boom" });
  unsub();
  assert.deepEqual(seen, [{ type: "error", message: "boom" }]);
});

test("unsubscribe stops further delivery", () => {
  const seen: any[] = [];
  const unsub = toastBus.subscribe((cfg) => seen.push(cfg));
  unsub();
  toastBus.show({ type: "info", message: "ignored" });
  assert.equal(seen.length, 0);
});

test("latest subscriber wins (single root host)", () => {
  const a: any[] = [];
  const b: any[] = [];
  const unsubA = toastBus.subscribe((cfg) => a.push(cfg));
  const unsubB = toastBus.subscribe((cfg) => b.push(cfg));
  toastBus.show({ type: "success", message: "yay" });
  unsubA();
  unsubB();
  assert.equal(a.length, 0);
  assert.deepEqual(b, [{ type: "success", message: "yay" }]);
});

test("unsubscribing a stale listener does not clobber the active one", () => {
  const a: any[] = [];
  const b: any[] = [];
  const unsubA = toastBus.subscribe((cfg) => a.push(cfg));
  const unsubB = toastBus.subscribe((cfg) => b.push(cfg));
  unsubA(); // A is stale; must not remove B
  toastBus.show({ type: "info", message: "for-b" });
  unsubB();
  assert.deepEqual(b, [{ type: "info", message: "for-b" }]);
});
