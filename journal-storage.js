// IndexedDB is the primary journal store. localStorage is kept as a migration
// source and a small fallback for browsers that do not support IndexedDB.
(function () {
  const DB_NAME = "bean-notes-journal";
  const STORE_NAME = "snapshots";
  const SNAPSHOT_KEY = "reviews";
  const STORAGE_KEY = "bean-notes-coffee-journal-v1";
  const LEGACY_STORAGE_KEY = "steeped-coffee-journal-v2";

  function readLocal() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      const reviews = saved && JSON.parse(saved);
      return Array.isArray(reviews) ? reviews : null;
    } catch {
      return null;
    }
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) return reject(new Error("IndexedDB is unavailable"));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Could not open journal storage"));
      request.onblocked = () => reject(new Error("Journal storage is blocked by another tab"));
    });
  }

  async function readDatabase() {
    const database = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readonly");
        const request = transaction.objectStore(STORE_NAME).get(SNAPSHOT_KEY);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error("Could not read journal"));
        transaction.onabort = () => reject(transaction.error || new Error("Journal read was interrupted"));
      });
    } finally {
      database.close();
    }
  }

  async function writeDatabase(reviews) {
    const database = await openDatabase();
    try {
      await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE_NAME, "readwrite");
        transaction.objectStore(STORE_NAME).put(reviews, SNAPSHOT_KEY);
        // A request succeeding is not enough: only report success after commit.
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error("Could not save journal"));
        transaction.onabort = () => reject(transaction.error || new Error("Journal save was interrupted"));
      });
    } finally {
      database.close();
    }
  }

  async function load(fallbackReviews) {
    try {
      const stored = await readDatabase();
      if (Array.isArray(stored)) return stored;
    } catch (error) {
      console.warn("IndexedDB journal read failed; trying local backup", error);
    }

    const reviews = readLocal() || fallbackReviews;
    try {
      await writeDatabase(reviews);
    } catch (error) {
      console.warn("IndexedDB journal migration failed; local backup remains available", error);
    }
    return reviews;
  }

  async function save(reviews) {
    let databaseSaved = false;
    try {
      await writeDatabase(reviews);
      databaseSaved = true;
    } catch (error) {
      console.warn("IndexedDB journal save failed; trying local backup", error);
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
      return;
    } catch (error) {
      if (!databaseSaved) throw error;
      // The IndexedDB commit already succeeded; a full localStorage copy is optional.
      console.warn("Local journal backup is full; IndexedDB copy is saved", error);
    }
  }

  window.BeanNotesStorage = { load, save, readLocal };
})();
