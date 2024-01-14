const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const session = require("express-session");
const bcrypt = require("bcrypt");
const multer = require("multer");

const storage = multer.memoryStorage(); // Lưu trữ tập tin trong bộ nhớ
const upload = multer({ storage: storage });

const app = express();
const port = process.env.PORT || 3000;

const dbUrl = "mongodb+srv://owner:tjuZJwlqmYSAzPEI@atn.qyuce32.mongodb.net/?retryWrites=true&w=majority";

const connectionParams = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};

mongoose.connect(dbUrl, connectionParams)
  .then(() => {
    console.info("Connected to DB");
  })
  .catch((e) => {
    console.log("Error:", e);
  });

const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

const User = mongoose.model("User", userSchema);

const bookSchema = new mongoose.Schema({
  title: String,
  author: String,
  publicationYear: Number,
  category: String,
  content: String,
  imagePath: String,
});

const Book = mongoose.model("Book", bookSchema);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: "your-secret-key",
  resave: true,
  saveUninitialized: true,
}));

app.set("view engine", "ejs");

app.use("/uploads", express.static("uploads"));

// Middleware để kiểm tra xem người dùng đã đăng nhập chưa
const requireLogin = (req, res, next) => {
  if (req.session.userId) {
    next();
  } else {
    res.redirect("/login");
  }
};

app.get("/", (req, res) => {
  if (req.session.userId) {
    res.redirect("/dashboard");
  } else {
    res.redirect("/login");
  }
});

app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/login.html");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });

    if (user && await bcrypt.compare(password, user.password)) {
      req.session.userId = user._id;
      res.redirect("/dashboard");
    } else {
      res.status(401).send("Username or password is incorrect");
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Server error");
  }
});

app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/register.html");
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });

    if (existingUser) {
      res.status(400).send("Username available");
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ username, password: hashedPassword });
      await newUser.save();
      res.status(200).send("Sign Up Success. Log in to continue.");
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Server error");
  }
});

app.get("/dashboard", requireLogin, (req, res) => {
  res.sendFile(__dirname + "/dashboard.html");
});

app.post("/add-book", requireLogin, upload.single("image"), async (req, res) => {
  const { title, author, publicationYear, category, content  } = req.body;
  const imageFile = req.file;

  if (!imageFile) {
    return res.status(400).json({ message: "Please select an image file." });
  }

  console.log(imageFile)

  const newBook = new Book({
    title,
    author,
    publicationYear,
    category,
    content,
    imagePath: imageFile.buffer.toString("base64"),
  });

  try {
    await newBook.save();
    res.status(200).json({ message: "done" });
  } catch (error) {
    console.error("Error while saving book:", error);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/get-books", requireLogin, async (req, res) => {
  try {
    const books = await Book.find({});
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

app.delete("/delete-book/:id", requireLogin, async (req, res) => {
  try {
    const bookId = req.params.id;
    const deletedBook = await Book.findByIdAndDelete(bookId);

    if (!deletedBook) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.status(200).json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.put("/update-book/:id", requireLogin, async (req, res) => {
  try {
    const bookId = req.params.id;
    const { title, author, publicationYear, category, content } = req.body;

    const updatedBook = await Book.findByIdAndUpdate(
      bookId,
      { title, author, publicationYear, category, content },
      { new: true }
    );

    if (!updatedBook) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.status(200).json({ message: "Book updated successfully" });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.listen(port, () => {
  console.log(`Ứng dụng đang chạy tại http://localhost:${port}`);
});
