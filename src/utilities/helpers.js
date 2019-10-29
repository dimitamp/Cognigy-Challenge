const fs = require('fs');
const path = require('path');


const saveConversation = (conversation, userId, sessionId) => {
  /**
     * @name saveConversation
     * @description Helper function that saves users' conversations 
     *   in separate files based on the user and session id
     */
  const file = path.join(__dirname, '../../conversations', `${userId}-${sessionId}.json`);
  fs.writeFileSync(file, JSON.stringify(conversation));
};

module.exports = {saveConversation};
