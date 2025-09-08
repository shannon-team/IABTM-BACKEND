import  { Schema, model } from 'mongoose';

const artistSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  products: [{
    type: Schema.Types.ObjectId,
    ref: 'Product'  
  }]
}, { timestamps: true });

const Artist = model('Artist', artistSchema);

export default Artist;
