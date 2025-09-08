import express from 'express';
const router = express.Router();

import {
    registerUserWithMail, registerUserWithNumber, verifyUserNumber, updateUserProfile, loginUserWithMail, loginUserWithNumber, logout, forgetPassword, verifyUserEmail, resetPassword
    , getUserProfile, updateUserPathDay, getAllUsers, searchUsersByName, getUserById, getUserPreferences
} from '../controllers/userController.js';

import { createPersonlisedPath } from '../controllers/createPersonalisedPathController.js'

import { authenticate } from '../middlewares/authMiddleware.js';

router.post("/register-email", registerUserWithMail);

router.post("/register-number", registerUserWithNumber);

router.post("/auth/verify/number", verifyUserNumber);

router.post("/auth/verify/email", verifyUserEmail)

router.get("/auth/logout", logout);

router.post("/auth/login-email", loginUserWithMail);

router.post("/auth/login-number", loginUserWithNumber);

router.post("/auth/forgot-password", forgetPassword);

router.post("/auth/reset-password", resetPassword)

router.post("/me/update-profile", authenticate, updateUserProfile)

router.post("/increase-pathDay", authenticate, updateUserPathDay)

router.get("/me/profile", authenticate, getUserProfile)

router.get("/preferences", authenticate, getUserPreferences)

router.get("/get-all-users", authenticate, getAllUsers);
router.get("/:userId", authenticate, getUserById);

router.post("/create-personalised-path", authenticate, createPersonlisedPath)

router.post("/search",authenticate,searchUsersByName)

export default router;
