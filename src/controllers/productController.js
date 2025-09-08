import Product from "../models/productModel.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

export const createProduct = async (req, res) => {
  try {
    const { title, shortDescription, description, price, inStock, product_id, category, images } = req.body;

    const fields = [title, shortDescription, description, product_id, category];
    const areStringsEmpty = fields.some((field) => typeof field === "string" && field.trim() === "");
    
    if (areStringsEmpty || price == null || inStock == null) {
      return res.status(400).json(new ApiResponse(400, null, "All fields are required!"));
    }
    
    // Validate images (expecting an array of secure URLs)
    if (!Array.isArray(images) || images.length ===0 || images.length > 4) {
      return res.status(400).json(new ApiResponse(400, null, "At least 1 image URL are required."));
    }

    // Determine owner and ownerType based on the role and request params
    let owner = req.user.id;
    let ownerType = req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1);

    // If SuperAdmin is creating a product for an Artist
    if (req.user.role === "superAdmin" && req.params.artistId) {
      owner = req.params.artistId;
      ownerType = "Artist";
    }

    // Create the product
    const product = new Product({
      title,
      shortDescription,
      description,
      price,
      inStock,
      product_id,
      category,
      pictures: images, // Save the secure URLs directly
      owner,
      ownerType,
    });

    await product.save();

    return res.status(201).json(new ApiResponse(201, product, "Product created successfully"));
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json(new ApiError(500, "Error creating product", error));
  }
};

// for specific artist 
export const getProducts = async (req, res) => {
  try {
    const ownerId = req.params.artistId || req.user?.id; // Use param ID if given; otherwise, use the logged-in user's ID

    const products = await Product.find({ owner: ownerId }).populate("owner", "name role");

    return res
      .status(200)
      .json(new ApiResponse(200, products, "Products fetched successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Error fetching products", error));
  }
};


export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId).populate("owner", "name role");
    if (!product) {
      return res.status(404).json(new ApiResponse(404, null, "Product not found"));
    }
    return res.status(200).json(new ApiResponse(200, product, "Product fetched successfully"));
  } catch (error) {
    return res.status(500).json(new ApiError(500, "Error fetching product", error));
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.productId, req.body, {
      new: true,
    });
    if (!product) {
      return res.status(200).json(new ApiResponse(404, null, "Product not found"));
    }
    return res
      .status(200)
      .json(new ApiResponse(200, product, "Product updated successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Error updating product", error));
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.productId);
    if (!product) {
      return res.status(200).json(new ApiResponse(404, null,"Product not found"));
    }
    return res
      .status(200)
      .json(new ApiResponse(200, null, "Product deleted successfully"));
  } catch (error) {
    return res
      .status(500)
      .json(new ApiError(500, "Error deleting product", error));
  }
};

export const filterByCategory = async (req, res) => {
  try {
    const { category } = req.body;
    const { artistId } = req.params; // Optional artist ID in params
    const { role, id} = req.user;

    if (!category) {
      return res.status(200).json(new ApiResponse(404, null, "Please provide the category."));
    }

    // Base query with category
    const query = { category };

    if (artistId) {
      // Case 1: Specific artist's products (accessible to user or superadmin)
      query.owner = artistId;
      query.ownerType = 'Artist';
    } else if (role === "superAdmin") {
      // Case 2: Superadmin's products only (if no artistId is provided)
      query.owner = id;
      query.ownerType = 'SuperAdmin';
    } else {
      // Case 3: Regular user fetching all artist products in the category
      query.ownerType = 'Artist';
    }

    const products = await Product.find(query);

    if (products.length === 0) {
      return res.status(200).json(new ApiResponse(404, null, "No products found in this category."));
    }

    return res.status(200).json(new ApiResponse(200, products, "Products fetched successfully"));

  } catch (error) {
    console.error(error);
    return res.status(500).json(new ApiError(500, "Error fetching products", error.message));
  }
};

export const getProductsByAllArtists = async (req, res) => {
  try {
    // Fetch all products where ownerType is "Artist"
    const products = await Product.find({ ownerType: "Artist" }).populate("owner", "name role");

    if (products.length === 0) {
      return res.status(404).json(new ApiResponse(404, null, "No products found from artists."));
    }

    return res.status(200).json(new ApiResponse(200, products, "Products fetched successfully"));
  } catch (error) {
    console.error("Error fetching products by artists:", error);
    return res.status(500).json(new ApiError(500, "Error fetching products", error.message));
  }
};
export const getProductsByAllSuperAdmin = async (req, res) => {
  try {
    // Fetch all products where ownerType is "Artist"
    const products = await Product.find({ ownerType: "SuperAdmin" }).populate("owner", "name role");

    if (products.length === 0) {
      return res.status(404).json(new ApiResponse(404, null, "No products found from artists."));
    }

    return res.status(200).json(new ApiResponse(200, products, "Products fetched successfully"));
  } catch (error) {
    console.error("Error fetching products by superadmin:", error);
    return res.status(500).json(new ApiError(500, "Error fetching products", error.message));
  }
};
