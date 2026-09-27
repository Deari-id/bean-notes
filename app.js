const STORAGE_KEY = "bean-notes-coffee-journal-v1";
const THEME_KEY = "bean-notes-theme";
const LEGACY_STORAGE_KEY = "steeped-coffee-journal-v2";
const LEGACY_THEME_KEY = "steeped-theme";

const seedReviews = [
  {
    id: "sample-1",
    name: "Worka Sakaro",
    roaster: "Dayglow Coffee",
    origin: "Ethiopia",
    process: "Washed",
    brew: "V60",
    tastingNotes: ["Bergamot", "Peach", "Jasmine"],
    notes: "Bright and tea-like, with a soft peach sweetness as it cools. Beautiful on a slower pour.",
    rating: 4.8,
    photo: "",
    color: "#d9a56f",
    createdAt: "2026-08-30T08:20:00.000Z",
    sample: true
  },
  {
    id: "sample-2",
    name: "Los Pirineos",
    roaster: "Wide Awake",
    origin: "El Salvador",
    process: "Natural",
    brew: "Aeropress",
    tastingNotes: ["Cacao", "Cherry", "Brown sugar"],
    notes: "Round and jammy with a cocoa finish. Very forgiving and sweet, even at a stronger ratio.",
    rating: 4.5,
    photo: "",
    color: "#c98769",
    createdAt: "2026-08-24T07:15:00.000Z",
    sample: true
  },
  {
    id: "sample-3",
    name: "Kerinci Honey",
    roaster: "Common Grounds",
    origin: "Indonesia",
    process: "Honey",
    brew: "V60",
    tastingNotes: ["Pineapple", "Spice", "Molasses"],
    notes: "A syrupy cup with tropical acidity and a warm, spiced finish. Best once it has rested for two weeks.",
    rating: 4.2,
    photo: "",
    color: "#aab58b",
    createdAt: "2026-08-17T09:45:00.000Z",
    sample: true
  }
];

let reviews = loadReviews();
let selectedNotes = [];
let selectedRating = 0;
let currentPhoto = "";
let editingId = null;
let deletingId = null;
let activeFilter = "all";
let toastTimer = null;

const $ = (selector) => document.querySelector(selector);
const elements = {
  beanGrid: $("#beanGrid"),
  beanCount: $("#beanCount"),
  emptyState: $("#emptyState"),
  emptyTitle: $("#emptyTitle"),
  emptyMessage: $("#emptyMessage"),
  filterRow: $("#filterRow"),
  searchInput: $("#searchInput"),
  sortSelect: $("#sortSelect"),
  reviewDialog: $("#reviewDialog"),
  confirmDialog: $("#confirmDialog"),
  form: $("#reviewForm"),
  dialogTitle: $("#dialogTitle"),
  photoInput: $("#photoInput"),
  photoField: $("#photoField"),
  photoPreview: $("#photoPreview"),
  photoPlaceholder: $("#photoPlaceholder"),
  photoActions: $("#photoActions"),
  nameInput: $("#nameInput"),
  roasterInput: $("#roasterInput"),
  originInput: $("#originInput"),
  processInput: $("#processInput"),
  brewInput: $("#brewInput"),
  customNoteInput: $("#customNoteInput"),
  selectedNotes: $("#selectedNotes"),
  notesInput: $("#notesInput"),
  notesCount: $("#notesCount"),
  ratingLabel: $("#ratingLabel"),
  nameError: $("#nameError"),
  ratingError: $("#ratingError"),
  toast: $("#toast"),
  toastMessage: $("#toastMessage")
};

function loadReviews() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (saved && !localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, saved);
    return saved ? JSON.parse(saved) : seedReviews;
  } catch {
    return seedReviews;
  }
}

function saveReviews() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  } catch {
    showToast("Photo is too large to save — try a smaller image");
  }
}

