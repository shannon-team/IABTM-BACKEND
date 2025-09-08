import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    stripeCustomerId: {
        type: String,
        required: true,
    },
    stripeSubscriptionId: {
        type: String,
        default: null
    },
    plan: {
        type: String,
        enum: ['Basic', 'Pro' ,'Advance', 'Trial'],
        required: true,
        default:'Basic'
    },
    status: {
        type: String,
        enum: ['active', 'canceled', 'trialing', 'pending'],
        required: true,
    },
    startDate: {
        type: Date,
        default:null
    },
    endDate: {
        type: Date,
        default: null
    },
    trialEnd: {
        type: Date,
        default: null
    },
    autoRenew: {
        type: Boolean,
        default: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
