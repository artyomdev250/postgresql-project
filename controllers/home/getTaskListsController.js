const pool = require("../../db");

exports.getCompletedTasks = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const result = await pool.query(
            `SELECT task_id, title, deadline, description, tags, status,
              image_url, image_public_id,
              FALSE AS expired,
              created_at, updated_at
       FROM tasks_data
       WHERE user_id = $1 AND status = 'Completed'
       ORDER BY updated_at DESC`,
            [userId]
        );

        return res.status(200).json(result.rows);
    } catch (err) {
        console.error("Get completed tasks error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
};

exports.getExpiredTasks = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const result = await pool.query(
            `SELECT task_id, title, deadline, description, tags, status,
              image_url, image_public_id,
              TRUE AS expired,
              created_at, updated_at
       FROM tasks_data
       WHERE user_id = $1
         AND status = 'Pending'
         AND deadline IS NOT NULL
         AND deadline < CURRENT_DATE
       ORDER BY deadline ASC`,
            [userId]
        );

        return res.status(200).json(result.rows);
    } catch (err) {
        console.error("Get expired tasks error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
};
