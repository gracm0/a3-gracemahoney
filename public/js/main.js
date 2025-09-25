// FRONT-END (CLIENT) JAVASCRIPT HERE

let loadTimes = [];
let loadTimeTotal = 0;

window.onload = function () {
	const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toLocaleDateString("en-CA");
	const lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toLocaleDateString("en-CA");

	document.getElementById("startDateInput").value = firstDayOfMonth;
	document.getElementById("endDateInput").value = lastDayOfMonth;

	pageLoad(firstDayOfMonth, lastDayOfMonth);
}

function pageLoad(firstDate, lastDate) {
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

	let body = { firstDate, lastDate };

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
	if (startDate && endDate) pageLoad(startDate, endDate);
}

function viewAllDates() { pageLoad("0000-00-00", "9999-99-99"); }
