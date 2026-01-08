const express = require("express");

const { signup } = require("../controllers/auth/signUpController");
const { signin } = require("../controllers/auth/signInController");
const { signout } = require("../controllers/auth/signOutController");
const { refresh } = require("../controllers/auth/refreshController");

const router = express.Router();

router.post("/signup", signup);
router.post("/signin", signin);
router.post("/signout", signout);
router.post("/refresh", refresh);

module.exports = router;
