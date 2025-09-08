import mongoose from 'mongoose';
import Group from './src/models/groupModel.js';
import User from './src/models/userModel.js';

async function testGroups() {
  try {
    // Connect to MongoDB
    await mongoose.connect('mongodb://localhost:27017/iabtm');
    console.log('✅ Connected to MongoDB');
    
    // Test 1: Check total groups in database
    console.log('\n📋 Test 1: Total groups in database');
    const totalGroups = await Group.countDocuments({});
    console.log('📊 Total groups:', totalGroups);
    
    if (totalGroups > 0) {
      // Test 2: Show sample groups
      console.log('\n📋 Test 2: Sample groups');
      const sampleGroups = await Group.find({}).limit(5).populate('members', 'name email');
      sampleGroups.forEach((group, index) => {
        console.log(`Group ${index + 1}:`, {
          id: group._id,
          name: group.name,
          memberCount: group.members?.length || 0,
          members: group.members?.map(m => m.name).join(', ') || 'No members'
        });
      });
    }
    
    // Test 3: Check users
    console.log('\n📋 Test 3: Users in database');
    const totalUsers = await User.countDocuments({});
    console.log('📊 Total users:', totalUsers);
    
    if (totalUsers > 0) {
      const sampleUser = await User.findOne({});
      console.log('📝 Sample user:', {
        id: sampleUser._id,
        name: sampleUser.name,
        email: sampleUser.email
      });
      
      // Test 4: Check groups for this user
      console.log('\n📋 Test 4: Groups for sample user');
      const userGroups = await Group.find({ members: sampleUser._id });
      console.log('📊 Groups for sample user:', userGroups.length);
      
      userGroups.forEach((group, index) => {
        console.log(`User's Group ${index + 1}:`, {
          id: group._id,
          name: group.name,
          memberCount: group.members?.length || 0
        });
      });
    }
    
    console.log('\n🎉 Groups test completed!');
    
  } catch (error) {
    console.error('❌ Error testing groups:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testGroups(); 