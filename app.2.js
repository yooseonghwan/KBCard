/* -----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework.
----------------------------------------------------------------------------- */

var restify = require('restify')
var builder = require('botbuilder')
var botbuilder_azure = require('botbuilder-azure')
var city = require('./city.js').card

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

/* ----------------------------------------------------------------------------------------
* Bot Storage: This is a great spot to register the private state storage for your bot.
* We provide adapters for Azure Table, CosmosDb, SQL Azure, or you can implement your own!
* For samples and documentation, see: https://github.com/Microsoft/BotBuilder-Azure
* ---------------------------------------------------------------------------------------- */
var connString = 'DefaultEndpointsProtocol=https;AccountName=hanatour9833;AccountKey=6jqh42QQjWWBwoPGGR/Jr0PZjhBMZVbHm/gkhEfHvOj8aV6+oI8ed6ZAAwB5m793WqyQDiduJJB0QpseJwqYxw==;EndpointSuffix=core.windows.net'
var tableName = 'botdata'
// var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage'])
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, connString)
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient)

// Create your bot with a function to receive messages from the user
// var bot = new builder.UniversalBot(connector)

var msg = "봇이예요"

var bot = new builder.UniversalBot(connector, [
    //시작
    function (session) {
        session.send('안녕하세요 만나서 반갑습니다!')
        session.beginDialog('mainDialog')
    },

    //마지막 결과
    function (session, results) {
        session.dialogData.tonightPlan = results.response
        session.endDialog(`${session.dialogData.tonightPlan}라니! 재밌는 계획이네요! 즐거운 저녁시간 보내세요!`)
    }
])

//help 
bot.dialog('help', function (session, args, next) {
    session.endDialog("무엇을 도와드릴까요? <br/>Please say 'next' to continue");
}).triggerAction({
    matches: /^help$/i,
    onSelectAction: (session, args, next) => {

        session.beginDialog(args.action, args);
    }
});

// ask  처리 
bot.dialog('ask', function (session, args, next) {
    session.endDialog("무엇을 도와드릴까요2? <br/>Please say 'next' to continue");
}).triggerAction({
    matches: /^ask$/i,
    onSelectAction: (session, args, next) => {

        session.beginDialog(args.action, args);
    }
});


// log any bot errors into the console
bot.on('error', function (e) {
    console.log('And error ocurred', e);
});

//대화 롤베이스
bot.dialog('askForPersonalInfo', [
    function (session) {
        //도시 선택
        if (session.message && session.message.value) {
            session.send(session.message.value.cityName + "를 선택하셨습니다 send")
            return;
        } else {
            var msg = new builder.Message(session).addAttachment(city)

            //전송
            session.send(msg);
        }
    },
    function (session, results) {
        session.send(`날짜를 선택해 주세요`)
        builder.Prompts.text(session, '좋아하는 음식은 무엇인가요?')
    },
    function (session, results) {
        session.send(`${results.response}을/를 즐겨 드시는 군요!`)
        builder.Prompts.text(session, '최근에 어떤영화 보셨나요?')
    },
    function (session, results) {
        session.send(`저도 ${results.response} 재밌게 봤습니다 :)`)
        builder.Prompts.text(session, '오늘 저녁에는 뭐하실 건가요?')
    },
    function (session, results) {
        session.endDialogWithResult(results)
    }
])

// 도시 찾기 
bot.dialog('askCityInfo2', [

    function (session) {
        // 기본 버튼  사용
        // builder.Prompts.choice(session, "Which color?", "red|green|blue", { listStyle: 3 });

        if (session.message && session.message.value) {
            session.send(session.message.value.cityCode);
            return;
        }
        // addAttachment 사용 
        var msg = new builder.Message(session)
            .addAttachment(city)

        //전송
        session.send(msg);

    }
]);

// Main menu
var menuItems = { 
    "Order dinner": {
        item: "orderDinner"
    },
    "Dinner reservation": {
        item: "dinnerReservation"
    },
    "Schedule shuttle": {
        item: "scheduleShuttle"
    },
    "Request wake-up call": {
        item: "wakeupCall"
    },
}

// Menu: "Order dinner"
// This dialog allows user to order dinner to be delivered to their hotel room.
bot.dialog('mainDialog', [
    function(session){
        session.send("Lets order some dinner!");
        builder.Prompts.choice(session, "choise city :", menuItems);

        
    },
    function (session, results) {
        //step2
        session.send("step2");
    },
    function(session, results){
        //step3
        session.send("step3");
    }
])
.reloadAction(
    "start", "restart",
    {
        matches: /^restart$/i
    }
)
.cancelAction(
    "cancelOrder", "Type 'Main Menu' to continue.", 
    {
        matches: /^cancel$/i,
        confirmPrompt: "This will cancel your order. Are you sure?"
    }
);



//bot.set('storage', tableStorage)





