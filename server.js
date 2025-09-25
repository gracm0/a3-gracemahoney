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
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public", { extensions: ["html", "js", "css"] }));

// Hardcoded MongoDB credentials
const hc_USER = "new_user1";
const hc_PASS = "passWord1";
const uri = `mongodb+srv://${hc_USER}:${hc_PASS}@cluster0.uweoglw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
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

// Session middleware
app.use(cookieSession({
  name: 'session',
  keys: ["superSecretKey"],
  maxAge: 7 * 24 * 60 * 60 * 1000 // 1 week
}));

// Login and join pages
app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "/public/login.html")));
app.get("/join", (req, res) => res.sendFile(path.join(__dirname, "/public/join.html")));

// Authentication
app.post("/login", (req, res) => {
  users.findOne({ email: req.body.email }).then(user => {
    if (!user) return res.redirect("/login");
    bcrypt.compare(req.body.password, user.password).then(match => {
      if (match) {
        req.session.login = true;
        req.session.email = req.body.email;
        res.redirect("/");
      } else {
        res.redirect("/login");
      }
    });
  }).catch(() => res.redirect("/login"));
});

app.get("/logout", (req, res) => {
  req.session = null;
  res.redirect("/login");
});

app.post("/join", (req, res) => {
  if (req.body.password !== req.body.passConfd) return res.redirect("/join");
  users.countDocuments({ email: req.body.email }).then(count => {
    if (count > 0) return res.redirect("/join");
    bcrypt.hash(req.body.password, SALT_ROUNDS).then(hashedPassword => {
      const newUser = { email: req.body.email, password: hashedPassword };
      users.insertOne(newUser).then(() => {
        db.createCollection(req.body.email).then(() => db.collection(req.body.email).createIndex({ date: 1 }));
        res.redirect("/login");
      });
    });
  });
});

// Protect routes
app.use((req, res, next) => req.session.login ? next() : res.redirect("/login"));

// Serve main page
app.get("/", (req, res) => res.sendFile(__dirname + "/public/index.html"));

// CRUD
// Route to create transaction
app.post("/create", (req, res) => {
  if (!db) {
    console.error("DB not ready yet");
    return res.status(500).send("Database not ready");
  }

  if (!req.session || !req.session.email) {
    console.error("No session or email found");
    return res.status(401).send("Unauthorized");
  }

  const collectionName = req.session.email;
  console.log("Inserting into collection:", collectionName);
  console.log("Transaction data:", req.body);

  const transaction = {
    date: req.body.date,
    isIncome: req.body.type === "income",
    amount: Number(req.body.amount) * 100,
    note: req.body.note
  };

  db.collection(collectionName).insertOne(transaction)
    .then(result => {
      console.log("Inserted transaction:", result.insertedId);
      res.json({ success: true, insertedId: result.insertedId });
    })
    .catch(err => {
      console.error("Insert failed:", err);
      res.status(500).json({ success: false, error: err.message });
    });
});

app.post("/read", (req, res) => {
  db.collection(req.session.email)
    .find({ date: { $gte: req.body.firstDate, $lte: req.body.lastDate } })
    .sort({ date: -1, amount: -1, note: -1 })
    .toArray()
    .then(result => res.json(result));
});

app.post("/update", (req, res) => {
  const transaction = {
    _id: new mongodb.ObjectId(req.body.id),
    date: req.body.date,
    isIncome: req.body.type === "income",
    amount: req.body.amount * 100,
    note: req.body.note
  };
  db.collection(req.session.email).replaceOne({ _id: transaction._id }, transaction).then(() => res.json({ success: true }));
});

app.post("/delete", (req, res) => {
  db.collection(req.session.email).deleteOne({ _id: new mongodb.ObjectId(req.body.id) }).then(() => res.json({ success: true }));
});

app.listen(port, () => console.log(`Server running on port ${port}`));
