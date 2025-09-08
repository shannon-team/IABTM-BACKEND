const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:8000';
const TEST_USER_ID = 'your-test-user-id'; // Replace with actual user ID
const TEST_GROUP_ID = 'your-test-group-id'; // Replace with actual group ID

// Test function for message API
async function testMessageAPI() {
  console.log('🧪 Testing Message API...\n');
  
  try {
    // Test 1: Get group messages
    console.log('📋 Test 1: Getting group messages');
    const groupResponse = await axios.get(`${BASE_URL}/api/messages`, {
      params: {
        groupId: TEST_GROUP_ID,
        limit: 10
      },
      withCredentials: true
    });
    
    console.log('✅ Group messages response:', {
      status: groupResponse.status,
      success: groupResponse.data.success,
      messageCount: groupResponse.data.data?.length || 0,
      pagination: groupResponse.data.pagination
    });
    
    if (groupResponse.data.data && groupResponse.data.data.length > 0) {
      console.log('📝 Sample group message:', {
        id: groupResponse.data.data[0]._id,
        content: groupResponse.data.data[0].content?.substring(0, 50),
        sender: groupResponse.data.data[0].sender?.name,
        createdAt: groupResponse.data.data[0].createdAt
      });
    }
    
  } catch (error) {
    console.error('❌ Group messages test failed:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      error: error.message
    });
  }
  
  try {
    // Test 2: Get personal conversations
    console.log('\n📋 Test 2: Getting personal conversations');
    const conversationsResponse = await axios.get(`${BASE_URL}/api/messages/conversations`, {
      withCredentials: true
    });
    
    console.log('✅ Conversations response:', {
      status: conversationsResponse.status,
      success: conversationsResponse.data.success,
      conversationCount: conversationsResponse.data.data?.length || 0
    });
    
    if (conversationsResponse.data.data && conversationsResponse.data.data.length > 0) {
      console.log('📝 Sample conversation:', {
        id: conversationsResponse.data.data[0].id,
        name: conversationsResponse.data.data[0].name,
        lastMessage: conversationsResponse.data.data[0].lastMessage?.substring(0, 50)
      });
    }
    
  } catch (error) {
    console.error('❌ Conversations test failed:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      error: error.message
    });
  }
  
  try {
    // Test 3: Send a test message
    console.log('\n📋 Test 3: Sending test message');
    const sendResponse = await axios.post(`${BASE_URL}/api/messages/send-message`, {
      content: 'Test message from API test script',
      groupId: TEST_GROUP_ID
    }, {
      withCredentials: true
    });
    
    console.log('✅ Send message response:', {
      status: sendResponse.status,
      success: sendResponse.data.success,
      messageId: sendResponse.data.data?._id
    });
    
  } catch (error) {
    console.error('❌ Send message test failed:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      error: error.message
    });
  }
  
  console.log('\n🎉 Message API testing completed!');
}

// Run the test
testMessageAPI().catch(console.error); 