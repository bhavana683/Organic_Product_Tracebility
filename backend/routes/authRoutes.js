const express = require("express");
const upload = require("../config/multer");
const multer = require("multer");
const { googleLogin } = require("../controllers/authController");
router.get("/google", googleLogin);