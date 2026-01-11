const pool = require("../../../db");
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

exports.createTask = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { title, deadline, description, tags, status } = req.body;

        const safeTitle = title ? String(title).trim() : "";
        if (!safeTitle) return res.status(400).json({ message: "title is required." });

        if (!deadline || String(deadline).trim() === "") {
            return res.status(400).json({ message: "deadline is required." });
        }
        if (!isValidDate(deadline)) {
            return res.status(400).json({ message: "deadline must be a valid date (YYYY-MM-DD)." });
        }

        const safeDescription = description ? String(description).trim() : "";
        if (!safeDescription) return res.status(400).json({ message: "description is required." });

        const parsedTags = parseTags(tags);
        if (!parsedTags) return res.status(400).json({ message: "tags is required." });

        const safeTags = parsedTags.map((t) => String(t).trim()).filter(Boolean);
        if (safeTags.length === 0) {
            return res.status(400).json({ message: "At least one tag is required." });
        }

        if (status && !["Pending", "Completed"].includes(status)) {
            return res.status(400).json({ message: "status must be 'Pending' or 'Completed'." });
        }

        let imageUrl = null;
        let imagePublicId = null;

        if (req.file) {
            const uploaded = await uploadBufferToCloudinary(req.file.buffer, "tasks");
            imageUrl = uploaded.secure_url;
            imagePublicId = uploaded.public_id;
        }

        const result = await pool.query(
            `INSERT INTO tasks_data (user_id, title, deadline, description, tags, status, expired, image_url, image_public_id)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Pending'), false, $7, $8)
       RETURNING task_id, title, deadline, description, tags, status,
                 image_url, image_public_id,
                 (status = 'Pending' AND deadline IS NOT NULL AND deadline < CURRENT_DATE) AS expired,
                 created_at, updated_at`,
            [userId, safeTitle, deadline, safeDescription, safeTags, status || null, imageUrl, imagePublicId]
        );

        return res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Create task error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
};
