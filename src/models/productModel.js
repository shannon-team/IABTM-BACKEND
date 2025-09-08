import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    pictures : {
        type : [String],
        required:true
    },
    title : {
        type : String,
        required : true
    },
    shortDescription : {
        type : String,
        required : true
    },
    description : {
        type : String,
        required : true
    },
    price : {
        type : Number,
        required : true
    },
    inStock : {
        type : Boolean ,
        required : true
    },
    product_id : {
        type : String,
        required : true
    },
    category : {
        type : String,
        required : true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'ownerType'  // Dynamic reference to either  SuperAdmin, or Artist
    },
    ownerType: {
        type: String,
        required: true,
        enum: [ 'SuperAdmin', 'Artist'] 
    }
})

const Product = mongoose.model('Product', productSchema);

export default Product