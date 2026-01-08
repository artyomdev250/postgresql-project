const bcrypt = require("bcrypt");
const pool = require("../../db");

const SALT_ROUNDS = 12;

exports.signup = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ message: "username, email, and password are required." });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters." });
        }

        const existing = await pool.query(
            `SELECT 1 FROM users_data WHERE username = $1 OR email = $2 LIMIT 1`,
            [username, email]
        );

        if (existing.rowCount > 0) {
            return res.status(409).json({ message: "Username or email already in use." });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        const result = await pool.query(
            `INSERT INTO users_data (username, email, password)
            VALUES ($1, $2, $3)
            RETURNING user_id, username, email`,
            [username, email, passwordHash]
        );

        return res.status(201).json({
            message: "User created.",
            user: result.rows[0],
        });
    } catch (err) {
        if (err.code === "23505") {
            return res.status(409).json({ message: "Username or email already in use." });
        }
        console.error("Signup error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
};
