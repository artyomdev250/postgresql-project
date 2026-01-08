const express = require("express");
const { requireAuth } = require("../middleware/auth");
const { home } = require("../controllers/home/homeController");

const router = express.Router();

router.get("/home", requireAuth, home);

module.exports = router;
