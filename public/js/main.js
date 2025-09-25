// FRONT-END (CLIENT) JAVASCRIPT HERE

let loadTimes = [];
let loadTimeTotal = 0;

window.onload = function () {
	const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("en-CA");
	const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString("en-CA");

	document.getElementById("startDateInput").value = firstDayOfMonth;
	document.getElementById("endDateInput").value = lastDayOfMonth;

	pageLoad(firstDayOfMonth, lastDayOfMonth, null);

	document.getElementById("searchKeyInput").addEventListener("keyup", function (event) {
		if (event.key === "Enter") searchAllDates();
	});
}

function pageLoad(firstDate, lastDate, searchKey) {
	const start = new Date().getTime();

	// Clear old stats
	if (document.getElementById("incomeCard")) document.getElementById("statsGrid").removeChild(document.getElementById("incomeCard"));
	if (document.getElementById("expensesCard")) document.getElementById("statsGrid").removeChild(document.getElementById("expensesCard"));

	document.getElementById("cards").innerHTML = "";

	if (document.getElementById("loader")) document.body.removeChild(document.getElementById("loader"));

	const loader = document.createElement('div');
	loader.id = "loader";
	loader.innerHTML = `<div style="height: 60vh" class="loader">Loading...</div>`; // simple loader, style in CSS
	document.body.insertBefore(loader, document.getElementById('cards'));

	let body = {};
	if (!searchKey) {
		body = { firstDate, lastDate, searchKey: null };
	} else {
		body = { searchKey };
	}

	fetch("/read", {
		method: "POST",
		headers: {"Content-Type": "application/json"},
		body: JSON.stringify(body)
	})
	.then(res => res.json())
	.then(res => {
		if (res.length === 0) {
			document.getElementById("loader").innerHTML = `<div style="height: 60vh; text-align:center; padding-top: 10vh;">No items for current filter<br><button onclick="addItem()">Add Item</button></div>`;
			const end = new Date().getTime();
			loadTimes.push(end - start);
			loadTimeTotal += (end - start);
			return;
		}

		let jsons = [];
		jsons[0] = { date: res[0].date, I: 0, O: 0, transactions: [] };
		if (res[0].isIncome) jsons[0].I += res[0].amount;
		else jsons[0].O += res[0].amount;
		jsons[0].transactions.push({ id: res[0]._id, date: res[0].date, isIncome: res[0].isIncome, amount: res[0].amount, note: res[0].note });

		for (let i = 1; i < res.length; i++) {
			if (res[i].date !== jsons[jsons.length - 1].date) {
				jsons.push({ date: res[i].date, I: 0, O: 0, transactions: [] });
			}
			if (res[i].isIncome) jsons[jsons.length - 1].I += res[i].amount;
			else jsons[jsons.length - 1].O += res[i].amount;
			jsons[jsons.length - 1].transactions.push({ id: res[i]._id, date: res[i].date, isIncome: res[i].isIncome, amount: res[i].amount, note: res[i].note });
		}

		let I = 0, O = 0;
		jsons.forEach(day => { I += day.I; O += day.O; });

		let prevI = 23945;
		let prevO = 83456;

		const incomeCard = document.createElement("div");
		incomeCard.id = "incomeCard";
		incomeCard.className = "card income-card";
		incomeCard.innerHTML = `<div>Income: $${(I/100).toFixed(0)} (from $${(prevI/100).toFixed(0)})</div>`;

		const expensesCard = document.createElement("div");
		expensesCard.id = "expensesCard";
		expensesCard.className = "card expenses-card";
		expensesCard.innerHTML = `<div>Expenses: $${(O/100).toFixed(0)} (from $${(prevO/100).toFixed(0)})</div>`;

		document.getElementById("statsGrid").appendChild(incomeCard);
		document.getElementById("statsGrid").appendChild(expensesCard);

		jsons.forEach(day => createCard(day));

		document.body.removeChild(document.getElementById("loader"));

		const end = new Date().getTime();
		loadTimes.push(end - start);
		loadTimeTotal += (end - start);
	});
}

function updateContent() {
	const startDate = document.getElementById('startDateInput').value;
	const endDate = document.getElementById('endDateInput').value;
	if (startDate && endDate) pageLoad(startDate, endDate, null);
}

function viewAllDates() { pageLoad("0000-00-00", "9999-99-99", null); }

function searchAllDates() {
	const searchKey = document.getElementById('searchKeyInput').value;
	if (searchKey) pageLoad(null, null, searchKey);
}

function tagTo(tag) {
	document.getElementById("searchKeyInput").value = `"${tag}"`;
	pageLoad(null, null, `"${tag}"`);
}

function replaceTag(note) {
	return note.replace(/#(\S+)/g, value => `<u class="cursor-pointer" onclick="tagTo('${value}')">${value}</u>`);
}


/*
window.onload = function() {
  const form = document.querySelector("#expense_form");
  const resultsContainer = document.querySelector("#result");

  // handle form submission
  form.onsubmit = async function(event) {
    event.preventDefault();

    const expense_name = document.querySelector("#expense_name").value;
    const amount = parseFloat(document.querySelector("#amount").value);
    const date = document.querySelector("#date").value;

    // send new expense to server
    const response = await fetch("/add-expense", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expense_name, amount, date })
    });

    // update table
    const updatedExpenses = await response.json();
    renderExpenses(updatedExpenses);

    form.reset();
  };

  fetch("/get-expenses")
    .then(res => res.json())
    .then(expenses => renderExpenses(expenses));
}

const renderExpenses = function(expenses) {
  const tbody = document.querySelector("#expenses_table tbody");
  tbody.innerHTML = "";

  expenses.forEach((exp, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${exp.expense_name}</td>
      <td>${exp.amount.toFixed(2)}</td>
      <td>${exp.date}</td>
      <td>${exp.type}</td>
      <td><button class="delete-btn">Delete</button></td>
    `;

    // set color of type based on last cell
    const lastCell = row.querySelector("td:nth-child(4)");
    
    if (exp.type.toLowerCase() === "positive") {
      lastCell.style.color = "rgb(86, 176, 72)";
      lastCell.style.fontWeight = "bold";
    } else if (exp.type.toLowerCase() === "negative") {
      lastCell.style.color = "rgb(201, 39, 39)"; 
      lastCell.style.fontWeight = "bold";
    }

    // DELETE button
    const deleteBtn = row.querySelector(".delete-btn");
    deleteBtn.onclick = async function() {
      const response = await fetch("/delete-expense", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index: i})
      });

      // update table
      const updatedExpenses = await response.json();
      renderExpenses(updatedExpenses);
    }

    tbody.appendChild(row);
  });
}
  */