const express = require('express');
const mongodb = require('mongodb');
const path = require('path');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(express.static("public", { extensions: ["html", "js", "css"] }));

// Hard coded for simplicity
hc_USER = "new_user1";
hc_PASS = "passWord1";

// MongoDB connection
const uri = "mongodb+srv://" + hc_USER + ":" + hc_PASS + "@cluster0.uweoglw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const client = new mongodb.MongoClient(uri);

let db, users;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("expenseTracker");
    users = db.collection("users");
    console.log("Connected to users collection");
  } catch (err) {
    console.error("Failed to connect to users collection", err);
  }
}

connectDB();

app.use(
  cookieSession({
    name: 'session',
    keys: ["superSecretKey"],
    maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
  })
);

// login
app.get("/login", function (req, res) {
	res.sendFile(path.join(__dirname, "/public/login.html"));
});

// join
app.get("/join", function (req, res) {
	res.sendFile(path.join(__dirname, "/public/join.html"));
});

// Authentication

// login to existing account
app.post("/login", (req, res) => {
  console.log("/login");
  console.log(req.body);

  users.findOne({ email: req.body.email })
    .then(user => {
      if (!user) {
        console.log("No such email found");
        return res.redirect("/login"); 
      }

      bcrypt.compare(req.body.password, user.password)
        .then(match => {
          if (match) {
            console.log("Successfully logged user in");
            req.session.login = true;
            req.session.email = req.body.email;
            res.redirect("/");
          } else {
            console.log("Password incorrect");
            res.redirect("/login");
          }
        });
    })
    .catch(err => {
      console.error(err);
      res.redirect("/login");
    });
});

// logout of account
app.get("/logout", function (req, res) {
	req.session = null;
	console.log("Successfully logged out");
	res.redirect("/login");
});

// create new account
app.post("/join", (req, res) => {
	console.log("/join:");
	console.log(req.body);

	if (req.body.password !== req.body.passConfd) {
		console.log("Passwords don't match");
		return res.redirect("/join");
	}

	users
		.countDocuments({email: req.body.email})
		.then(result => {
			if (result === 0) {
        bcrypt.hash(req.body.password, SALT_ROUNDS)
        .then(hashedPassword => {
          let newUser = {
					email: req.body.email,
					password: hashedPassword
				};
				db.createCollection(req.body.email).catch(console.dir);
				console.log("User collection created");
				users.insertOne(newUser).then(() => {
					console.log("Successfully created account");

					// --- Indexing for performance ---
          db.collection(req.body.email).createIndex({ date: 1 });

					// Add sample data
          let transactions = [{
            date: new Date().getFullYear()+"-08-01",
            isIncome: false,
            amount: 7550,
            note: "SAMPLE - Groceries"
          }, {
            date: new Date().getFullYear()+"-10-04",
            isIncome: true,
            amount: 12000,
            note: "SAMPLE - Dog Walking"
          }, {
            date: new Date().getFullYear()+"-10-05",
            isIncome: false,
            amount: 550,
            note: "SAMPLE - Coffee"
          }, {
            date: new Date().getFullYear()+"-09-05",
            isIncome: false,
            amount: 1850,
            note: "SAMPLE - Lunch at Hot Table"
          }];
          db.collection(req.body.email).insertMany(transactions)
          console.log("Sample transactions added");

          res.redirect("/login");
				});
        });
			} else {
				console.log("Email already in use");
				res.redirect("/join");
			}
		});
});

// Block access if not a user
app.use(function (req, res, next) {
	if (req.session.login === true) next();
	else res.redirect("/login");
});

// When user accesses "/", send the main HTML file
app.get("/", function (req, res) {
  res.sendFile(__dirname + "/public/index.html");
});

// ------ CRUD ------

// Route to create transaction
app.post("/create", (req, res) => {
	console.log("/create");
	console.log(req.body);
	let transaction = {
		date: req.body.date,
		isIncome: req.body.type === "income",
		amount: req.body.amount * 100,
		note: req.body.note
	};
	db.collection(req.session.email).insertOne(transaction)
	res.redirect("/");
});

// Route to read transaction (search removed)
app.post("/read", (req, res) => {
	console.log("/read");
	console.log(req.body);
	db.collection(req.session.email)
		.find({ date: { $gte: req.body.startDate, $lte: req.body.endDate } })
		.sort({ date: -1, amount: -1, note: -1 })
		.limit(2000)
		.toArray()
		.then(result => res.json(result));
});

// Route to update transaction
app.post("/update", (req, res) => {
	console.log("/update");
	console.log(req.body);
	let transaction = {
		_id: new mongodb.ObjectId(req.body.id),
		date: req.body.date,
		isIncome: req.body.type === "income",
		amount: req.body.amount * 100,
		note: req.body.note
	};
	db.collection(req.session.email).replaceOne({_id: new mongodb.ObjectId(req.body.id)}, transaction)
	res.redirect("/");
});

// Route to delete transaction
app.post("/delete", (req, res) => {
	console.log("/delete");
	console.log(req.body);
	db.collection(req.session.email).deleteOne({_id: new mongodb.ObjectId(req.body.id)})
	res.redirect("/");
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
