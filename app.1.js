/* -----------------------------------------------------------------------------
A simple echo bot for the Microsoft Bot Framework.
----------------------------------------------------------------------------- */

var restify = require('restify')
var builder = require('botbuilder')
var botbuilder_azure = require('botbuilder-azure')
var city = require('./city.js').card

//var cityAll = require('./cityAll')
// var fs = require("fs");
// console.log("\n *START* \n");
// var content = fs.readFileSync("./cityAll.json");
// console.log("Output Content : \n"+ content);
// console.log("\n *EXIT* \n");


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
var connString = ''
var tableName = 'botdata'
// var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, process.env['AzureWebJobsStorage'])
var azureTableClient = new botbuilder_azure.AzureTableClient(tableName, connString)
var tableStorage = new botbuilder_azure.AzureBotStorage({ gzipData: false }, azureTableClient)

// Create your bot with a function to receive messages from the user
// var bot = new builder.UniversalBot(connector)

var msg ="봇이예요"

var bot = new builder.UniversalBot(connector, [
    //시작
     function (session) {
        session.send('안녕하세요 만나서 반갑습니다!')
        session.beginDialog('askForPersonalInfo')
    
    },

    //마지막 결과
    function (session, results) {
        session.dialogData.tonightPlan = results.response
        session.endDialog(`${session.dialogData.tonightPlan}라니! 재밌는 계획이네요! 즐거운 저녁시간 보내세요!`)
    }
])

// log any bot errors into the console
bot.on('error', function (e) {
    console.log('And error ocurred', e);
});



