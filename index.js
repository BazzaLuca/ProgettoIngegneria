var express = require('express');
var apiai = require('apiai');

var mongoose = require('mongoose');
mongoose.connect('mongodb://LucaBazza:test01@ds139436.mlab.com:39436/questions_database');

var app = express();

// client access token da cambiare con il mio
var dia = apiai('c22a4fe6d883458e8063bc34327996d5');

// Per template
var bind = require('bind');

var questions_collection = require('./Questions.js');

var bodyParser = require('body-parser');
var util = require('util');

// arrayTopic è un array che tiene coppie di {"Topic1" : "Valore1"}
var arrayTopics = [];


/* Configure express app to use bodyParser()
 * to parse body as URL encoded data
 * (this is how browser POST form data)
 */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Qui inizia il programma serio
// Prendo tutte le domande dal database

questions_collection.find(function(err, questions) {
	if (err) {
		console.log(err);
	}

	/*var domanda = new questions_collection();
    domanda.value = "d";
    domanda.answer = "a";
    domanda.rating = "1";
    domanda.nId = "2";
    domanda.topic = "Laurea";
    domanda.save(function(err) {
        if (err) {
            console.log("errore");
        }
    	console.log("domanda creata");     
    });*/

	// ritorna le questions
	//console.log(questions);

	// Prendo le domande e aggiorno l'array di Topics
	for (var i = 0; i < questions.length; i++) {
		// Guardo se il topic della domanda attuale c'è gia nell'array di Topics
		// Se c'è faccio counter + questions[i].rating 
		// Se non c'è pusho il topic con counter = questions [i].rating
		var c = 0;
		var found = false;
		while (found != true && c < arrayTopics.length) {
			if (questions[i].topic == arrayTopics[c].topic) {
				arrayTopics[c].counter = arrayTopics[c].counter + parseInt(questions[i].rating);
				found = true;
			}
			c = c + 1;
		}

		// Se non ho trovato
		if (found == false) {
			arrayTopics.push({
				topic : questions[i].topic,
				counter : parseInt(questions[i].rating)
			});
		}
	}  

	// In array topic ci sono n coppie (t, c)
	// dove n è il numero di topics nel database
	// n[i].t è l'i-esimo topic 
	// n[i].c è il numero di volte che è stata cliccata una domanda con topic n[i].t

});


//  Listen to '/' request praticamente quando starta su heroku
app.get('/', function(req, res) {

	bind.toFile('./home.html', 
		{
			topics : arrayTopics 
		},
		function (data) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(data);
        }
	);
	//console.log(arrayTopics);
});



app.get('/question', function(req, res) {
	var q = req.query.questionValue;
	console.log("Q : " +  q);

    // Richiesta 
    var request = dia.textRequest(q, {
    	sessionId: 'unibot-437c3'
    });

    request.on('response', function(response) {
    	// Devo prendere la risposta vera e propria
        // 24/11 Sostituito l'agent placeholder con il io funziona
        var ris = response.result.fulfillment.speech;
        // devo fare la stessa cosa di prima
        var arrayQuestions = [];
        questions_collection.find(function(err, questions) {
         	if (err) {
         		console.log(err);
         	}
         	for (var i = 0; i < questions.length; i++) {
         		console.log("QUESTIONS[i].topic = " + questions[i].topic + "  ris = " + ris);
				if (questions[i].topic == ris) {
					arrayQuestions.push(questions[i]);
				}
			}
			res.end(arrayQuestions);
        });
    });
});


app.get('/search/:topic', function(req, res) {
	var topicScelto = req.params.topic;
	var arrayQuestions = [];
	questions_collection.find(function(err, questions) {
		if (err) {
			console.log(err);
		}
		for (var i = 0; i < questions.length; i++) {
			if (questions[i].topic == topicScelto) {
				arrayQuestions.push(questions[i]);
			}
		}

		
		// console.log("LENGTH " + arrayQuestions.length);

		// Ordino le questions
		var f = arrayQuestions.length - 1;
		for (var i = 0; i < arrayQuestions.length; i++) {
			for (var c = 0; c < f; c++) {
				if (arrayQuestions[c].rating < arrayQuestions[c+1].rating) {
					var copia = arrayQuestions[c];
					arrayQuestions[c] = arrayQuestions[c+1];
					arrayQuestions[c+1] = copia;
				}
			} 
			f = f - 1;
		}

		bind.toFile('./search.html', 
			{
				domande : arrayQuestions,
				topic : topicScelto
			},
			function (data) {
           		res.writeHead(200, {'Content-Type': 'text/html'});
            	res.end(data);
       		}
		);

		
	});
	// res.end(topicScelto);
});

app.get('/risposta', function(req, res) {
	var nId = req.query.id;
	var topic = req.query.topic;
	// console.log("ID DOMANDA : " + nId);
	// console.log("TOPIC DOMANDA : " + topic);



	// Cerco la domanda nel database
	questions_collection.find(function(err, questions) {
		if (err) {
			console.log(err);
		}
		var i = 0;
		var found = false;
		while (found != true && i < questions.length) {
			if (questions[i].nId == nId && questions[i].topic == topic) {
				bind.toFile('./answer.html', 
					{
						domanda : questions[i].value,
						topic : questions[i].topic,
						risposta : questions[i].answer,
						screenshot : questions[i].screen
					},
					function (data) {
           				res.writeHead(200, {'Content-Type': 'text/html'});
            			res.end(data);
       				}
				);
				found = true;
			}
			i = i + 1;
		}

	});

});

app.listen((process.env.PORT || 80));




