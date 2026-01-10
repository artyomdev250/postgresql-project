const pool = require("../../db");

function isPastDate(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateString);
    d.setHours(0, 0, 0, 0);
    return d < today;
}

exports.createTask = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { title, deadline, description, tags, status } = req.body;

        if (!title || String(title).trim().length === 0) {
            return res.status(400).json({ message: "title is required." });
        }

        if (deadline && isPastDate(deadline)) {
            return res.status(400).json({ message: "deadline must be today or in the future." });
        }

        if (status && !["Pending", "Completed"].includes(status)) {
            return res.status(400).json({ message: "status must be 'Pending' or 'Completed'." });
        }

        const safeTags = Array.isArray(tags)
            ? tags.map((t) => String(t).trim()).filter(Boolean)
            : [];

        const expired = false;

        const result = await pool.query(
            `INSERT INTO tasks_data (user_id, title, deadline, description, tags, status, expired)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Pending'), $7)
       RETURNING task_id, title, deadline, description, tags, status, expired, created_at, updated_at`,
            [userId, title.trim(), deadline || null, description || null, safeTags, status || null, expired]
        );

        return res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Create task error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
};