bot.dialog('greetings', [
    function (session) {
        session.beginDialog('askName');
    },
    function (session, results) {
        session.endDialog('Hello %s!', results.response);
    }
]);
bot.dialog('askName', [
    function (session) {
        builder.Prompts.text(session, 'Hi! What is your name?');
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);


bot.dialog('askForPersonalInfo', [
    function (session) {
      //도시 선택 

      if (session.message && session.message.value) {
        // A Card's Submit Action obj was received
      //  session.send(session.message.value.cityCode);
            builder.Prompts.text(session, session.message.value.cityName+"를 선택하셨습니다")
     //    session.send(session.message.value.cityName+"를 선택하셨습니다")
      //   session.send(`날짜를 선택해 주세요`)
     //   return;
    }else{
        // addAttachment 사용 
        var msg = new builder.Message(session)
        .addAttachment(city)

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

bot.dialog('askCityInfo', [
 
    function (session) {
        // 기본 버튼  사용
        // builder.Prompts.choice(session, "Which color?", "red|green|blue", { listStyle: 3 });

        if (session.message && session.message.value) {
            // A Card's Submit Action obj was received
            session.send(session.message.value.cityCode);
            return;
        }
        // addAttachment 사용 
        var msg = new builder.Message(session)
            .addAttachment(city)

        //전송
        session.send(msg);
      
    }
])

bot.dialog('askCityInfo2', [
 
    function (session) {
       
     
        if (session.message && session.message.value) {
            // A Card's Submit Action obj was received
            session.send(session.message.value.cityCode);
            processSubmitAction(session, session.message.value);

          
            return;
        }
       // Display Welcome card with Hotels and Flights search options
        var card = {
        'contentType': 'application/vnd.microsoft.card.adaptive',
        'content': {
            '$schema': 'http://adaptivecards.io/schemas/adaptive-card.json',
            'type': 'AdaptiveCard',
            'version': '1.0',
            'body': [
                {
                    'type': 'Container',
                    'speak': '<s>Hello!</s><s>Are you looking for a flight or a hotel?</s>',
                    'items': [
                        {
                            'type': 'ColumnSet',
                            'columns': [
                                {
                                    'type': 'Column',
                                    'size': 'auto',
                                    'items': [
                                        {
                                            'type': 'Image',
                                            'url': 'https://placeholdit.imgix.net/~text?txtsize=65&txt=Adaptive+Cards&w=300&h=300',
                                            'size': 'medium',
                                            'style': 'person'
                                        }
                                    ]
                                },
                                {
                                    'type': 'Column',
                                    'size': 'stretch',
                                    'items': [
                                        {
                                            'type': 'TextBlock',
                                            'text': 'Hello!',
                                            'weight': 'bolder',
                                            'isSubtle': true
                                        },
                                        {
                                            'type': 'TextBlock',
                                            'text': 'Are you looking for a flight or a hotel?',
                                            'wrap': true
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            'actions': [
                // Hotels Search form
                {
                    'type': 'Action.ShowCard',
                    'title': 'Hotels',
                    'speak': '<s>Hotels</s>',
                    'card': {
                        'type': 'AdaptiveCard',
                        'body': [
                            {
                                'type': 'TextBlock',
                                'text': 'Welcome to the Hotels finder!',
                                'speak': '<s>Welcome to the Hotels finder!</s>',
                                'weight': 'bolder',
                                'size': 'large'
                            },
                            {
                                'type': 'TextBlock',
                                'text': 'Please enter your destination:'
                            },
                            {
                                'type': 'Input.Text',
                                'id': 'destination',
                                'speak': '<s>Please enter your destination</s>',
                                'placeholder': 'Miami, Florida',
                                'style': 'text'
                            },
                            {
                                'type': 'TextBlock',
                                'text': 'When do you want to check in?'
                            },
                            {
                                'type': 'Input.Date',
                                'id': 'checkin',
                                'speak': '<s>When do you want to check in?</s>'
                            },
                            {
                                'type': 'TextBlock',
                                'text': 'How many nights do you want to stay?'
                            },
                            {
                                'type': 'Input.Number',
                                'id': 'nights',
                                'min': 1,
                                'max': 60,
                                'speak': '<s>How many nights do you want to stay?</s>'
                            }
                        ],
                        'actions': [
                            {
                                'type': 'Action.Submit',
                                'title': 'Search',
                                'speak': '<s>Search</s>',
                                'data': {
                                    'type': 'hotelSearch'
                                }
                            }
                        ]
                    }
                },
                {
                    'type': 'Action.ShowCard',
                    'title': 'Flights',
                    'speak': '<s>Flights</s>',
                    'card': {
                        'type': 'AdaptiveCard',
                        'body': [
                            {
                                'type': 'TextBlock',
                                'text': 'Flights is not implemented =(',
                                'speak': '<s>Flights is not implemented</s>',
                                'weight': 'bolder'
                            }
                        ]
                    }
                }
            ]
        }
    };

    var msg = new builder.Message(session)
        .addAttachment(card);
    session.send(msg);
      
    }
])

bot.set('storage', tableStorage)



function processSubmitAction(session, value) {
    var defaultErrorMessage = 'Please complete all the search parameters';
    switch (value.type) {
        case 'hotelSearch':
            // Search, validate parameters
            if (validateHotelSearch(value)) {
                // proceed to search
                session.beginDialog('hotels-search', value);
            } else {
                session.send(defaultErrorMessage);
            }
            break;

        case 'hotelSelection':
            // Hotel selection
            sendHotelSelection(session, value);
            break;

        default:
            // A form data was received, invalid or incomplete since the previous validation did not pass
            session.send(defaultErrorMessage);
    }
}

function validateHotelSearch(hotelSearch) {
    if (!hotelSearch) {
        return false;
    }

    // Destination
    var hasDestination = typeof hotelSearch.destination === 'string' && hotelSearch.destination.length > 3;

    // Checkin
    var checkin = Date.parse(hotelSearch.checkin);
    var hasCheckin = !isNaN(checkin);
    if (hasCheckin) {
        hotelSearch.checkin = new Date(checkin);
    }

    // Nights
    var nights = parseInt(hotelSearch.nights, 10);
    var hasNights = !isNaN(nights);
    if (hasNights) {
        hotelSearch.nights = nights;
    }

    return hasDestination && hasCheckin && hasNights;
}

function sendHotelSelection(session, hotel) {
    var description = util.format('%d stars with %d reviews. From $%d per night.', hotel.rating, hotel.numberOfReviews, hotel.priceStarting);
    var card = {
        'contentType': 'application/vnd.microsoft.card.adaptive',
        'content': {
            'type': 'AdaptiveCard',
            'body': [
                {
                    'type': 'Container',
                    'items': [
                        {
                            'type': 'TextBlock',
                            'text': hotel.name + ' in ' + hotel.location,
                            'weight': 'bolder',
                            'speak': '<s>' + hotel.name + '</s>'
                        },
                        {
                            'type': 'TextBlock',
                            'text': description,
                            'speak': '<s>' + description + '</s>'
                        },
                        {
                            'type': 'Image',
                            'size': 'auto',
                            'url': hotel.image
                        },
                        {
                            'type': 'ImageSet',
                            'imageSize': 'medium',
                            'separation': 'strong',
                            'images': hotel.moreImages.map((img) => ({
                                'type': 'Image',
                                'url': img
                            }))
                        }
                    ],
                    'selectAction': {
                        'type': 'Action.OpenUrl',
                        'url': 'https://dev.botframework.com/'
                    }
                }
            ]
        }
    };

    var msg = new builder.Message(session)
        .addAttachment(card);

    session.send(msg);
}
