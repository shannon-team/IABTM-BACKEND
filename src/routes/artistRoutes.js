import express from 'express';
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct, filterByCategory } from '../controllers/productController.js';
import { verifyExpertNumber , verifyExpertEmail  } from '../controllers/expertController.js';

import { registerUserWithNumber , forgetPassword , resetPassword , registerUserWithMail , logout , loginUserWithMail , loginUserWithNumber} from '../controllers/userController.js';
const router = express.Router();
import { authenticate } from '../middlewares/authMiddleware.js';

// CRUD of Artist 

router.post("/register-email",  registerUserWithMail);

router.post("/register-number",  registerUserWithNumber);

router.post("/auth/verify/number", verifyExpertNumber);

router.get("/auth/logout", logout);

router.post("/auth/login-email", loginUserWithMail);

router.post("/auth/login-number", loginUserWithNumber);

router.post("/auth/verify/email", verifyExpertEmail)

router.post("/auth/forgot-password", forgetPassword);

router.post("/auth/reset-password", resetPassword)

// CRUD of Products of Artist 
router.post('/createProduct',authenticate,  createProduct);

router.get('/allProducts',authenticate, getProducts);

router.get('/getProduct/:productId', getProductById);

router.put('/updateProduct/:productId',authenticate, updateProduct);

router.delete('/deleteProduct/:productId',authenticate, deleteProduct);

router.get('/filterByCategory' , filterByCategory)
export default router;