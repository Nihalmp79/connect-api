const jwt = require("jsonwebtoken")


const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization
    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({error: "No Token Provided"})
    }

    const token = authHeader.split(" ")[1]

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.userId = decoded.userId
        next()
    } catch {
        res.status(401).json({error: "Invalid token"})
    }
}


module.exports = authenticate