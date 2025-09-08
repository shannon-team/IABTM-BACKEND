import mongoose, { Schema } from 'mongoose';

const employeeSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId, ref: 'User',
        required: true
    }
}, { timestamps: true });


const Employee = mongoose.model('Employee', employeeSchema);

export default Employee;
