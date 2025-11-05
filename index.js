import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

const isEmbedded = window !== window.parent;
if (isEmbedded) {
  document.body.classList.add("embedded");
}


// Firebase setup
const firebaseConfig = {
  apiKey: "AIzaSyCOUhPJYZbvsymexJfEkEtYk5nzlW2Ni2Y",
  authDomain: "ladies-of-lee-board.firebaseapp.com",
  databaseURL: "https://ladies-of-lee-board-default-rtdb.firebaseio.com",
  projectId: "ladies-of-lee-board",
  storageBucket: "ladies-of-lee-board.firebasestorage.app",
  messagingSenderId: "957402410365",
  appId: "1:957402410365:web:79c4e86775faa327827014"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

window.addEventListener("DOMContentLoaded", () => {
  const nameInput = document.getElementById("event-name");
  const addBtn = document.getElementById("add-event");
  const eventsUl = document.getElementById("events");

  // ✅ Add new event
  addBtn.onclick = () => {
    const name = nameInput.value.trim();
    if (!name) return;

    const eventsRef = ref(db, "events");
    const newRef = push(eventsRef);
    const createdAt = Date.now();

    set(newRef, { name, createdAt })
      .then(() => {
        nameInput.value = "";
      })
      .catch((err) => console.error("Error adding event:", err));
  };

  // 🟣 Listen for events list
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

      // 🟪 Clickable link for the event
      const link = document.createElement("a");
      link.href = `event.html?eventId=${encodeURIComponent(id)}`;
      link.innerHTML = `
        <div class="event-content">
          <h3>${event.name}</h3>
          <p>Click to open board →</p>
        </div>
      `;

      // ❌ Delete button
      const del = document.createElement("button");
      del.textContent = "✖";
      del.className = "delete-event";
      del.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (confirm(`Delete event "${event.name}" and all its tasks?`)) {
          remove(ref(db, `events/${id}`));
          remove(ref(db, `todos/${id}`));
        }
      };

      li.appendChild(link);
      li.appendChild(del);
      eventsUl.appendChild(li);
    });
  });
});
