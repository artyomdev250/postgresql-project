const jwt = require("jsonwebtoken");

exports.requireAuth = (req, res, next) => {
    try {
        const header = req.headers.authorization || "";
        const token = header.startsWith("Bearer ") ? header.slice(7) : null;

        if (!token) return res.status(401).json({ message: "Missing access token." });

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.user = decoded; // { user_id, username, email }
        next();
    } catch {
        return res.status(401).json({ message: "Invalid or expired access token." });
    }
};
