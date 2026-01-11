const pool = require("../../../db");
const cloudinary = require("../../../utils/cloudinary/cloudinary");

exports.deleteTask = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const taskId = req.params.id;

        const currentRes = await pool.query(
            `SELECT image_public_id FROM tasks_data WHERE task_id = $1 AND user_id = $2 LIMIT 1`,
            [taskId, userId]
        );

        if (currentRes.rowCount === 0) {
            return res.status(404).json({ message: "Task not found." });
        }

        const publicId = currentRes.rows[0].image_public_id;

        await pool.query(
            `DELETE FROM tasks_data WHERE task_id = $1 AND user_id = $2`,
            [taskId, userId]
        );

        if (publicId) {
            await cloudinary.uploader.destroy(publicId);
        }

        return res.status(200).json({ message: "Task deleted.", task_id: Number(taskId) });
    } catch (err) {
        console.error("Delete task error:", err);
        return res.status(500).json({ message: "Internal server error." });
    }
};
