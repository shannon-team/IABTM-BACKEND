import express from 'express';

import { verifyExpertNumber, verifyExpertEmail, editMasterclass, deleteMasterClass, editEducation, deleteCertification, deleteEducation, editCertification, updateAbout, deleteArtistProfile } from '../controllers/expertController.js';

import { registerUserWithNumber, forgetPassword, resetPassword, registerUserWithMail, logout, loginUserWithMail, loginUserWithNumber } from '../controllers/userController.js';

import { checkRole } from '../middlewares/roleMiddleware.js';

import { authenticate } from '../middlewares/authMiddleware.js';

import { updateUserProfile , deleteUserProfile} from '../controllers/userController.js';
import { updateExpertProfile , deleteExpertProfile } from '../controllers/expertController.js';
import { createProduct, deleteProduct,  getProductById, getProducts, updateProduct } from '../controllers/productController.js';

const router = express.Router();

import { createUser } from '../controllers/superAdminController.js';
import { createArticle, deleteArticle, getArticleById, getArticles, updateArticle } from '../controllers/articleController.js';

router.post("/register-email", registerUserWithMail);

router.post("/register-number", registerUserWithNumber);

router.post("/auth/verify/number", verifyExpertNumber);

router.get("/auth/logout", logout);

router.post("/auth/login-email", loginUserWithMail);

router.post("/auth/login-number", loginUserWithNumber);

router.post("/auth/verify/email", verifyExpertEmail)

router.post("/auth/forgot-password", forgetPassword);

router.post("/auth/reset-password", resetPassword)


const adminRoutes = (role) => {
    
    router.post("/user/profile/:id", authenticate, checkRole(role), updateUserProfile)

    router.post("/expert/profile/edit/:expertId", authenticate, checkRole(role), updateExpertProfile)

    router.post("/expert/about/edit/:expertId", authenticate, checkRole(role), updateAbout)

    router.get('/artist/:artistId/product/allProducts', authenticate, checkRole(role), getProducts);

    router.get('/artist/product/getProduct/:productId', authenticate, checkRole(role), getProductById);

    router.put('/artist/product/updateProduct/:productId', authenticate, checkRole(role), updateProduct);

    router.post("/expert/masterclass/edit/:classId", authenticate, checkRole(role), editMasterclass)

    router.post("/expert/:expertId/education/edit/:educationId", authenticate, checkRole(role), editEducation)

    router.post("/expert/:expertId/certification/edit/:certificationId", authenticate, checkRole(role), editCertification)

    router.post('/createArticle', authenticate, checkRole(role), createArticle);

    router.get('/allArticles', authenticate, checkRole(role), getArticles);

    router.get('/getArticle/:id', authenticate, checkRole(role), getArticleById);

    router.put('/updateArticle/:id', authenticate, checkRole(role), updateArticle);

    router.delete('/deleteArticle/:id', authenticate, checkRole(role), deleteArticle);

    router.get('/product/allProducts', authenticate, checkRole(role), getProducts);

    router.get('/product/getProduct/:productId', authenticate, checkRole(role), getProductById);

    router.put('/product/updateProduct/:productId', authenticate, checkRole(role), updateProduct);

    router.post('/artist/:artistId/product/createProduct', authenticate, createProduct);

    router.delete("/expert/:expertId/masterclass/delete/:classId", authenticate, checkRole(role), deleteMasterClass)

    router.delete("/expert/:expertId/education/delete/:educationId", authenticate, checkRole(role), deleteEducation)

    router.delete("/expert/:expertId/certification/delete/:certificationId", authenticate, checkRole(role), deleteCertification)

    router.post('/artist/:artistId/product/createProduct', authenticate, checkRole(role), createProduct);

    router.delete('/artist/product/deleteProduct/:productId', authenticate, checkRole(role), deleteProduct);

}
                                    
const superAdminRoutes = (role) => {

    router.post("/user/create", authenticate , checkRole(role) , createUser)
  
    router.post('/product/createProduct',authenticate,  checkRole(role) , createProduct);

    router.delete("/user/delete/:id", authenticate, checkRole(role), deleteUserProfile)

    router.delete("/expert/profile/delete/:expertId", authenticate, checkRole(role), deleteExpertProfile)

    router.delete("/artist/profile/delete/:artistId", authenticate, checkRole(role), deleteArtistProfile)
}

adminRoutes(['superAdmin', 'employee'])

superAdminRoutes(['superAdmin'])

// router.get('/artist/product/filterByCategory' , filterByCategory)   NOt requried by the superadmin 


// router.get('/product/filterByCategory' , authenticate, filterByCategory)  not required 

export default router;