function displayUserEmail() {
  fetch("/me", { credentials: "same-origin" }) // ensures cookies are sent
    .then(res => res.json())
    .then(data => {
      const emailDiv = document.getElementById("userEmail");
      if (data.email) {
        emailDiv.textContent = "Signed in: " + data.email;
      } else {
        emailDiv.textContent = "Not signed in";
      }
    })
    .catch(err => console.error("Failed to fetch user email:", err));
}

// Run on page load
window.onload = function () {
  displayUserEmail();

  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
  const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0,10);

  document.getElementById("startDateInput").value = firstDay;
  document.getElementById("endDateInput").value = lastDay;

  loadTransactions(firstDay, lastDay);
};


function loadTransactions(firstDate, lastDate) {
  fetch("/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstDate, lastDate })
  })
  .then(res => res.json())
  .then(transactions => renderTable(transactions));
}

// delete button functionality
function deleteTransaction(id) {
    fetch("/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
    })
    .then(() => {
        const startDate = document.getElementById('startDateInput').value;
        const endDate = document.getElementById('endDateInput').value;
        loadTransactions(startDate, endDate); // reload table
    })
    .catch(err => console.error(err));
}
// edit button functionality
function editTransaction(tr) {
  const newDate = prompt("Enter date (YYYY-MM-DD):", tr.date);
  if (!newDate) return;

  const newType = prompt("Enter type (income/expense):", tr.isIncome ? "income" : "expense");
  if (!newType) return;

  const newAmount = prompt("Enter amount in dollars:", (tr.amount / 100).toFixed(2));
  if (!newAmount) return;

  const newNote = prompt("Enter note:", tr.note);
  if (newNote === null) return;

  fetch("/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: tr._id,
      date: newDate,
      type: newType,
      amount: Number(newAmount),
      note: newNote
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      const startDate = document.getElementById('startDateInput').value;
      const endDate = document.getElementById('endDateInput').value;
      loadTransactions(startDate, endDate);
    } else {
      alert("Update failed: " + (data.error || "Unknown error"));
    }
  })
  .catch(err => console.error("Update error:", err));
}

function renderTable(transactions) {
  const tbody = document.querySelector("#expenses_table tbody");
  tbody.innerHTML = "";

  let totalIncome = 0, totalExpense = 0;

  transactions.forEach((tr, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${tr.note}</td>
      <td>${(tr.amount/100).toFixed(2)}</td>
      <td>${tr.date}</td>
      <td>${tr.isIncome ? "Income" : "Expense"}</td>
      <td>
        <button class="delete-btn">Delete</button>
        <button class="edit-btn">Edit</button>
      </td>
    `;

    // Color-code the type
    const typeCell = row.querySelector("td:nth-child(4)");
    if (tr.isIncome) {
      typeCell.style.color = "green";
      totalIncome += tr.amount;
    } else {
      typeCell.style.color = "red";
      totalExpense += tr.amount;
    }
    typeCell.style.fontWeight = "bold";

    // Delete button
    row.querySelector(".delete-btn").onclick = () => deleteTransaction(tr._id);

    // Edit button
    row.querySelector(".edit-btn").onclick = () => editTransaction(tr);

    tbody.appendChild(row);
  });

  // Update stats cards
  const statsGrid = document.getElementById("statsGrid");
  statsGrid.innerHTML = "";

  const incomeCard = document.createElement("div");
  incomeCard.className = "card income-card";
  incomeCard.innerHTML = `<div>Income: $${(totalIncome/100).toFixed(2)}</div>`;
  statsGrid.appendChild(incomeCard);

  const expenseCard = document.createElement("div");
  expenseCard.className = "card expenses-card";
  expenseCard.innerHTML = `<div>Expenses: $${(totalExpense/100).toFixed(2)}</div>`;
  statsGrid.appendChild(expenseCard);
}

function addItem() {
  const date = prompt("Enter date (YYYY-MM-DD):", new Date().toISOString().slice(0, 10));
  if (!date) return;

  const type = prompt("Enter type (income/expense):", "expense");
  if (!type) return;

  const amount = prompt("Enter amount in dollars:", "0");
  if (!amount) return;

  const note = prompt("Enter note:", "");
  if (note === null) return;

  fetch("/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date, type, amount, note })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      // reload table with current filters
      const startDate = document.getElementById('startDateInput').value;
      const endDate = document.getElementById('endDateInput').value;
      loadTransactions(startDate, endDate);
    } else {
      alert("Failed to add transaction: " + data.error);
    }
  });
}

function updateContent() {
  const startDate = document.getElementById('startDateInput').value;
  const endDate = document.getElementById('endDateInput').value;
  loadTransactions(startDate, endDate);
}

function viewAllDates() {
  loadTransactions("0000-00-00", "9999-99-99");
}