const pool = require("../../db");

function isPastDate(dateString) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateString);
    d.setHours(0, 0, 0, 0);
    return d < today;
}

exports.updateTask = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const taskId = req.params.id;

        const { title, deadline, description, tags, status } = req.body;

        if (deadline !== undefined && deadline !== null && isPastDate(deadline)) {
            return res.status(400).json({ message: "deadline must be today or in the future." });
        }

        if (status && !["Pending", "Completed"].includes(status)) {
            return res.status(400).json({ message: "status must be 'Pending' or 'Completed'." });
        }

        const safeTags =
            tags === undefined
                ? undefined
                : Array.isArray(tags)
                    ? tags.map((t) => String(t).trim()).filter(Boolean)
                    : null;

        const expired =
            status === "Completed" ? false :
                deadline ? false :
                    undefined;

        const result = await pool.query(
            `UPDATE tasks_data
       SET
         title = COALESCE($1, title),
         deadline = COALESCE($2, deadline),
         description = COALESCE($3, description),
         tags = COALESCE($4, tags),
         status = COALESCE($5, status),
         expired = COALESCE($6, expired),
         updated_at = NOW()
       WHERE task_id = $7 AND user_id = $8
       RETURNING task_id, title, deadline, description, tags, status, expired, created_at, updated_at`,
            [
                title !== undefined ? String(title).trim() : null,
                deadline !== undefined ? deadline : null,
                description !== undefined ? description : null,
                safeTags === undefined ? null : safeTags,
                status !== undefined ? status : null,
                expired === undefined ? null : expired,
                taskId,
                userId,
            ]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "Task not found." });
        }

        return res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("Update task error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
};
