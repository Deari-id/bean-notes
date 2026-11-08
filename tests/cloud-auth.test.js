const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "cloud.js"), "utf8");

function setup(auth, hash = "") {
  const elements = new Map();
  const local = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      value: "", hidden: false, disabled: false, textContent: "", dataset: {}, handlers: {},
      addEventListener(name, handler) { this.handlers[name] = handler; },
      reportValidity() { return true; },
      reset() { this.resetCalled = true; },
      showModal() { this.open = true; }, close() { this.open = false; }
    });
    return elements.get(selector);
  };
  const context = vm.createContext({
    window: { BEAN_NOTES_CLOUD: {}, BeanNotesApp: {}, addEventListener() {} },
    document: { querySelector: element },
    location: { protocol: "https:", origin: "https://example.test", pathname: "/bean-notes/", hash, search: "" },
    localStorage: { getItem: key => local.get(key), setItem: (key, value) => local.set(key, value) },
    URLSearchParams, setTimeout: () => 1, clearTimeout() {},
    testClient: { auth }, console
  });
  vm.runInContext(source, context);
  vm.runInContext("client = testClient", context);
  return { element, local, context, submit: selector => element(selector).handlers.submit({ preventDefault() {} }) };
}

test("password login creates a session in the current app without an email redirect", async () => {
  let credentials;
  const page = setup({ signInWithPassword: async input => {
    credentials = input;
    return { data: { session: { user: { id: "user", email: "test@example.test" } } } };
  } });
  page.element("#cloudEmailInput").value = " test@example.test ";
  page.element("#cloudPasswordInput").value = "test-password";
  await page.submit("#cloudSignInForm");
  assert.equal(credentials.email, "test@example.test");
  assert.equal(credentials.password, "test-password");
  assert.equal(page.element("#cloudSignedInState").hidden, false);
  assert.equal(page.element("#cloudPasswordInput").value, "");
  assert.equal(page.local.size, 0);
});

test("failed password login stays signed out and explains email-link account setup", async () => {
  const page = setup({ signInWithPassword: async () => ({ error: { message: "Invalid login credentials" } }) });
  await page.submit("#cloudSignInForm");
  assert.match(page.element("#cloudAuthMessage").textContent, /set a password in Cloud sync/);
  assert.equal(page.element("#cloudSignedInState").hidden, true);
  assert.equal(page.element("#cloudEmailButton").disabled, false);
});

test("setting a password requires matching values and an authenticated session", async () => {
  let updates = 0;
  const page = setup({ updateUser: async () => { updates++; return {}; } });
  vm.runInContext('currentUser = { id: "user" }', page.context);
  page.element("#cloudNewPasswordInput").value = "test-password";
  page.element("#cloudConfirmPasswordInput").value = "different-password";
  await page.submit("#cloudSetPasswordForm");
  assert.equal(updates, 0);
  assert.match(page.element("#cloudPasswordMessage").textContent, /do not match/);
  page.element("#cloudConfirmPasswordInput").value = "test-password";
  await page.submit("#cloudSetPasswordForm");
  assert.equal(updates, 1);
  assert.equal(page.element("#cloudSetPasswordForm").resetCalled, true);
  assert.match(page.element("#cloudPasswordMessage").textContent, /Password saved/);
  assert.equal(page.local.size, 0);
});

test("email-link fallback keeps the published redirect and explains the Home Screen handoff", async () => {
  let request;
  const page = setup({ signInWithOtp: async input => { request = input; return {}; } });
  page.element("#cloudEmailInput").value = "test@example.test";
  await page.element("#cloudMagicLinkButton").handlers.click();
  assert.equal(request.options.emailRedirectTo, "https://example.test/bean-notes/");
  assert.match(page.element("#cloudAuthMessage").textContent, /Home Screen app/);
});

test("returning from an email link opens password setup for the signed-in account", () => {
  const page = setup({}, "#access_token=test-only");
  vm.runInContext('currentUser = { id: "user", email: "test@example.test" }; renderAccountState()', page.context);
  assert.equal(page.element("#cloudDialog").open, true);
  assert.equal(page.element("#cloudPasswordSettings").open, true);
  assert.match(page.element("#cloudPasswordMessage").textContent, /Home Screen/);
});
