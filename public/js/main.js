window.onload = function () {
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
  const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0,10);

  document.getElementById("startDateInput").value = firstDay;
  document.getElementById("endDateInput").value = lastDay;

  pageLoad(firstDay, lastDay);
};

function pageLoad(firstDate, lastDate) {
  const container = document.getElementById("cards");
  container.innerHTML = "";
  const statsGrid = document.getElementById("statsGrid");
  statsGrid.innerHTML = "";

  fetch("/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ firstDate, lastDate })
  })
  .then(res => res.json())
  .then(res => {
    if (res.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding:20px;">No items for current filter<br><button onclick="addItem()">Add Item</button></div>`;
      return;
    }

    // Aggregate totals
    let totalIncome = 0, totalExpense = 0;
    const days = {};

    res.forEach(tr => {
      if (!days[tr.date]) days[tr.date] = [];
      days[tr.date].push(tr);
      tr.isIncome ? totalIncome += tr.amount : totalExpense += tr.amount;
    });

    // Display stats
    const incomeCard = document.createElement("div");
    incomeCard.className = "card income-card";
    incomeCard.innerHTML = `<div>Income: $${(totalIncome/100).toFixed(2)}</div>`;
    statsGrid.appendChild(incomeCard);

    const expenseCard = document.createElement("div");
    expenseCard.className = "card expenses-card";
    expenseCard.innerHTML = `<div>Expenses: $${(totalExpense/100).toFixed(2)}</div>`;
    statsGrid.appendChild(expenseCard);

    // Display each day's transactions
    Object.keys(days).sort((a,b) => b.localeCompare(a)).forEach(date => {
      createCard({ date, transactions: days[date] });
    });
  });
}

function createCard(day) {
  const container = document.getElementById("cards");
  const card = document.createElement("div");
  card.className = "card";
  card.style.marginBottom = "10px";

  const dateDiv = document.createElement("div");
  dateDiv.innerHTML = `<strong>${day.date}</strong>`;
  card.appendChild(dateDiv);

  day.transactions.forEach(tr => {
    const trDiv = document.createElement("div");
    trDiv.innerHTML = `${tr.isIncome ? '+' : '-'} $${(tr.amount/100).toFixed(2)} - ${tr.note}`;
    card.appendChild(trDiv);
  });

  container.appendChild(card);
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

  const transaction = { date, type, amount, note };

  fetch("/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(transaction)
  })
  .then(res => res.json())
  .then(data => {
    if (data.success) {
      console.log("Transaction added:", data.insertedId);

      // Reload current date range to display new transaction
      const startDate = document.getElementById('startDateInput').value;
      const endDate = document.getElementById('endDateInput').value;
      pageLoad(startDate, endDate);
    } else {
      console.error("Failed to add transaction:", data.error);
      alert("Failed to add transaction: " + data.error);
    }
  })
  .catch(err => {
    console.error("Error adding transaction:", err);
    alert("Error adding transaction: see console");
  });
}

function updateContent() {
  const startDate = document.getElementById('startDateInput').value;
  const endDate = document.getElementById('endDateInput').value;
  pageLoad(startDate, endDate);
}

function viewAllDates() {
  pageLoad("0000-00-00", "9999-99-99");
}
