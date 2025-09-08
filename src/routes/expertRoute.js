import express from 'express';
const router = express.Router();
import { authenticate } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/multerMiddleware.js';
import {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  trackArticleView,
  getArticleViews
} from "../controllers/articleController.js";
import { verifyExpertNumber , getMasterclassViews , verifyExpertEmail , postMasterclass , updateExpertProfile, trackMasterclassView, updateAbout, addEducation, editEducation, deleteEducation, addCertification, editCertification, deleteCertification} from '../controllers/expertController.js';

import { registerUserWithNumber , forgetPassword , resetPassword , registerUserWithMail , logout , loginUserWithMail , loginUserWithNumber} from '../controllers/userController.js';
  
router.post("/post-masterclass" , authenticate  , postMasterclass)

router.post("/register-email", registerUserWithMail);

router.post("/register-number",  registerUserWithNumber);

router.post("/auth/verify/number", verifyExpertNumber);

router.get("/auth/logout", logout);

router.post("/auth/login-email", loginUserWithMail);

router.post("/auth/login-number", loginUserWithNumber);

router.post("/verify-expert-email", verifyExpertEmail)

router.post("/auth/forgot-password", forgetPassword);

router.post("/auth/reset-password", resetPassword)

router.post("/me/update-profile", authenticate, updateExpertProfile)

router.post("/masterclass/view",authenticate , trackMasterclassView)

router.post("/masterclass/stats",authenticate , getMasterclassViews)
// update about us 
router.put("/about", authenticate, updateAbout);

// education routes 
router.post("/education", authenticate, addEducation);
router.put("/education/:educationId", authenticate, editEducation);
router.delete("/education/:educationId", authenticate, deleteEducation);

// Certification routes
router.post("/certification", authenticate,  addCertification);
router.put("/certification/:certificationId", authenticate,  editCertification);
router.delete("/certification/:certificationId", authenticate, deleteCertification);

// expert articles 



router.post("/create", authenticate,createArticle);

router.post("/getAllArticles", authenticate,getArticles);

router.get("/getArticle/:id", authenticate,getArticleById);

router.put("/update/:id", authenticate,updateArticle);

router.delete("/delete/:id", authenticate,deleteArticle);

router.post("/trackViews", authenticate,trackArticleView);

router.post("/viewStats", authenticate,getArticleViews);

export default router;