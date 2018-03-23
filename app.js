require('dotenv-extended').load()

var restify = require('restify')
var builder = require('botbuilder')
var botbuilder_azure = require('botbuilder-azure')
var peopleNumCard = require('./adaptiveCard/peopleNumCard_v2.js').card
var checkinCard = require('./adaptiveCard/checkinCard.js').card
var cityCard = require('./adaptiveCard/city2.js').card

//npm install -g botbuilder-cognitiveservices
var cognitiveservices = require('./node_modules/botbuilder-cognitiveservices');


// Setup Restify Server
var server = restify.createServer()
server.listen(process.env.port || process.env.PORT || 3978, function () {
  console.log('%s listening to %s', server.name, server.url)
})

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
  appId: process.env.MicrosoftAppId,
  appPassword: process.env.MicrosoftAppPassword,
  openIdMetadata: process.env.BotOpenIdMetadata
})

// Listen for messages from users
server.post('/api/messages', connector.listen())

var tableName = 'botdata'
// const connString = 'DefaultEndpointsProtocol=https;AccountName=hanatour9833;AccountKey=6jqh42QQjWWBwoPGGR/Jr0PZjhBMZVbHm/gkhEfHvOj8aV6+oI8ed6ZAAwB5m793WqyQDiduJJB0QpseJwqYxw==;EndpointSuffix=core.windows.net'
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env.AzureWebJobsStorage)
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient)

var bot = new builder.UniversalBot(connector, [
  function (session) {
    session.send('안녕하세요 만나서 반갑습니다!KBCard 챗봇 입니다.')
 
  },
  function (session, results) {
  
  },
  
  function (session, results) {
   

  },
  function (session, results, next) {
   
  }
]).set('storage', tableStorage) // Register in-memory storage


//=========================================================
// Bots Dialogs QnAMakerRecognizer
//=========================================================

var qnAMakerRecognizer = new cognitiveservices.QnAMakerRecognizer({
  knowledgeBaseId: '9d231467-ae1a-4919-a845-245d84784813',
  subscriptionKey: 'cc2c5764d57b4feaafa0480d0c355653',
  top: 4
});

var qnaMakerTools = new cognitiveservices.QnAMakerTools();
bot.library(qnaMakerTools.createLibrary());

var basicQnAMakerDialog = new cognitiveservices.QnAMakerDialog({
  recognizers: [qnAMakerRecognizer],
  defaultMessage: 'No match! Try changing the query terms!',
  qnaThreshold: 0.3,
  feedbackLib: qnaMakerTools
});

// Override to also include the knowledgebase question with the answer on confident matches
basicQnAMakerDialog.respondFromQnAMakerResult = function (session, qnaMakerResult) {
  var result = qnaMakerResult;
  var response = 'FAQ 질문 입니다.From KBCard:  \r\n  Q: ' + result.answers[0].questions[0] + '  \r\n A: ' + result.answers[0].answer;
  session.send(response);
}

// Override to log user query and matched Q&A before ending the dialog
basicQnAMakerDialog.defaultWaitNextMessage = function (session, qnaMakerResult) {
  if (session.privateConversationData.qnaFeedbackUserQuestion != null && qnaMakerResult.answers != null && qnaMakerResult.answers.length > 0
      && qnaMakerResult.answers[0].questions != null && qnaMakerResult.answers[0].questions.length > 0 && qnaMakerResult.answers[0].answer != null) {
      console.log('User Query: ' + session.privateConversationData.qnaFeedbackUserQuestion);
      console.log('KB Question: ' + qnaMakerResult.answers[0].questions[0]);
      console.log('KB Answer: ' + qnaMakerResult.answers[0].answer);
  }
  session.endDialog();
}


bot.on('conversationUpdate', function (message) {
  if (message.membersAdded) {
    message.membersAdded.forEach(function (identity) {
      if (identity.id === message.address.bot.id) {
        bot.beginDialog(message.address, '/')
      }
    })
  }
})
// const luis = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/e3fd6d0a-9b70-4a1b-ae81-b779db93024a?subscription-key=c4ac39be736d47598ab8ca33b5cccd7c&verbose=true&timezoneOffset=0&q='
// var recognizer = new builder.LuisRecognizer(luis)
// bot.recognizer(recognizer)
// log any bot errors into the console
bot.on('error', function (e) {
  console.log('And error ocurred', e)
})


bot.dialog('FAQ',basicQnAMakerDialog)
.triggerAction({
  matches: 'FAQ'
})
