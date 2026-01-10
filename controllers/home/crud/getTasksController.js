const pool = require("../../../db");

exports.getTasks = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const taskId = req.params.id;

        if (taskId) {
            const result = await pool.query(
                `SELECT task_id, title, deadline, description, tags, status,
                (status = 'Pending' AND deadline IS NOT NULL AND deadline < CURRENT_DATE) AS expired,
                created_at, updated_at
         FROM tasks_data
         WHERE task_id = $1 AND user_id = $2
         LIMIT 1`,
                [taskId, userId]
            );

            if (result.rowCount === 0) return res.status(404).json({ message: "Task not found." });
            return res.status(200).json(result.rows[0]);
        }

        const result = await pool.query(
            `SELECT task_id, title, deadline, description, tags, status,
              (status = 'Pending' AND deadline IS NOT NULL AND deadline < CURRENT_DATE) AS expired,
              created_at, updated_at
       FROM tasks_data
       WHERE user_id = $1
       ORDER BY
         CASE WHEN status = 'Pending' THEN 0 ELSE 1 END,
         deadline NULLS LAST,
         created_at DESC`,
            [userId]
        );

        return res.status(200).json(result.rows);
    } catch (err) {
        console.error("Get tasks error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
};
