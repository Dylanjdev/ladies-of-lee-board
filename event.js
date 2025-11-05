import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove, get, child } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

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

// Detect embed mode (for Google Sites)
const isEmbedded = window !== window.parent;
if (isEmbedded) {
  document.body.classList.add("embedded");
}

// In-iframe-safe popup
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

  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  if (isTouch && dragHint) {
    dragHint.textContent = "📱 Drag or tap a task to move it between columns.";
  }

  columns.forEach((col) => {
    const input = col.querySelector("input");
    const button = col.querySelector("button");
    const cardsDiv = col.querySelector(".cards");
    const columnName = col.dataset.column;

    if (button && input) {
      button.onclick = () => {
        const text = input.value.trim();
        if (!text) return;
        const newCard = push(ref(db, `todos/${eventId}/${columnName}`));
        set(newCard, { text });
        input.value = "";
      };
    }

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

          const del = document.createElement("button");
          del.textContent = "❌";
          del.className = "delete";
          del.onclick = async (e) => {
            e.stopPropagation();
            const confirmDelete = await showPopup("Type 'delete' to confirm:", "delete", "Delete Task");
            if (confirmDelete?.toLowerCase() === "delete") {
              remove(ref(db, `todos/${eventId}/${columnName}/${key}`));
            }
          };
          div.appendChild(del);

          div.ondragstart = (e) => {
            div.classList.add("dragging");
            e.dataTransfer.setData("text/plain", JSON.stringify({ key, card, from: columnName }));
          };
          div.ondragend = () => div.classList.remove("dragging");

          div.onclick = async () => {
            if (div.classList.contains("dragging")) return;
            const moveToRaw = await showPopup("Move task to:", "todo / doing / done", "Move Task");
            if (!moveToRaw) return;
            const moveTo = moveToRaw.trim().toLowerCase();
            if (!["todo", "doing", "done"].includes(moveTo)) return;

            remove(ref(db, `todos/${eventId}/${columnName}/${key}`));
            const newCard = { ...card };

            if (moveTo === "doing") {
              const who = await showPopup("Who is working on this task?", "Enter name", "Assign Task");
              if (who) newCard.assignedTo = who;
              delete newCard.completedBy;
            } else if (moveTo === "done") {
              const who = await showPopup("Who completed this task?", "Enter name", "Complete Task");
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

    cardsDiv.ondragover = (e) => e.preventDefault();
    cardsDiv.ondrop = async (e) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.from === columnName) return;

      remove(ref(db, `todos/${eventId}/${data.from}/${data.key}`));
      const newCard = { ...data.card };

      if (columnName === "doing") {
        const who = await showPopup("Who is working on this task?", "Enter name", "Assign Task");
        if (who) newCard.assignedTo = who;
        delete newCard.completedBy;
      } else if (columnName === "done") {
        const who = await showPopup("Who completed this task?", "Enter name", "Complete Task");
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
