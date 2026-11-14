import test from "node:test";
import assert from "node:assert/strict";
import { isInAppBrowser, safeStorageSet } from "../src/utils/browserCompatibility.js";

test("detects Instagram and other social in-app browsers", () => {
  assert.equal(isInAppBrowser("Mozilla/5.0 Instagram 320.0.0 Android"), true);
  assert.equal(isInAppBrowser("Mozilla/5.0 FBAN/FBIOS"), true);
  assert.equal(isInAppBrowser("Mozilla/5.0 Chrome/128.0 Safari/537.36"), false);
});

test("safe storage writes never crash restricted webviews", () => {
  const values = new Map();
  assert.equal(safeStorageSet({ setItem: (key, value) => values.set(key, value) }, "token", 123), true);
  assert.equal(values.get("token"), "123");
  assert.equal(safeStorageSet({ setItem: () => { throw new Error("blocked"); } }, "token", 123), false);
});
