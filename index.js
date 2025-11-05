import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

// ---- Detect embed mode (Google Sites iframe) ----
try {
  if (window.self !== window.top) {
    document.documentElement.classList.add("embedded");
    document.body.classList.add("embedded");
  }
} catch {
  document.documentElement.classList.add("embedded");
  document.body.classList.add("embedded");
}

// ---- Firebase Config ----
const firebaseConfig = {
  apiKey: "AIzaSyCOUhPJYZbvsymexJfEkEtYk5nzlW2Ni2Y",
  authDomain: "ladies-of-lee-board.firebaseapp.com",
  databaseURL: "https://ladies-of-lee-board-default-rtdb.firebaseio.com",
  projectId: "ladies-of-lee-board",
  storageBucket: "ladies-of-lee-board.firebasestorage.app",
  messagingSenderId: "957402410365",
  appId: "1:957402410365:web:79c4e86775faa327827014"
};

// ---- Initialize Firebase ----
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ---- Reusable In-Frame Safe Popup ----
function showPopup(message, placeholder = "", title = "Input") {
  return new Promise((resolve) => {
    const popup = document.getElementById("popup");
    const msg = document.getElementById("popup-message");
    const input = document.getElementById("popup-input");
    const ok = document.getElementById("popup-ok");
    const cancel = document.getElementById("popup-cancel");
    const heading = document.getElementById("popup-title");

    heading.textContent = title;
    msg.textContent = message;
    input.value = "";
    input.placeholder = placeholder;
    popup.classList.remove("hidden");

    const close = (val) => {
      popup.classList.add("hidden");
      ok.onclick = cancel.onclick = null;
      resolve(val);
    };

    ok.onclick = () => close(input.value.trim());
    cancel.onclick = () => close(null);
  });
}

// ---- Main App Logic ----
window.addEventListener("DOMContentLoaded", () => {
  const nameInput = document.getElementById("event-name");
  const addBtn = document.getElementById("add-event");
  const eventsUl = document.getElementById("events");

  // Add new event
  addBtn.onclick = async () => {
    let name = nameInput.value.trim();

    // If empty, show popup for event name
    if (!name) {
      name = await showPopup("Enter the event name:", "Event name", "New Event");
    }
    if (!name) return;

    const eventsRef = ref(db, "events");
    const newRef = push(eventsRef);
    const createdAt = Date.now();

    await set(newRef, { name, createdAt });
    nameInput.value = "";
  };

  // Listen for event list changes
  const eventsRef = ref(db, "events");
  onValue(eventsRef, (snapshot) => {
    eventsUl.innerHTML = "";
    const data = snapshot.val();

    if (!data) {
      eventsUl.innerHTML = "<li>No events yet. Add one above!</li>";
      return;
    }

    Object.entries(data).forEach(([id, event]) => {
      const li = document.createElement("li");
      li.className = "event-card";

      // Link to event page
      const link = document.createElement("a");
      link.href = `event.html?eventId=${encodeURIComponent(id)}`;
      link.innerHTML = `
        <h3>${event.name}</h3>
        <p>${new Date(event.createdAt).toLocaleDateString()}</p>
      `;

      // Delete button
      const del = document.createElement("button");
      del.textContent = "×";
      del.className = "delete-event";
      del.onclick = async (e) => {
        e.stopPropagation();
        const confirmDelete = await showPopup(
          `Type "delete" to remove "${event.name}"`,
          "delete",
          "Delete Event"
        );
        if (confirmDelete?.toLowerCase() !== "delete") return;

        remove(ref(db, `events/${id}`));
        remove(ref(db, `todos/${id}`));
      };

      li.appendChild(link);
      li.appendChild(del);
      eventsUl.appendChild(li);
    });
  });
});
