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
    session.send('안녕하세요. KBCard 챗봇 입니다. ')
    //카드 종류 추천
    //체크 카드 /신용카드
    builder.Prompts.choice(session, '반갑습니다. ' + '서비스 종류를 선택해주세요? ', ['카드 추천', 'FAQ', '자연어처리']);

  },
  function (session, results) {

    session.userData.serviceType = results.response.entity;

    if (results.response.entity == "카드 추천") {
      //카드 추천
      return session.beginDialog('survey')

    } if (results.response.entity == "FAQ") {
      // FAQ 

      return session.beginDialog('FAQStart')

    } else {

      return session.beginDialog('SearchCard')
    }



    session.send('끝 ')
  }
]).set('storage', tableStorage) // Register in-memory storage


const luis = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/8e76b372-816d-4fc1-9623-af5e2761d6c3?subscription-key=124e3635cf4847138695cca906b528f4&verbose=true&timezoneOffset=0&q=';
var recognizer = new builder.LuisRecognizer(luis)
bot.recognizer(recognizer)


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
  defaultMessage: 'FAQ의 대답이 없습니다...자료가 부족합니다. ',
  qnaThreshold: 0.3,
  feedbackLib: qnaMakerTools
});

// Override to also include the knowledgebase question with the answer on confident matches
basicQnAMakerDialog.respondFromQnAMakerResult = function (session, qnaMakerResult) {
  var result = qnaMakerResult;
  var response = 'FAQ 질문 입니다.From KBCard QnA:  \r\n  Q: ' + result.answers[0].questions[0] + '  \r\n A: ' + result.answers[0].answer;
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

// log any bot errors into the console


bot.on('error', function (e) {
  console.log('And error ocurred', e)
})


bot.dialog('FAQ', basicQnAMakerDialog);
// .triggerAction({
//   matches: 'FAQ'
// })
// bot.dialog('/', basicQnAMakerDialog);


bot.dialog('FAQStart', [
  function (session) {
    builder.Prompts.text(session, '질문을 입력해주세요');

  },
  function (session, results) {
    return session.beginDialog('FAQ')


  }
]).triggerAction({
  matches: 'Recommend',
  onInterrupted: function (session) {
    session.send('Recommend 불가');
  }
});



bot.dialog('survey', [
  function (session) {
    builder.Prompts.text(session, '안녕하세요 성함이 어떻게 되나요?');
  },
  function (session, results) {
    session.userData.name = results.response;
    builder.Prompts.choice(session, '반갑습니다. ' + results.response + '카드를 선택해주세요? ', ['신용카드', '체크카드']);
  },
  function (session, results) {
    session.userData.cardtype = results.response.entity;
    builder.Prompts.number(session, '당신의 나이는 어떻게 되시나요?');
  },
  function (session, results) {
    session.userData.age = results.response;
    builder.Prompts.choice(session, '어떤 혜택이 있는 카드를 원하시나요?? ', ['종합', '외식', '주유', '교통', '실적']);
  },

  function (session, results) {
    session.userData.benefit = results.response.entity;
    session.endDialog('당신의 성함은 :  ' + session.userData.name + '<br>' +
      ' 카드 선택한 카드 종류는 : ' + session.userData.cardtype + '<br>' +
      ' 나이는 : ' + session.userData.age + '<br>' +
      ' 혜택은 :  ' + session.userData.benefit + '<br>' +
      ' 에 맞는 카드를 추천해 드리겠습니다.'
    );
  }
]);

bot.dialog('SearchCard', [

  function (session) {
    session.send('추천 받을 카드는 어떤건가요?: \'%s\'', session.message.text);

    // try extracting entities
    var cityEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'builtin.geography.city');
    var airportEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'AirportCode');

  },
  function (session, results) {


  }
]).triggerAction({
  matches: 'Recommend',
  onInterrupted: function (session) {
    session.send('Recommend 불가');
  }
});