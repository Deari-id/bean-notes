const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "..", "journal-storage.js"), "utf8");

function createStorage({ indexedDbAvailable = true, localWriteFails = false, localReviews = null } = {}) {
  const databaseRows = new Map();
  const localRows = new Map();
  if (localReviews) localRows.set("bean-notes-coffee-journal-v1", JSON.stringify(localReviews));

  const database = {
    createObjectStore() {},
    close() {},
    transaction() {
      const transaction = {
        objectStore() {
          return {
            get(key) {
              const request = {};
              queueMicrotask(() => {
                request.result = databaseRows.get(key);
                request.onsuccess();
              });
              return request;
            },
            put(value, key) {
              queueMicrotask(() => {
                databaseRows.set(key, value);
                transaction.oncomplete();
              });
            }
          };
        }
      };
      return transaction;
    }
  };
  const indexedDB = indexedDbAvailable ? {
    open() {
      const request = {};
      queueMicrotask(() => {
        request.result = database;
        request.onupgradeneeded();
        request.onsuccess();
      });
      return request;
    }
  } : undefined;
  const localStorage = {
    getItem(key) { return localRows.get(key) || null; },
    setItem(key, value) {
      if (localWriteFails) throw new Error("QuotaExceededError");
      localRows.set(key, value);
    }
  };
  const window = { indexedDB };
  vm.runInNewContext(source, { window, indexedDB, localStorage, console: { warn() {} }, queueMicrotask });
  return { store: window.BeanNotesStorage, databaseRows, localRows };
}

test("migrates existing local reviews into IndexedDB", async () => {
  const oldReviews = [{ id: "old", name: "Old bean" }];
  const { store, databaseRows } = createStorage({ localReviews: oldReviews });
  assert.equal(JSON.stringify(await store.load([])), JSON.stringify(oldReviews));
  assert.equal(JSON.stringify(databaseRows.get("reviews")), JSON.stringify(oldReviews));
});

test("keeps a photo in IndexedDB when localStorage is full", async () => {
  const reviews = [{ id: "photo", photo: "data:image/jpeg;base64,abc" }];
  const { store, databaseRows } = createStorage({ localWriteFails: true });
  await store.save(reviews);
  assert.equal(JSON.stringify(databaseRows.get("reviews")), JSON.stringify(reviews));
  assert.equal(JSON.stringify(await store.load([])), JSON.stringify(reviews));
});

test("rejects a save when neither storage backend works", async () => {
  const { store } = createStorage({ indexedDbAvailable: false, localWriteFails: true });
  await assert.rejects(store.save([{ id: "unsaved" }]), /QuotaExceededError/);
});

test("falls back to localStorage when IndexedDB is unavailable", async () => {
  const reviews = [{ id: "fallback", name: "Fallback bean" }];
  const { store, localRows } = createStorage({ indexedDbAvailable: false });
  await store.save(reviews);
  assert.equal(localRows.get("bean-notes-coffee-journal-v1"), JSON.stringify(reviews));
  assert.equal(JSON.stringify(await store.load([])), JSON.stringify(reviews));
});
