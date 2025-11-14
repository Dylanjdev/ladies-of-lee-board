import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

// ---- Detect embed mode ----
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

// ---- Reusable Popup ----
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

// ---- Edit Modal ----
function showEditModal(event, eventId) {
  return new Promise((resolve) => {
    const modal = document.getElementById("edit-modal");
    const nameInput = document.getElementById("edit-event-name");
    const dateInput = document.getElementById("edit-event-date");
    const timeInput = document.getElementById("edit-event-time");
    const notesInput = document.getElementById("edit-event-notes");
    const saveBtn = document.getElementById("save-edit");
    const cancelBtn = document.getElementById("cancel-edit");

    // Pre-fill form with current values
    nameInput.value = event.name || "";
    dateInput.value = event.date || "";
    timeInput.value = event.time || "";
    notesInput.value = event.notes || "";

    modal.classList.remove("hidden");
    nameInput.focus();

    const close = (result) => {
      modal.classList.add("hidden");
      saveBtn.onclick = cancelBtn.onclick = null;
      resolve(result);
    };

    saveBtn.onclick = () => {
      const updatedEvent = {
        name: nameInput.value.trim(),
        date: dateInput.value || null,
        time: timeInput.value || null,
        notes: notesInput.value.trim() || null,
        createdAt: event.createdAt // Keep original creation time
      };
      close(updatedEvent);
    };

    cancelBtn.onclick = () => close(null);

    // Close on escape key
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        close(null);
        document.removeEventListener("keydown", handleEscape);
      }
    };
    document.addEventListener("keydown", handleEscape);
  });
}

// ---- Main App Logic ----
window.addEventListener("DOMContentLoaded", () => {
  const nameInput = document.getElementById("event-name");
  const dateInput = document.getElementById("event-date");
  const timeInput = document.getElementById("event-time");
  const notesInput = document.getElementById("event-notes");
  const addBtn = document.getElementById("add-event");
  const eventsUl = document.getElementById("events");

  const eventsRef = ref(db, "events");

  // Add new event
  addBtn.onclick = async () => {
    let name = nameInput.value.trim();
    let date = dateInput.value;
    let time = timeInput.value;
    let notes = notesInput.value.trim();

    if (!name) {
      name = await showPopup("Enter the event name:", "Event name", "New Event");
    }
    if (!name) return;

    const createdAt = Date.now();
    const newRef = push(eventsRef);

    await set(newRef, {
      name,
      date: date || null,
      time: time || null,
      notes: notes || null,
      createdAt
    });

    // Clear inputs
    nameInput.value = "";
    dateInput.value = "";
    timeInput.value = "";
    notesInput.value = "";
  };

  // Render events
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

      const link = document.createElement("a");
      link.href = `event.html?eventId=${encodeURIComponent(id)}`;

      const dateTime = [event.date, event.time].filter(Boolean).join(" • ");
      const notes = event.notes ? `<p class="event-notes">${event.notes}</p>` : "";

      link.innerHTML = `
        <h3>${event.name}</h3>
        ${dateTime ? `<p class="event-meta">${dateTime}</p>` : ""}
        ${notes}
        <p class="event-created">Added ${new Date(event.createdAt).toLocaleDateString()}</p>
      `;

      // Create action buttons container
      const actionsDiv = document.createElement("div");
      actionsDiv.className = "event-actions";

      // Menu button (3 dots)
      const menuBtn = document.createElement("button");
      menuBtn.innerHTML = "⋯";
      menuBtn.className = "menu-button";
      
      // Dropdown menu
      const dropdown = document.createElement("div");
      dropdown.className = "menu-dropdown";
      
      // Edit menu item
      const editItem = document.createElement("button");
      editItem.className = "menu-item";
      editItem.innerHTML = '<span class="icon">✏</span>Edit';
      editItem.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        dropdown.classList.remove("show");
        const updatedEvent = await showEditModal(event, id);
        if (updatedEvent && updatedEvent.name) {
          await set(ref(db, `events/${id}`), updatedEvent);
        }
      };
      
      // Delete menu item
      const deleteItem = document.createElement("button");
      deleteItem.className = "menu-item delete";
      deleteItem.innerHTML = '<span class="icon">×</span>Delete';
      deleteItem.onclick = async (e) => {
        e.stopPropagation();
        e.preventDefault();
        dropdown.classList.remove("show");
        const confirmDelete = await showPopup(
          `Type "delete" to remove "${event.name}"`,
          "delete",
          "Delete Event"
        );
        if (confirmDelete?.toLowerCase() !== "delete") return;
        remove(ref(db, `events/${id}`));
        remove(ref(db, `todos/${id}`));
      };

      dropdown.appendChild(editItem);
      dropdown.appendChild(deleteItem);
      
      // Toggle dropdown on menu button click
      menuBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Close all other dropdowns first
        document.querySelectorAll('.menu-dropdown.show').forEach(d => {
          if (d !== dropdown) d.classList.remove('show');
        });
        
        dropdown.classList.toggle("show");
      };

      actionsDiv.appendChild(menuBtn);
      actionsDiv.appendChild(dropdown);

      li.appendChild(link);
      li.appendChild(actionsDiv);
      eventsUl.appendChild(li);
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.event-actions')) {
      document.querySelectorAll('.menu-dropdown.show').forEach(dropdown => {
        dropdown.classList.remove('show');
      });
    }
  });
});
