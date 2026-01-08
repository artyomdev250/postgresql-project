const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
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

exports.refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
        if (!refreshToken) return res.status(401).json({ message: "Missing refresh token." });

        let decoded;
        try {
            decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        } catch {
            return res.status(401).json({ message: "Invalid or expired refresh token." });
        }

        const userRes = await pool.query(
            `SELECT user_id, username, email, refresh_token_hash
       FROM users_data
       WHERE user_id = $1
       LIMIT 1`,
            [decoded.user_id]
        );

        if (userRes.rowCount === 0) {
            return res.status(401).json({ message: "Invalid refresh token." });
        }

        const user = userRes.rows[0];
        if (!user.refresh_token_hash) {
            return res.status(401).json({ message: "Refresh token revoked. Please sign in again." });
        }

        const match = await bcrypt.compare(refreshToken, user.refresh_token_hash);
        if (!match) {
            return res.status(401).json({ message: "Refresh token mismatch. Please sign in again." });
        }

        const newAccessToken = signAccessToken({
            user_id: user.user_id,
            username: user.username,
            email: user.email,
        });

        const newRefreshToken = signRefreshToken({ user_id: user.user_id });
        const newRefreshHash = await bcrypt.hash(newRefreshToken, SALT_ROUNDS);

        await pool.query(
            `UPDATE users_data SET refresh_token_hash = $1 WHERE user_id = $2`,
            [newRefreshHash, user.user_id]
        );

        res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, cookieOptions);

        return res.status(200).json({
            message: "Token refreshed.",
            accessToken: newAccessToken,
            user: { user_id: user.user_id, username: user.username, email: user.email },
        });
    } catch (err) {
        console.error("Refresh error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
};
