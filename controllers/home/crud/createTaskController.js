const pool = require("../../../db");
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

    return s
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
}

exports.createTask = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { title, description, tags } = req.body;

        const safeTitle = title ? String(title).trim() : "";
        if (!safeTitle) return res.status(400).json({ message: "title is required." });

        const safeDescription = description ? String(description).trim() : "";
        if (!safeDescription) return res.status(400).json({ message: "description is required." });

        const parsedTags = parseTags(tags);
        if (!parsedTags) return res.status(400).json({ message: "tags is required." });

        const safeTags = parsedTags.map((t) => String(t).trim()).filter(Boolean);
        if (safeTags.length === 0) {
            return res.status(400).json({ message: "At least one tag is required." });
        }

        let imageUrl = null;
        let imagePublicId = null;

        if (req.file) {
            const uploaded = await uploadBufferToCloudinary(req.file.buffer, "tasks");
            imageUrl = uploaded.secure_url;
            imagePublicId = uploaded.public_id;
        }

        const result = await pool.query(
            `INSERT INTO tasks_data (user_id, title, description, tags, status, image_url, image_public_id)
       VALUES ($1, $2, $3, $4, 'Pending', $5, $6)
       RETURNING task_id, title, description, tags, status,
                 image_url, image_public_id,
                 created_at, updated_at`,
            [userId, safeTitle, safeDescription, safeTags, imageUrl, imagePublicId]
        );

        return res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Create task error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
};
