const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
require('dotenv').config({path: path.join(__dirname, '../', '.env')});
const io = require('socket.io-client');
const {isNil, path: get} = require('ramda');
const chalk = require('chalk');
const prompt = require('prompt');
const id = require('shortid');
const {helpers: {saveConversation}} = require('./utilities');


// Checking if necessary env variables have been provided
const {env: {COGNIGY_ENDPOINT: endpoint, ACCESS_TOKEN: token, USER_ID: user}} = process;

if (isNil(endpoint) || isNil(token)) {
  throw new Error('You must specify an access endpoint and token');
}

// Logging configuration
const {log} = console;
const botLog = (message) => log(chalk.green(`Bot 🤖 : ${message}`));
const userLog = (message) => log(chalk.yellow(`You 🧔 : ${message}`));
const errorLog = (message) => log(chalk.red(message));

// Socket configuration
const socketOpts = {query: {token}};
const cognigySocket = io(endpoint, socketOpts);


// Initializing the processInput event and the session's conversation
const sessionId = id.generate();
const userId = user || id.generate();
const event = {
  URLToken: token,
  sessionId,
  userId,
  passthroughIP: '127.0.0.1',
  reloadFlow: 'true',
  resetFlow: 'false',
  resetState: 'false',
  resetContext: 'true',
  text: '',
  data: {}
};
const conversation = [];


/* 
  Prompt configuration. Checking additionally for empty messages
  and provide the corresponding warning message
*/
const promptSchema = {
  properties: {
    text: {
      description: 'Input your message: ',
      required: true,
      message: 'Message should not be an empty string'
    }
  }
};


/**
  * @name handleExit
  * @description  Exit handling function that gets executed when user interrupts 
  * the application's execution or when he/she types exit
  */

const handleExit = () => {
  cognigySocket.disconnect();
  saveConversation(conversation, event.userId, event.sessionId);
  process.exit();
}; 


/**
  * @name handlePrompt
  * @description  Prompt helping function. It listens for user input and is responsible
  * for emitting the corresponding event to the cognigy chatbot. Additionally,
  * it stops the prompt when the chatbot is processing a message.
  */

const handlePrompt = () => {
  prompt.get(promptSchema, (err, result) => {
    if (err) {
      handleExit();
    } else {
      const {text} = result;
      if (text.toUpperCase() === 'EXIT') {
        handleExit();
      }
      prompt.stop();
      userLog(text);
      conversation.push({sender: 'user', text});
      cognigySocket.emit('processInput', {...event, text});
    }
  });
};


/* 
 Socket event listeners
*/

cognigySocket.on('connect', () => {
  log('Send an exit  message or press CTRL + C in order to exit the application');
  handlePrompt();
});


cognigySocket.on('disconnect', () => {
  log('\n Thank you for using the Cognigy service.');
});

cognigySocket.on('error', (error) => {
  errorLog(error);
});


/*
  Handling of the different types of incoming messages.
  The prompt is reenabled only after the bot has completed
  processing a message.
*/

cognigySocket.on('output', (payload) => {
  if (payload && payload.type === 'error') {
    errorLog(payload.error);
  }
  if (payload && payload.type === 'output') {
    const text = get(['data', 'text'], payload);
    botLog(text);
    conversation.push({sender: 'bot', text});
  }
  if (payload && payload.type === 'finalPing') {
    handlePrompt();
  }
});

/* 
   Catching the users interrupt signal in order to provide 
   a goodbye message and save the current conversation
*/


process.on('SIGINT', () => {
  handleExit();
});

module.exports = cognigySocket;
