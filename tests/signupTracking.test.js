import { test } from "node:test";
import assert from "node:assert/strict";
import { trackSignup } from "../src/utils/signupTracking.js";

let nextId = 0;
function setup(href = "https://jobs.marketlence.com/signup") {
  const events = [];
  const values = new Map();
  const browser = {
    location: new URL(href),
    sessionStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
    gtag: (...args) => events.push(args),
  };
  return { browser, events, data: { isNewUser: true, role: "user", userId: ++nextId } };
}
const candidate = { accountType: "candidate", method: "email" };

test("successful creation sends separate signup events without account details", () => {
  const { browser, events, data } = setup();
  assert.equal(trackSignup({ ...data, email: "private@example.test", token: "secret" }, candidate, browser), true);
  assert.deepEqual(events, [
    ["event", "sign_up", { send_to: "G-7P327WF7Y8", method: "email", account_type: "candidate" }],
    ["event", "candidate_signup", { send_to: "G-7P327WF7Y8", method: "email", account_type: "candidate" }],
  ]);
});
test("returning Google users and unconfirmed responses are not signups", () => {
  const { browser, events, data } = setup();
  for (const isNewUser of [false, undefined, "true"]) {
    assert.equal(trackSignup({ ...data, isNewUser }, { ...candidate, method: "Google" }, browser), false);
  }
  assert.equal(events.length, 0);
});
test("employer Google account creation is tracked distinctly", () => {
  const { browser, events, data } = setup();
  assert.equal(trackSignup({ ...data, role: "employer" }, { accountType: "employer", method: "Google" }, browser), true);
  assert.equal(events[1][1], "employer_signup");
});
test("repeated responses do not double count the same account", () => {
  const { browser, events, data } = setup();
  trackSignup(data, candidate, browser);
  assert.equal(trackSignup(data, candidate, browser), false);
  assert.equal(events.length, 2);
});
test("test exclusion survives navigation and can be explicitly disabled", () => {
  const { browser, events, data } = setup("https://jobs.marketlence.com/signup?ml_test=1");
  assert.equal(trackSignup(data, candidate, browser), false);
  browser.location = new URL("https://jobs.marketlence.com/signup");
  assert.equal(trackSignup(data, candidate, browser), false);
  assert.equal(events.length, 0);
  browser.location = new URL("https://jobs.marketlence.com/signup?ml_test=0");
  assert.equal(trackSignup(data, candidate, browser), true);
});
test("development hosts, missing IDs and non-candidate roles are excluded", () => {
  const { browser, events, data } = setup("http://localhost:5173/signup");
  assert.equal(trackSignup(data, candidate, browser), false);
  browser.location = new URL("https://jobs.marketlence.com/signup");
  assert.equal(trackSignup({ ...data, userId: undefined }, candidate, browser), false);
  assert.equal(trackSignup({ ...data, role: "admin" }, candidate, browser), false);
  assert.equal(events.length, 0);
});
test("missing tag, unavailable storage and tag errors never break signup", () => {
  for (const failure of ["tag", "storage", "throw"]) {
    const { browser, data } = setup();
    if (failure === "tag") delete browser.gtag;
    if (failure === "storage") browser.sessionStorage.getItem = () => { throw new Error("Storage unavailable"); };
    if (failure === "throw") browser.gtag = () => { throw new Error("Tag unavailable"); };
    assert.equal(trackSignup(data, candidate, browser), false);
  }
  assert.equal(trackSignup({}, candidate, undefined), false);
});
