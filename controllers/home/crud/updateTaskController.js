const pool = require("../../../db");
const cloudinary = require("../../../utils/cloudinary/cloudinary");
const { uploadBufferToCloudinary } = require("../../../utils/cloudinary/cloudinaryUpload");

function parseTags(tags) {
    if (Array.isArray(tags)) return tags;
    if (tags === undefined || tags === null) return null;

    const s = String(tags).trim();
    if (!s) return [];

    try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
    } catch (_) { }

    return s.split(",").map((t) => t.trim()).filter(Boolean);
}

function toBool(v) {
    if (v === true) return true;
    if (v === false) return false;
    if (v === undefined || v === null) return false;
    const s = String(v).trim().toLowerCase();
    return s === "true" || s === "1" || s === "yes" || s === "on";
}

exports.updateTask = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const taskId = req.params.id;

        const { title, description, tags, status, removeImage } = req.body;

        if (title !== undefined && String(title).trim() === "") {
            return res.status(400).json({ message: "title cannot be empty." });
        }
        if (description !== undefined && String(description).trim() === "") {
            return res.status(400).json({ message: "description cannot be empty." });
        }

        let safeTags = null;
        if (tags !== undefined) {
            const parsed = parseTags(tags);
            if (!parsed) return res.status(400).json({ message: "tags cannot be empty." });

            safeTags = parsed.map((t) => String(t).trim()).filter(Boolean);
            if (safeTags.length === 0) {
                return res.status(400).json({ message: "At least one tag is required." });
            }
        }

        let safeStatus = null;
        if (status !== undefined) {
            const s = String(status).trim();
            if (s !== "Pending" && s !== "Completed") {
                return res.status(400).json({ message: "status must be Pending or Completed." });
            }
            safeStatus = s;
        }

        const currentRes = await pool.query(
            `SELECT image_public_id
       FROM tasks_data
       WHERE task_id = $1 AND user_id = $2
       LIMIT 1`,
            [taskId, userId]
        );

        if (currentRes.rowCount === 0) {
            return res.status(404).json({ message: "Task not found." });
        }

        const currentPublicId = currentRes.rows[0].image_public_id;

        const hasNewFile = !!req.file && (typeof req.file.size !== "number" || req.file.size > 0);

        const removeByFlag = toBool(removeImage);
        const removeByEmptyImageField =
            Object.prototype.hasOwnProperty.call(req.body, "image") &&
            String(req.body.image ?? "").trim() === "";

        const shouldReplaceImage = hasNewFile;
        const shouldRemoveImage = !shouldReplaceImage && (removeByFlag || removeByEmptyImageField);

        let uploadedImageUrl = null;
        let uploadedImagePublicId = null;

        if (shouldReplaceImage) {
            if (currentPublicId) await cloudinary.uploader.destroy(currentPublicId);
            const uploaded = await uploadBufferToCloudinary(req.file.buffer, "tasks");
            uploadedImageUrl = uploaded.secure_url;
            uploadedImagePublicId = uploaded.public_id;
        } else if (shouldRemoveImage) {
            if (currentPublicId) await cloudinary.uploader.destroy(currentPublicId);
        }

        const result = await pool.query(
            `UPDATE tasks_data
       SET
         title = COALESCE($1, title),
         description = COALESCE($2, description),
         tags = COALESCE($3, tags),
         status = COALESCE($4, status),

         image_url = CASE
           WHEN $5 = true THEN NULL
           WHEN $6 = true THEN $7::text
           ELSE image_url
         END,

         image_public_id = CASE
           WHEN $5 = true THEN NULL
           WHEN $6 = true THEN $8::text
           ELSE image_public_id
         END,

         updated_at = NOW()
       WHERE task_id = $9 AND user_id = $10
       RETURNING task_id, title, description, tags, status,
                 image_url, image_public_id,
                 created_at, updated_at`,
            [
                title !== undefined ? String(title).trim() : null,
                description !== undefined ? String(description).trim() : null,
                tags !== undefined ? safeTags : null,
                status !== undefined ? safeStatus : null,

                shouldRemoveImage,
                shouldReplaceImage,
                shouldReplaceImage ? uploadedImageUrl : null,
                shouldReplaceImage ? uploadedImagePublicId : null,

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
