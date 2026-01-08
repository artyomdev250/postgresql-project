const bcrypt = require("bcrypt");
const pool = require("../../db");
const { signAccessToken, signRefreshToken } = require("../../utils/tokens");

const REFRESH_COOKIE_NAME = "refreshToken";
const SALT_ROUNDS = 12;

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

exports.signin = async (req, res) => {
    try {
        const { usernameOrEmail, password } = req.body;

        if (!usernameOrEmail || !password) {
            return res.status(400).json({ message: "usernameOrEmail and password are required." });
        }

        const userRes = await pool.query(
            `SELECT user_id, username, email, password
       FROM users_data
       WHERE username = $1 OR email = $1
       LIMIT 1`,
            [usernameOrEmail]
        );

        if (userRes.rowCount === 0) {
            return res.status(401).json({ message: "Invalid credentials." });
        }

        const user = userRes.rows[0];
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ message: "Invalid credentials." });

        const accessToken = signAccessToken({
            user_id: user.user_id,
            username: user.username,
            email: user.email,
        });

        const refreshToken = signRefreshToken({ user_id: user.user_id });
        const refreshHash = await bcrypt.hash(refreshToken, SALT_ROUNDS);

        await pool.query(
            `UPDATE users_data SET refresh_token_hash = $1 WHERE user_id = $2`,
            [refreshHash, user.user_id]
        );

        res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);

        return res.status(200).json({
            message: "Signed in.",
            accessToken,
            user: { user_id: user.user_id, username: user.username, email: user.email },
        });
    } catch (err) {
        console.error("Signin error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
};
