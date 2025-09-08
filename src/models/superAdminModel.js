import mongoose, { Schema } from 'mongoose';

const superAdminSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId, ref: 'User',
        required: true
    },
    products: [{
        type: Schema.Types.ObjectId,
        ref: 'Product'  
      }]
}, { timestamps: true });


const SuperAdmin = mongoose.model('SuperAdmin', superAdminSchema);

export default SuperAdmin;
