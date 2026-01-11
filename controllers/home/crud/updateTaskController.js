const pool = require("../../../db");
const cloudinary = require("../../../utils/cloudinary/cloudinary");
const { uploadBufferToCloudinary } = require("../../../utils/cloudinary/cloudinaryUpload");

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

        const { title, deadline, description, tags, status, removeImage } = req.body;

        if (title !== undefined && String(title).trim() === "") {
            return res.status(400).json({ message: "title cannot be empty." });
        }
        if (deadline !== undefined) {
            if (deadline === null || String(deadline).trim() === "") {
                return res.status(400).json({ message: "deadline cannot be empty." });
            }
            if (!isValidDate(deadline)) {
                return res.status(400).json({ message: "deadline must be a valid date (YYYY-MM-DD)." });
            }
        }
        if (description !== undefined && String(description).trim() === "") {
            return res.status(400).json({ message: "description cannot be empty." });
        }

        let safeTags = null;
        if (tags !== undefined) {
            const parsedTags = parseTags(tags);
            if (!parsedTags) return res.status(400).json({ message: "tags cannot be empty." });

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

        const currentRes = await pool.query(
            `SELECT image_public_id FROM tasks_data WHERE task_id = $1 AND user_id = $2 LIMIT 1`,
            [taskId, userId]
        );
        if (currentRes.rowCount === 0) {
            return res.status(404).json({ message: "Task not found." });
        }

        const currentPublicId = currentRes.rows[0].image_public_id;

        let newImageUrl = undefined;
        let newImagePublicId = undefined;

        const wantsRemove = String(removeImage).toLowerCase() === "true";

        if (wantsRemove) {
            if (currentPublicId) {
                await cloudinary.uploader.destroy(currentPublicId);
            }
            newImageUrl = null;
            newImagePublicId = null;
        }

        if (req.file) {
            if (currentPublicId) {
                await cloudinary.uploader.destroy(currentPublicId);
            }
            const uploaded = await uploadBufferToCloudinary(req.file.buffer, "tasks");
            newImageUrl = uploaded.secure_url;
            newImagePublicId = uploaded.public_id;
        }

        const result = await pool.query(
            `UPDATE tasks_data
       SET
         title = COALESCE($1, title),
         deadline = COALESCE($2, deadline),
         description = COALESCE($3, description),
         tags = COALESCE($4, tags),
         status = COALESCE($5, status),
         image_url = COALESCE($6, image_url),
         image_public_id = COALESCE($7, image_public_id),
         updated_at = NOW()
       WHERE task_id = $8 AND user_id = $9
       RETURNING task_id, title, deadline, description, tags, status,
                 image_url, image_public_id,
                 (status = 'Pending' AND deadline IS NOT NULL AND deadline < CURRENT_DATE) AS expired,
                 created_at, updated_at`,
            [
                title !== undefined ? String(title).trim() : null,
                deadline !== undefined ? deadline : null,
                description !== undefined ? String(description).trim() : null,
                tags !== undefined ? safeTags : null,
                status !== undefined ? status : null,
                newImageUrl === undefined ? null : newImageUrl,
                newImagePublicId === undefined ? null : newImagePublicId,
                taskId,
                userId,
            ]
        );

        return res.status(200).json(result.rows[0]);
    } catch (err) {
        console.error("Update task error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
};
