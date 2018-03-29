require('dotenv-extended').load()

var restify = require('restify')
var builder = require('botbuilder')
var botbuilder_azure = require('botbuilder-azure')
var peopleNumCard = require('./adaptiveCard/peopleNumCard_v2.js').card
var checkinCard = require('./adaptiveCard/checkinCard.js').card
var cityCard = require('./adaptiveCard/city2.js').card
var apis = require('./apis.js')

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
   // session.send('results.response.entity='+results.response.entity)

    if (results.response.entity == "카드 추천") {
      //카드 추천
     // session.send('카드 추천 입니다. ')
      return session.beginDialog('survey')

    } if (results.response.entity == "FAQ") {
      // FAQ 
     // session.send('FAQ 입니다. ')
      return session.beginDialog('FAQStart')

    } 

    return session.beginDialog('recommendation')

    // session.send('끝 ')
  }
]).set('storage', tableStorage) // Register in-memory storage


const luis = ''
var recognizer = new builder.LuisRecognizer(luis)
bot.recognizer(recognizer)

const luisurl = ''
//=========================================================
// Bots Dialogs QnAMakerRecognizer
//=========================================================

var qnAMakerRecognizer = new cognitiveservices.QnAMakerRecognizer({
  knowledgeBaseId: '',
  subscriptionKey: '',
  top: 4
});

var qnaMakerTools = new cognitiveservices.QnAMakerTools();
bot.library(qnaMakerTools.createLibrary());

var basicQnAMakerDialog = new cognitiveservices.QnAMakerDialog({
  recognizers: [qnAMakerRecognizer],
  defaultMessage: 'QNA의 대답이 없습니다... ',
  qnaThreshold: 0.1,
  feedbackLib: qnaMakerTools
});

// Override to also include the knowledgebase question with the answer on confident matches
basicQnAMakerDialog.respondFromQnAMakerResult = function (session, qnaMakerResult) {
  var result = qnaMakerResult;
  var response = 'QNA 질문 입니다.From KBCard QnA:  \r\n  Q: ' + result.answers[0].questions[0] + '  \r\n A: ' + result.answers[0].answer;
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


bot.dialog('FAQStart',[
  function (session, results) {
  builder.Prompts.text(session, 'QNA 질문하세요? 예)온라인 체크카드 발급');
  
  
  },
  function (session, results) {
   
    session.beginDialog('FAQ')
  }
]
);


bot.dialog('Recommend', [
  function (session,args) {
    //session.send('Recommend session');
  //  session.send('args'+args.intent.entities);
    var getage = builder.EntityRecognizer.findEntity(args.intent.entities, 'Age');
    var getCheckCard  = builder.EntityRecognizer.findEntity(args.intent.entities, 'CheckCard');
    var getCreditCard = builder.EntityRecognizer.findEntity(args.intent.entities, 'CreditCard');
    
    var age ='못찾음';
    var cardtype ='못찾음';
    //var creditCard ='못찾음';
    
    if (getage != null) {
      age = getage.entity.replace(/(\s*)/g, '')
      session.conversationData.age = age
    }
    if (getCheckCard != null) {
      cardtype = getCheckCard.entity.replace(/(\s*)/g, '')
      session.conversationData.cardtype = cardtype
    }
    if (getCreditCard != null) {
      cardtype = getCreditCard.entity.replace(/(\s*)/g, '')
      session.conversationData.cardtype = cardtype
    }

   // session.send(`현재 상태는... ${country}, ${checkin},${checkout},${adultNumber}`)
   // session.send('자연어 처리 결과');
   // session.send(`나이: ${age}`)
   // session.send(`카드 종류: ${cardtype}`)

    session.endDialog(
      ' 카드 종류는 : ' + cardtype + 
      ' 나이는 : ' + age + 
     // ' 혜택은 :  ' + session.userData.benefit + '<br>' +
      ' 에 맞는 카드를 추천해 드리겠습니다.'
    );
    
    
  },
  function (session, results) {
  //  return session.beginDialog('FAQ')
  builder.send('처리 로직은 개발 입사 후...');


  }
]).triggerAction({
  matches: 'Recommend',
  onInterrupted: function (session) {
    session.send('Recommend triggerAction');
  }
});



bot.dialog('survey', [
  function (session) {
    builder.Prompts.text(session, '안녕하세요 성함이 어떻게 되나요?');
  },
  function (session, results) {
    session.conversationData.name = results.response;
    builder.Prompts.choice(session, '반갑습니다. ' + results.response + ' 님 카드를 선택해주세요? ', ['신용카드', '체크카드']);
  },
  function (session, results) {
    session.conversationData.cardtype = results.response.entity;
    builder.Prompts.number(session, '당신의 나이는 어떻게 되시나요?');
  },
  function (session, results) {
    session.conversationData.age = results.response;
    builder.Prompts.choice(session, '어떤 혜택이 있는 카드를 원하시나요?? ', ['종합', '외식', '주유', '교통', '실적']);
  },

  function (session, results) {
    session.conversationData.benefit = results.response.entity;
    session.endDialog('당신의 성함은 :  ' + session.conversationData.name + 
      ' 카드 선택한 카드 종류는 : ' + session.conversationData.cardtype + 
      ' 나이는 : ' + session.conversationData.age + 
      ' 혜택은 :  ' + session.conversationData.benefit + 
      ' 에 맞는 카드를 추천해 드리겠습니다.'
    );
  }
]);


bot.dialog('recommendation', [
  function (session) {
    builder.Prompts.text(session, '자유롭게 말해주세요 예) 20대 카드추천해주세요 ,   20대 체크카드추천해주세요')
    // session.endDialog()
  }, function (session, results) {
    var query = results.response
    apis
      .luisApi(luisurl, query)
      .then(function (value) { 
       // session.send("value="+value);
        session.send("score가 적거나 Intent 대응 프로세스가 없습니다")
        handleApiResponse(session, value) })
      .catch(function (error) { 
        session.send("error="+error);
        console.error(error) })
    session.endDialog()
  }
])

function handleApiResponse (session, luisResult) {
 // session.send("score가 적거나 Intent 대응 프로세스가 없습니다")
  session.send("luis Result:"+luisResult)
}


// bot.dialog('SearchCardAI', [

//   function (session) {
//   //  session.send('추천 받을 카드는 어떤건가요?: \'%s\'', session.message.text);
//     builder.Prompts.text(session, ' ai 질문을 입력해주세요');

    
//   },
//   function (session, results,args) {
//     session.send('args'+args);
//     // try extracting entities
//     var CheckCard  = builder.EntityRecognizer.findEntity(args.intent.entities, 'CheckCard ');
   
//     session.send('CheckCard');


//   }
// ]).triggerAction({
//   matches: 'Recommend',
//   onInterrupted: function (session) {
//     session.send('Recommend 불가');
//   }
// });
