const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { home } = require("../controllers/home/homeController");

const { getTasks } = require("../controllers/home/getTasksController");
const { createTask } = require("../controllers/home/createTaskController");
const { updateTask } = require("../controllers/home/updateTaskController");
const { deleteTask } = require("../controllers/home/deleteTaskController");

const { getCompletedTasks, getExpiredTasks } = require("../controllers/home/getTaskListsController");

const router = express.Router();

router.get("/home", requireAuth, home);

router.get("/tasks/expired", requireAuth, getExpiredTasks);
router.get("/tasks/completed", requireAuth, getCompletedTasks);

router.get("/tasks", requireAuth, getTasks);
router.get("/tasks/:id", requireAuth, getTasks);
router.post("/tasks", requireAuth, createTask);
router.put("/tasks/:id", requireAuth, updateTask);
router.delete("/tasks/:id", requireAuth, deleteTask);

module.exports = router;
