import express from "express";
import {
  createArticle,
  getArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  trackArticleView,
  getArticleViews
} from "../controllers/articleController.js";
import { authenticate } from '../middlewares/authMiddleware.js';
const router = express.Router();

router.post("/create", authenticate,createArticle);

router.post("/getAllArticles", authenticate,getArticles);

router.get("/getArticle/:id", authenticate,getArticleById);

router.put("/update/:id", authenticate,updateArticle);

router.delete("/delete/:id", authenticate,deleteArticle);

router.post("/trackViews", authenticate,trackArticleView);

router.post("/viewStats", authenticate,getArticleViews);


export default router;