function escapeHtml(value = "") {
  return value.replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function beanIllustration(color) {
  return `<div class="image-fallback" style="--fallback:${color}">
    <svg viewBox="0 0 180 130" aria-hidden="true">
      <path d="M47 16h86l-8 101H55L47 16Z" fill="rgba(250,247,240,.62)"/>
      <path d="M42 16h96M61 40c16 9 43 9 59 0"/>
      <path d="M83 58c15-10 33 4 24 21-8 16-32 27-40 11-5-11 5-24 16-32Z" fill="rgba(29,41,34,.12)"/>
      <path d="M101 62c-2 14-13 24-27 30"/>
      <path d="M67 108h45"/>
    </svg>
  </div>`;
}

function renderCard(review, index) {
  const meta = [review.roaster, review.origin].filter(Boolean).join(" · ") || "Personal tasting";
  const details = [review.process, review.brew].filter(Boolean).join(" · ");
  const date = new Intl.DateTimeFormat("en", { day: "numeric", month: "long", year: "numeric" }).format(new Date(review.createdAt));
  const photo = review.photo
    ? `<img src="${review.photo}" alt="${escapeHtml(review.name)} coffee bag" />`
    : beanIllustration(review.color || "#d9a56f");

  return `<article class="bean-card" data-id="${review.id}" style="animation-delay:${index * 50}ms">
    <div class="card-image">
      ${photo}
      <button class="card-menu-button" type="button" aria-label="Options for ${escapeHtml(review.name)}" data-action="menu">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg>
      </button>
      <div class="card-menu" hidden>
        <button type="button" data-action="edit">Edit review</button>
        <button type="button" class="delete-action" data-action="delete">Remove</button>
      </div>
    </div>
    <div class="card-body">
      <p class="card-meta">${escapeHtml(meta)}</p>
      <div class="card-title-row">
        <h3 class="card-title">${escapeHtml(review.name)}</h3>
        <span class="card-rating"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2.7 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.3l6.2-.9L12 2.7Z"/></svg>${Number(review.rating).toFixed(1)}</span>
      </div>
      ${details ? `<p class="card-details">${escapeHtml(details)}</p>` : ""}
      <div class="taste-notes">${review.tastingNotes.map(note => `<span class="taste-tag">${escapeHtml(note)}</span>`).join("")}</div>
      ${review.notes ? `<p class="card-notes">${escapeHtml(review.notes)}</p>` : ""}
      <p class="card-date">Tasted ${date}${review.sample ? " · Sample entry" : ""}</p>
    </div>
  </article>`;
}

function render() {
  const query = elements.searchInput.value.trim().toLowerCase();
  let visible = reviews.filter(review => {
    const searchable = [review.name, review.roaster, review.origin, review.process, review.brew, review.notes, ...review.tastingNotes].join(" ").toLowerCase();
    const matchesSearch = !query || searchable.includes(query);
    const matchesFilter = activeFilter === "all" || review.tastingNotes.some(note => note.toLowerCase() === activeFilter.toLowerCase());
    return matchesSearch && matchesFilter;
  });

  visible.sort((a, b) => {
    if (elements.sortSelect.value === "rating") return b.rating - a.rating;
    if (elements.sortSelect.value === "name") return a.name.localeCompare(b.name);
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  elements.beanGrid.innerHTML = visible.map(renderCard).join("");
  elements.beanCount.textContent = reviews.length;
  elements.emptyState.hidden = visible.length > 0;
  elements.beanGrid.hidden = visible.length === 0;

  if (reviews.length === 0) {
    elements.emptyTitle.textContent = "Your journal is waiting";
    elements.emptyMessage.textContent = "Add the first bag you want to remember.";
  } else {
    elements.emptyTitle.textContent = "No beans found";
    elements.emptyMessage.textContent = "Try another search or tasting-note filter.";
  }

  renderFilters();
}

function renderFilters() {
  const counts = new Map();
  reviews.flatMap(review => review.tastingNotes).forEach(note => counts.set(note, (counts.get(note) || 0) + 1));
  const popular = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 7).map(([note]) => note);
  elements.filterRow.innerHTML = ["all", ...popular].map(note =>
    `<button class="filter-pill ${activeFilter === note ? "active" : ""}" type="button" data-filter="${escapeHtml(note)}">${note === "all" ? "All beans" : escapeHtml(note)}</button>`
  ).join("");
}

function openReviewDialog(review = null) {
  editingId = review?.id || null;
  selectedNotes = review ? [...review.tastingNotes] : [];
  selectedRating = review?.rating || 0;
  currentPhoto = review?.photo || "";
  elements.form.reset();
  elements.dialogTitle.textContent = review ? "Edit this bean" : "Add a new bean";
  elements.nameInput.value = review?.name || "";
  elements.roasterInput.value = review?.roaster || "";
  elements.originInput.value = review?.origin || "";
  elements.processInput.value = review?.process || "";
  elements.brewInput.value = review?.brew || "";
  elements.notesInput.value = review?.notes || "";
  elements.notesCount.textContent = elements.notesInput.value.length;
  elements.nameError.textContent = "";
  elements.ratingError.textContent = "";
  updatePhotoPreview();
  renderSelectedNotes();
  updateRating();
  elements.reviewDialog.showModal();
  setTimeout(() => elements.nameInput.focus(), 120);
}

function closeReviewDialog() {
  elements.reviewDialog.close();
}

function renderSelectedNotes() {
  const suggested = [...document.querySelectorAll("#suggestedNotes button")];
  suggested.forEach(button => button.classList.toggle("selected", selectedNotes.includes(button.dataset.note)));
  const customs = selectedNotes.filter(note => !suggested.some(button => button.dataset.note === note));
  elements.selectedNotes.innerHTML = customs.map(note => `<button type="button" data-remove-note="${escapeHtml(note)}" aria-label="Remove ${escapeHtml(note)}">${escapeHtml(note)}</button>`).join("");
}

function toggleNote(note) {
  if (selectedNotes.includes(note)) selectedNotes = selectedNotes.filter(item => item !== note);
  else if (selectedNotes.length < 8) selectedNotes.push(note);
  else return showToast("Keep it focused — up to 8 tasting notes");
  renderSelectedNotes();
}

function addCustomNote() {
  const note = elements.customNoteInput.value.trim();
  if (!note) return;
  const formatted = note.charAt(0).toUpperCase() + note.slice(1);
  if (!selectedNotes.some(item => item.toLowerCase() === formatted.toLowerCase())) toggleNote(formatted);
  elements.customNoteInput.value = "";
}

function updateRating() {
  const labels = ["Choose a rating", "Not for me", "It was okay", "Good cup", "Really lovely", "A new favorite"];
  document.querySelectorAll("#ratingButtons button").forEach(button => {
    button.classList.toggle("active", Number(button.dataset.rating) <= Math.ceil(selectedRating));
  });
  elements.ratingLabel.textContent = selectedRating ? `${Number(selectedRating).toFixed(1)} · ${labels[Math.ceil(selectedRating)]}` : labels[0];
}

function updatePhotoPreview() {
  elements.photoPreview.hidden = !currentPhoto;
  elements.photoPlaceholder.hidden = Boolean(currentPhoto);
  elements.photoActions.hidden = !currentPhoto;
  if (currentPhoto) elements.photoPreview.src = currentPhoto;
}

function compressPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const maxSide = 1400;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext("2d");
        context.fillStyle = "#f4efe5";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function handlePhoto(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) return showToast("Please choose an image file");
  if (file.size > 4 * 1024 * 1024) return showToast("Please choose an image under 4 MB");
  try {
    currentPhoto = await compressPhoto(file);
    updatePhotoPreview();
  } catch {
    showToast("That photo could not be read");
  }
}

function submitReview(event) {
  event.preventDefault();
  let valid = true;
  elements.nameError.textContent = "";
  elements.ratingError.textContent = "";

  if (!elements.nameInput.value.trim()) {
    elements.nameError.textContent = "Give this bean a name.";
    valid = false;
  }
  if (!selectedRating) {
    elements.ratingError.textContent = "Choose a rating before saving.";
    valid = false;
  }
  if (!valid) return;

  const existing = reviews.find(review => review.id === editingId);
  const review = {
    id: editingId || `bean-${Date.now()}`,
    name: elements.nameInput.value.trim(),
    roaster: elements.roasterInput.value.trim(),
    origin: elements.originInput.value.trim(),
    process: elements.processInput.value,
    brew: elements.brewInput.value,
    tastingNotes: selectedNotes,
    notes: elements.notesInput.value.trim(),
    rating: Number(selectedRating),
    photo: currentPhoto,
    color: existing?.color || ["#d9a56f", "#c98769", "#aab58b", "#d0b875", "#91aca0"][reviews.length % 5],
    createdAt: existing?.createdAt || new Date().toISOString(),
    sample: false
  };

  reviews = editingId ? reviews.map(item => item.id === editingId ? review : item) : [review, ...reviews];
  saveReviews();
  closeReviewDialog();
  render();
  showToast(editingId ? "Review updated" : "Saved to your journal");
}

function showToast(message) {
  clearTimeout(toastTimer);
  elements.toastMessage.textContent = message;
  elements.toast.classList.add("show");
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

function closeAllMenus(except = null) {
  document.querySelectorAll(".card-menu").forEach(menu => {
    if (menu !== except) menu.hidden = true;
  });
}

document.addEventListener("click", event => {
  const actionButton = event.target.closest("[data-action]");
  if (actionButton) {
    const card = actionButton.closest(".bean-card");
    const review = reviews.find(item => item.id === card?.dataset.id);
    const action = actionButton.dataset.action;
    if (action === "menu") {
      const menu = card.querySelector(".card-menu");
      const wasHidden = menu.hidden;
      closeAllMenus();
      menu.hidden = !wasHidden;
      return;
    }
    if (action === "edit") openReviewDialog(review);
    if (action === "delete") {
      deletingId = review.id;
      elements.confirmDialog.showModal();
    }
  } else if (!event.target.closest(".card-menu")) {
    closeAllMenus();
  }
});

$("#addReviewButton").addEventListener("click", () => openReviewDialog());
$("#emptyAddButton").addEventListener("click", () => openReviewDialog());
$("#closeDialogButton").addEventListener("click", closeReviewDialog);
$("#cancelButton").addEventListener("click", closeReviewDialog);
elements.form.addEventListener("submit", submitReview);
elements.searchInput.addEventListener("input", render);
elements.sortSelect.addEventListener("change", render);
elements.notesInput.addEventListener("input", () => elements.notesCount.textContent = elements.notesInput.value.length);
elements.photoInput.addEventListener("change", event => handlePhoto(event.target.files[0]));
$("#changePhotoButton").addEventListener("click", () => elements.photoInput.click());
$("#removePhotoButton").addEventListener("click", event => {
  event.stopPropagation();
  currentPhoto = "";
  elements.photoInput.value = "";
  updatePhotoPreview();
});
elements.photoField.addEventListener("dragover", event => { event.preventDefault(); elements.photoField.classList.add("dragging"); });
elements.photoField.addEventListener("dragleave", () => elements.photoField.classList.remove("dragging"));
elements.photoField.addEventListener("drop", event => {
  event.preventDefault();
  elements.photoField.classList.remove("dragging");
  handlePhoto(event.dataTransfer.files[0]);
});

$("#suggestedNotes").addEventListener("click", event => {
  const button = event.target.closest("[data-note]");
  if (button) toggleNote(button.dataset.note);
});
$("#addNoteButton").addEventListener("click", addCustomNote);
elements.customNoteInput.addEventListener("keydown", event => {
  if (event.key === "Enter") { event.preventDefault(); addCustomNote(); }
});
elements.selectedNotes.addEventListener("click", event => {
  const button = event.target.closest("[data-remove-note]");
  if (button) toggleNote(button.dataset.removeNote);
});
$("#ratingButtons").addEventListener("click", event => {
  const button = event.target.closest("[data-rating]");
  if (button) {
    selectedRating = Number(button.dataset.rating);
    elements.ratingError.textContent = "";
    updateRating();
  }
});
$("#ratingButtons").addEventListener("mouseover", event => {
  const button = event.target.closest("[data-rating]");
  if (!button) return;
  document.querySelectorAll("#ratingButtons button").forEach(item => item.classList.toggle("active", Number(item.dataset.rating) <= Number(button.dataset.rating)));
});
$("#ratingButtons").addEventListener("mouseleave", updateRating);
elements.filterRow.addEventListener("click", event => {
  const button = event.target.closest("[data-filter]");
  if (button) { activeFilter = button.dataset.filter; render(); }
});

$("#keepButton").addEventListener("click", () => elements.confirmDialog.close());
$("#confirmDeleteButton").addEventListener("click", () => {
  reviews = reviews.filter(review => review.id !== deletingId);
  saveReviews();
  elements.confirmDialog.close();
  render();
  showToast("Bean removed");
});

elements.reviewDialog.addEventListener("click", event => {
  if (event.target === elements.reviewDialog) closeReviewDialog();
});
elements.confirmDialog.addEventListener("click", event => {
  if (event.target === elements.confirmDialog) elements.confirmDialog.close();
});

$("#themeToggle").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light");
});

const savedTheme = localStorage.getItem(THEME_KEY) || localStorage.getItem(LEGACY_THEME_KEY);
if (savedTheme === "dark") document.body.classList.add("dark");
render();

if ("serviceWorker" in navigator && location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // The journal remains fully usable when service-worker registration is unavailable.
    });
  });
}

window.addEventListener("offline", () => showToast("You’re offline — your journal still works"));
window.addEventListener("online", () => showToast("Back online"));
