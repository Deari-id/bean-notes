const config = window.BEAN_NOTES_CLOUD || {};
const app = window.BeanNotesApp;
const DELETED_KEY = "bean-notes-deleted-reviews-v1";
const LAST_SYNC_KEY = "bean-notes-last-synced-v1";
const PHOTO_BUCKET = "coffee-photos";

const ui = {
  button: document.querySelector("#cloudSyncButton"),
  dialog: document.querySelector("#cloudDialog"),
  close: document.querySelector("#closeCloudButton"),
  setup: document.querySelector("#cloudSetupState"),
  signedOut: document.querySelector("#cloudSignedOutState"),
  signedIn: document.querySelector("#cloudSignedInState"),
  form: document.querySelector("#cloudSignInForm"),
  email: document.querySelector("#cloudEmailInput"),
  emailButton: document.querySelector("#cloudEmailButton"),
  authMessage: document.querySelector("#cloudAuthMessage"),
  accountEmail: document.querySelector("#cloudAccountEmail"),
  status: document.querySelector("#cloudStatusText"),
  lastSynced: document.querySelector("#cloudLastSynced"),
  syncNow: document.querySelector("#cloudSyncNowButton"),
  signOut: document.querySelector("#cloudSignOutButton")
};

let client = null;
let currentUser = null;
let syncInProgress = false;
let syncTimer = null;

function isConfigured() {
  return /^https:\/\//.test(config.url || "") && (config.publishableKey || "").length > 20;
}

function showCloudState(state) {
  ui.setup.hidden = state !== "setup";
  ui.signedOut.hidden = state !== "signed-out";
  ui.signedIn.hidden = state !== "signed-in";
}

function setStatus(state, text) {
  ui.button.dataset.state = state;
  if (text) ui.status.textContent = text;
}

function updateLastSynced() {
  const value = localStorage.getItem(LAST_SYNC_KEY);
  ui.lastSynced.textContent = value
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Not yet";
}

function getDeletedReviews() {
  try { return JSON.parse(localStorage.getItem(DELETED_KEY) || "[]"); }
  catch { return []; }
}

function saveDeletedReviews(items) {
  localStorage.setItem(DELETED_KEY, JSON.stringify(items));
}

function dataUrlToBlob(dataUrl) {
  const [header, encoded] = dataUrl.split(",");
  const mime = header.match(/data:([^;]+)/)?.[1] || "image/jpeg";
  const bytes = atob(encoded);
  const array = new Uint8Array(bytes.length);
  for (let index = 0; index < bytes.length; index += 1) array[index] = bytes.charCodeAt(index);
  return new Blob([array], { type: mime });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function toCloudRow(review, userId) {
  return {
    id: review.id,
    user_id: userId,
    name: review.name,
    roaster: review.roaster || "",
    origin: review.origin || "",
    process: review.process || "",
    brew: review.brew || "",
    tasting_notes: review.tastingNotes || [],
    notes: review.notes || "",
    rating: Number(review.rating),
    favorite_rating: review.favoriteRating == null ? null : Number(review.favoriteRating),
    photo_path: review.photoPath || null,
    color: review.color || "#d9a56f",
    created_at: review.createdAt,
    updated_at: review.updatedAt || review.createdAt
  };
}

function fromCloudRow(row, photo = "") {
  return {
    id: row.id,
    name: row.name,
    roaster: row.roaster || "",
    origin: row.origin || "",
    process: row.process || "",
    brew: row.brew || "",
    tastingNotes: row.tasting_notes || [],
    notes: row.notes || "",
    rating: Number(row.rating),
    favoriteRating: row.favorite_rating == null ? null : Number(row.favorite_rating),
    photo,
    photoPath: row.photo_path || "",
    color: row.color || "#d9a56f",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sample: false
  };
}

async function uploadReviewPhoto(review) {
  if (!review.photo?.startsWith("data:")) return review.photoPath || "";
  const path = `${currentUser.id}/${review.id}.jpg`;
  const { error } = await client.storage.from(PHOTO_BUCKET).upload(path, dataUrlToBlob(review.photo), {
    contentType: "image/jpeg",
    upsert: true
  });
  if (error) throw error;
  return path;
}

async function downloadReviewPhoto(path) {
  if (!path) return "";
  const { data, error } = await client.storage.from(PHOTO_BUCKET).download(path);
  if (error) throw error;
  return blobToDataUrl(data);
}

async function processDeletions() {
  const deleted = getDeletedReviews();
  if (!deleted.length) return;
  const ids = deleted.map(item => item.id);
  const paths = deleted.map(item => item.photoPath).filter(Boolean);

  if (paths.length) {
    const { error: storageError } = await client.storage.from(PHOTO_BUCKET).remove(paths);
    if (storageError) throw storageError;
  }

  const { error } = await client.from("coffee_reviews").delete().in("id", ids);
  if (error) throw error;
  saveDeletedReviews([]);
}

async function syncNow({ quiet = false } = {}) {
  if (!client || !currentUser || syncInProgress || !navigator.onLine) return;
  syncInProgress = true;
  setStatus("syncing", "Syncing…");
  ui.syncNow.disabled = true;

  try {
    await processDeletions();
    const localReviews = app.getReviews();
    const localPersonal = localReviews.filter(review => !review.sample);

    const { data: firstCloudRows, error: fetchError } = await client
      .from("coffee_reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (fetchError) throw fetchError;

    const firstCloudMap = new Map((firstCloudRows || []).map(row => [row.id, row]));
    const rowsToUpload = [];

    for (const review of localPersonal) {
      const cloudReview = firstCloudMap.get(review.id);
      const localUpdated = new Date(review.updatedAt || review.createdAt).getTime();
      const cloudUpdated = cloudReview ? new Date(cloudReview.updated_at).getTime() : 0;
      if (!cloudReview || localUpdated >= cloudUpdated) {
        if (cloudReview?.photo_path && !review.photo) {
          const { error: photoDeleteError } = await client.storage
            .from(PHOTO_BUCKET)
            .remove([cloudReview.photo_path]);
          if (photoDeleteError) throw photoDeleteError;
          review.photoPath = "";
        }
        review.photoPath = await uploadReviewPhoto(review);
        rowsToUpload.push(toCloudRow(review, currentUser.id));
      }
    }

    if (rowsToUpload.length) {
      const { error: uploadError } = await client.from("coffee_reviews").upsert(rowsToUpload, { onConflict: "id" });
      if (uploadError) throw uploadError;
    }

    const { data: cloudRows, error: finalFetchError } = await client
      .from("coffee_reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (finalFetchError) throw finalFetchError;

    const localMap = new Map(localPersonal.map(review => [review.id, review]));
    const merged = [];
    for (const row of cloudRows || []) {
      const local = localMap.get(row.id);
      const cloudIsNewer = !local || new Date(row.updated_at) > new Date(local.updatedAt || local.createdAt);
      if (!cloudIsNewer) {
        merged.push(local);
        continue;
      }
      let photo = local?.photo || "";
      if (row.photo_path && (!local || local.photoPath !== row.photo_path || !photo)) {
        photo = await downloadReviewPhoto(row.photo_path);
      }
      merged.push(fromCloudRow(row, photo));
    }

    const samples = localReviews.filter(review => review.sample);
    app.replaceReviews([...merged, ...samples]);
    const syncedAt = new Date().toISOString();
    localStorage.setItem(LAST_SYNC_KEY, syncedAt);
    updateLastSynced();
    setStatus("synced", "Up to date");
    if (!quiet) app.showToast("Journal synced across your devices");
  } catch (error) {
    console.error("Bean Notes sync failed", error);
    setStatus("error", "Sync needs attention");
    const message = /favorite_rating/i.test(error.message || "")
      ? "Cloud update needed: add the Favorite rating column in Supabase. Your reviews remain on this device."
      : (error.message || "Cloud sync failed");
    if (!quiet) app.showToast(message);
  } finally {
    syncInProgress = false;
    ui.syncNow.disabled = false;
  }
}

function scheduleSync() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncNow({ quiet: true }), 650);
}

async function initializeCloud() {
  if (!isConfigured()) {
    setStatus("setup");
    showCloudState("setup");
    return;
  }

  setStatus("ready");
  try {
    const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
    client = createClient(config.url, config.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data } = await client.auth.getSession();
    currentUser = data.session?.user || null;
    renderAccountState();

    client.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      renderAccountState();
      if (currentUser) setTimeout(() => syncNow({ quiet: true }), 0);
    });
  } catch (error) {
    console.error("Cloud initialization failed", error);
    setStatus("error");
    showCloudState("setup");
  }
}

