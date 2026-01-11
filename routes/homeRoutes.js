const express = require("express");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { home } = require("../controllers/home/homeController");

const { getTasks } = require("../controllers/home/crud/getTasksController");
const { createTask } = require("../controllers/home/crud/createTaskController");
const { updateTask } = require("../controllers/home/crud/updateTaskController");
const { deleteTask } = require("../controllers/home/crud/deleteTaskController");

const router = express.Router();

router.get("/home", requireAuth, home);

router.get("/tasks", requireAuth, getTasks);
router.get("/tasks/:id", requireAuth, getTasks);
router.post("/tasks", requireAuth, upload.single("image"), createTask);
router.put("/tasks/:id", requireAuth, upload.single("image"), updateTask);
router.delete("/tasks/:id", requireAuth, deleteTask);

module.exports = router;
