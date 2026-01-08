const jwt = require("jsonwebtoken");
const pool = require("../../db");

const REFRESH_COOKIE_NAME = "refreshToken";

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/auth/refresh",
};

exports.signout = async (req, res) => {
    try {
        const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

        if (refreshToken) {
            try {
                const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
                await pool.query(
                    `UPDATE users_data SET refresh_token_hash = NULL WHERE user_id = $1`,
                    [decoded.user_id]
                );
            } catch {
                // token invalid/expired - still clear cookie
            }
        }

        res.clearCookie(REFRESH_COOKIE_NAME, cookieOptions);
        return res.status(200).json({ message: "Signed out." });
    } catch (err) {
        console.error("Signout error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
};
