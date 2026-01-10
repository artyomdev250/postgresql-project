const pool = require("../../../db");

exports.deleteTask = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const taskId = req.params.id;

        const result = await pool.query(
            `DELETE FROM tasks_data
       WHERE task_id = $1 AND user_id = $2
       RETURNING task_id`,
            [taskId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Task not found." });
        }

        return res.status(200).json({ message: "Task deleted.", task_id: result.rows[0].task_id });
    } catch (err) {
        console.error("Delete task error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
};
