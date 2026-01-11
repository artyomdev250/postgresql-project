const pool = require("../../../db");

function isValidDate(value) {
    const d = new Date(value);
    return !Number.isNaN(d.getTime());
}

function parseTags(tags) {
    if (Array.isArray(tags)) return tags;
    if (tags === undefined || tags === null) return null;

    const s = String(tags).trim();
    if (!s) return [];

    try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
    } catch { }

    return s.split(",").map((t) => t.trim()).filter(Boolean);
}

exports.updateTask = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const taskId = req.params.id;

        const { title, deadline, description, tags, status } = req.body;

        if (title !== undefined) {
            const safeTitle = title === null ? "" : String(title).trim();
            if (!safeTitle) {
                return res.status(400).json({ message: "title cannot be empty." });
            }
        }

        if (deadline !== undefined) {
            if (deadline === null || String(deadline).trim() === "") {
                return res.status(400).json({ message: "deadline cannot be empty." });
            }
            if (!isValidDate(deadline)) {
                return res.status(400).json({ message: "deadline must be a valid date (e.g. YYYY-MM-DD)." });
            }
        }

        if (description !== undefined) {
            const safeDescription = description === null ? "" : String(description).trim();
            if (!safeDescription) {
                return res.status(400).json({ message: "description cannot be empty." });
            }
        }

        let safeTags = null;
        if (tags !== undefined) {
            const parsedTags = parseTags(tags);
            if (!parsedTags) {
                return res.status(400).json({ message: "tags cannot be empty." });
            }
            safeTags = parsedTags.map((t) => String(t).trim()).filter(Boolean);
            if (safeTags.length === 0) {
                return res.status(400).json({ message: "At least one tag is required." });
            }
        }

        if (status !== undefined && status !== null) {
            if (!["Pending", "Completed"].includes(status)) {
                return res.status(400).json({ message: "status must be 'Pending' or 'Completed'." });
            }
        }

        const result = await pool.query(
            `UPDATE tasks_data
       SET
         title = COALESCE($1, title),
         deadline = COALESCE($2, deadline),
         description = COALESCE($3, description),
         tags = COALESCE($4, tags),
         status = COALESCE($5, status),
         updated_at = NOW()
       WHERE task_id = $6 AND user_id = $7
       RETURNING task_id, title, deadline, description, tags, status,
                 (status = 'Pending' AND deadline IS NOT NULL AND deadline < CURRENT_DATE) AS expired,
                 created_at, updated_at`,
            [
                title !== undefined ? String(title).trim() : null,
                deadline !== undefined ? deadline : null,
                description !== undefined ? String(description).trim() : null,
                tags !== undefined ? safeTags : null,
                status !== undefined ? status : null,
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
