import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove, get, child } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

const isEmbedded = window !== window.parent;
if (isEmbedded) {
  document.body.classList.add("embedded");
}


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

function getEventIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("eventId");
}

window.addEventListener("DOMContentLoaded", async () => {
  const eventId = getEventIdFromUrl();
  const titleEl = document.getElementById("event-title");
  const columns = document.querySelectorAll(".column");
  const dragHint = document.getElementById("drag-hint");

  if (!eventId) {
    titleEl.textContent = "Event not found";
    return;
  }

  // Load event name
  const snap = await get(child(ref(db), `events/${eventId}`));
  if (snap.exists()) {
    titleEl.textContent = `Event: ${snap.val().name}`;
  } else {
    titleEl.textContent = "Event not found";
    return;
  }

  // Detect touch device
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (isTouch && dragHint) {
    dragHint.textContent = "📱 Tip: Drag or tap a task to move it between columns.";
  }

  columns.forEach((col) => {
    const input = col.querySelector("input");
    const button = col.querySelector("button");
    const cardsDiv = col.querySelector(".cards");
    const columnName = col.dataset.column;

    // Add new task
    if (button && input) {
      button.onclick = () => {
        const text = input.value.trim();
        if (!text) return;
        const newCard = push(ref(db, `todos/${eventId}/${columnName}`));
        set(newCard, { text });
        input.value = "";
      };
    }

    // Listen for tasks
    onValue(ref(db, `todos/${eventId}/${columnName}`), (snapshot) => {
      cardsDiv.innerHTML = "";
      const data = snapshot.val();
      if (data) {
        Object.entries(data).forEach(([key, card]) => {
          const div = document.createElement("div");
          div.className = "card";
          div.draggable = true;

          const textSpan = document.createElement("span");
          textSpan.textContent = card.text;
          div.appendChild(textSpan);

          // Assigned info
          if (card.assignedTo && columnName === "doing") {
            const assigned = document.createElement("small");
            assigned.textContent = `👤 ${card.assignedTo}`;
            div.appendChild(assigned);
          }
          if (card.completedBy && columnName === "done") {
            const completed = document.createElement("small");
            completed.textContent = `✅ ${card.completedBy}`;
            div.appendChild(completed);
          }

          // Delete button
          const del = document.createElement("button");
          del.textContent = "❌";
          del.className = "delete";
          del.onclick = (e) => {
            e.stopPropagation();
            remove(ref(db, `todos/${eventId}/${columnName}/${key}`));
          };
          div.appendChild(del);

          // --- DRAG EVENTS ---
          div.ondragstart = (e) => {
            div.classList.add("dragging");
            e.dataTransfer.setData("text/plain", JSON.stringify({ key, card, from: columnName }));
          };
          div.ondragend = () => div.classList.remove("dragging");

          // --- TAP FALLBACK ---
          div.onclick = () => {
            // Skip if user just dragged
            if (div.classList.contains("dragging")) return;

            const moveToRaw = prompt("Move to: To Do, Doing, or Done? (type: todo / doing / done)");
            if (!moveToRaw || typeof moveToRaw !== "string") return;

            const moveTo = moveToRaw.trim().toLowerCase();
            if (!["todo", "doing", "done"].includes(moveTo)) return;

            // Remove old card
            remove(ref(db, `todos/${eventId}/${columnName}/${key}`));

            const newCard = { ...card };

            // Handle transitions
            if (moveTo === "doing") {
              const who = prompt("Who is working on this task?");
              if (who) newCard.assignedTo = who;
              delete newCard.completedBy;
            } else if (moveTo === "done") {
              const who = prompt("Who completed this task?");
              if (who) newCard.completedBy = who;
            } else {
              delete newCard.assignedTo;
              delete newCard.completedBy;
            }

            const newRef = push(ref(db, `todos/${eventId}/${moveTo}`));
            set(newRef, newCard);
          };

          cardsDiv.appendChild(div);
        });
      }
    });

    // --- DROP TARGETS ---
    cardsDiv.ondragover = (e) => e.preventDefault();
    cardsDiv.ondrop = (e) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.from === columnName) return;

      remove(ref(db, `todos/${eventId}/${data.from}/${data.key}`));
      const newCard = { ...data.card };

      if (columnName === "doing") {
        const who = prompt("Who is working on this task?");
        if (who) newCard.assignedTo = who;
        delete newCard.completedBy;
      } else if (columnName === "done") {
        const who = prompt("Who completed this task?");
        if (who) newCard.completedBy = who;
      } else {
        delete newCard.assignedTo;
        delete newCard.completedBy;
      }

      const newRef = push(ref(db, `todos/${eventId}/${columnName}`));
      set(newRef, newCard);
    };
  });
});

