// This loads the environment variables from the .env file
require('dotenv-extended').load();

var builder = require('botbuilder');
var restify = require('restify');
var server = restify.createServer();
var botbuilder_azure = require('botbuilder-azure')


// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});
// Create connector and listen for messages
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});
server.post('/api/messages', connector.listen());

var bot = new builder.UniversalBot(connector, function (session) {
    session.send('Sorry, I did not understand \'%s\'. Type \'help\' if you need assistance.', session.message.text);
});


var tableName = 'botdata'
// const connString = 'DefaultEndpointsProtocol=https;AccountName=hanatour9833;AccountKey=6jqh42QQjWWBwoPGGR/Jr0PZjhBMZVbHm/gkhEfHvOj8aV6+oI8ed6ZAAwB5m793WqyQDiduJJB0QpseJwqYxw==;EndpointSuffix=core.windows.net'
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env.AzureWebJobsStorage)
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient)


// You can provide your own model by specifing the 'LUIS_MODEL_URL' environment variable
// This Url can be obtained by uploading or creating your model from the LUIS portal: https://www.luis.ai/

const luis = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/8e76b372-816d-4fc1-9623-af5e2761d6c3?subscription-key=124e3635cf4847138695cca906b528f4&verbose=true&timezoneOffset=0&q=';
var recognizer = new builder.LuisRecognizer(luis)
bot.recognizer(recognizer)


bot.dialog('SearchHotels', [
    function (session, args, next) {
        session.send('Welcome to the Hotels finder! We are analyzing your message: \'%s\'', session.message.text);

        // try extracting entities
        var cityEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'builtin.geography.city');
        var airportEntity = builder.EntityRecognizer.findEntity(args.intent.entities, 'AirportCode');
      
    },
    function (session, results) {
      

       
    }
]).triggerAction({
    matches: 'Recommend',
    onInterrupted: function (session) {
        session.send('Please provide a destination');
    }
}) ;

