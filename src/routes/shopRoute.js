import express from 'express';
import {  getProducts, getProductById, getProductsByAllArtists, getProductsByAllSuperAdmin} from '../controllers/productController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
const router = express.Router();


router.get('/allProducts/:artistId',authenticate, getProducts); // get the specifc artist products 

router.get('/getProduct/:id',authenticate, getProductById);


// router.get('/filterByCategory' ,authenticate, filterByCategory)


router.get('/products/artists', authenticate,getProductsByAllArtists);
router.get('/products/superAdmins',authenticate, getProductsByAllSuperAdmin);
export default router;
