const express = require("express")
const cors = require("cors")
require("dotenv").config()

const authenticate = require("./middleware/auth")
const authRoutes = require("./routes/auth")
const postRoutes = require("./routes/posts")
const userRoutes = require("./routes/users")

const app = express()
const PORT = process.env.PORT || 5002

app.use(cors())
app.use(express.json())

// public routes
app.use("/auth", authRoutes)

// protected routes
app.use("/posts", authenticate, postRoutes)
app.use("/users", authenticate, userRoutes)

app.get("/", (req, res) => {
  res.json({ message: "ConnectApp API running!" })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})