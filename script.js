import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue, remove } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-database.js";

// Firebase config
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
  console.log("✅ Page loaded, initializing board...");

  const columns = document.querySelectorAll(".column");
  columns.forEach((col) => {
    const input = col.querySelector("input");
    const button = col.querySelector("button");
    const cardsDiv = col.querySelector(".cards");
    const columnName = col.dataset.column;

    // Add new card
    if (button && input) {
      button.onclick = () => {
        const text = input.value.trim();
        if (!text) return;
        const newCard = push(ref(db, `cards/${columnName}`));
        set(newCard, { text });
        input.value = "";
      };
    }

    // Read & render cards
    onValue(
      ref(db, `cards/${columnName}`),
      (snapshot) => {
        cardsDiv.innerHTML = "";
        const data = snapshot.val();
        if (data) {
          Object.entries(data).forEach(([key, card]) => {
            const div = document.createElement("div");
            div.className = "card";
            div.draggable = true;
            div.textContent = card.text;

            // Delete button
            const del = document.createElement("button");
            del.textContent = "❌";
            del.className = "delete";
            del.onclick = (e) => {
              e.stopPropagation();
              remove(ref(db, `cards/${columnName}/${key}`));
            };
            div.appendChild(del);

            // Drag events
            div.ondragstart = (e) => {
              div.classList.add("dragging");
              e.dataTransfer.setData(
                "text/plain",
                JSON.stringify({ key, card, from: columnName })
              );
            };
            div.ondragend = () => div.classList.remove("dragging");

            cardsDiv.appendChild(div);
          });
        }
      },
      (err) => console.error("❌ Firebase read error:", err)
    );

    // Allow dropping
    cardsDiv.ondragover = (e) => e.preventDefault();
    cardsDiv.ondrop = (e) => {
      e.preventDefault();
      const data = JSON.parse(e.dataTransfer.getData("text/plain"));
      if (data.from === columnName) return;
      remove(ref(db, `cards/${data.from}/${data.key}`));
      const newCard = push(ref(db, `cards/${columnName}`));
      set(newCard, { text: data.card.text });
    };
  });
});
