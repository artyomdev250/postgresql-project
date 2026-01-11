const express = require("express");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { home } = require("../controllers/home/homeController");

const { getTasks } = require("../controllers/home/crud/getTasksController");
const { createTask } = require("../controllers/home/crud/createTaskController");
const { updateTask } = require("../controllers/home/crud/updateTaskController");
const { deleteTask } = require("../controllers/home/crud/deleteTaskController");

const { getCompletedTasks, getExpiredTasks } = require("../controllers/home/getTaskListsController");

const router = express.Router();

router.get("/home", requireAuth, home);

router.get("/tasks/expired", requireAuth, getExpiredTasks);
router.get("/tasks/completed", requireAuth, getCompletedTasks);

router.get("/tasks", requireAuth, getTasks);
router.get("/tasks/:id", requireAuth, getTasks);
router.post("/tasks", requireAuth, upload.none(), createTask);
router.put("/tasks/:id", requireAuth, upload.none(), updateTask);
router.delete("/tasks/:id", requireAuth, deleteTask);

module.exports = router;