function renderAccountState() {
  if (!currentUser) {
    showCloudState("signed-out");
    setStatus("ready");
    return;
  }
  showCloudState("signed-in");
  ui.accountEmail.textContent = currentUser.email || "Signed-in account";
  updateLastSynced();
  setStatus("synced", "Ready to sync");
}

ui.button.addEventListener("click", () => ui.dialog.showModal());
ui.close.addEventListener("click", () => ui.dialog.close());
ui.dialog.addEventListener("click", event => { if (event.target === ui.dialog) ui.dialog.close(); });

ui.form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!client) return;
  ui.emailButton.disabled = true;
  ui.authMessage.textContent = "Sending your secure link…";
  try {
    if (location.protocol === "file:") {
      ui.authMessage.textContent = "Sign-in links require the published HTTPS app. Open Bean Notes in Safari or Chrome, then try again.";
      return;
    }
    const redirectTo = `${location.origin}${location.pathname}`;
    const { error } = await client.auth.signInWithOtp({
      email: ui.email.value.trim(),
      options: { emailRedirectTo: redirectTo }
    });
    if (error) throw error;
    ui.authMessage.textContent = "Check your email, then open the sign-in link on this device.";
  } catch (error) {
    console.error("Bean Notes sign-in failed", error);
    const message = error.message || "";
    ui.authMessage.textContent = /invalid api key|unauthorized_invalid_api_key/i.test(message)
      ? "Cloud setup needs a valid Supabase publishable key. Your reviews remain saved on this device."
      : /load failed|failed to fetch|network|fetch failed/i.test(message)
        ? "The browser could not reach Supabase. Open the published app in Safari or Chrome, check your connection, and try again."
        : /rate.limit|too many requests|email rate/i.test(message)
          ? "Too many sign-in attempts. Please wait a little before trying again."
          : message || "Could not send the sign-in link. Please try again.";
  } finally {
    ui.emailButton.disabled = false;
  }
});

ui.syncNow.addEventListener("click", () => syncNow());
ui.signOut.addEventListener("click", async () => {
  if (!client) return;
  await client.auth.signOut();
  app.showToast("Signed out of cloud sync");
});

window.addEventListener("bean-notes:changed", scheduleSync);
window.addEventListener("bean-notes:review-deleted", event => {
  const deleted = getDeletedReviews();
  deleted.push(event.detail);
  saveDeletedReviews(deleted);
  scheduleSync();
});
window.addEventListener("online", scheduleSync);

initializeCloud();
