var express = require('express');

var mongoose = require('mongoose');
mongoose.connect('mongodb://LucaBazza:test01@ds139436.mlab.com:39436/questions_database');

var app = express();
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
    domanda.topic = "Isee";
    domanda.save(function(err) {
        if (err) {
            console.log("errore");
        }
    	console.log("domanda creata");     
    });*/

	// ritorna le questions
	console.log(questions);

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
	console.log(arrayTopics);

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
        console.log(arrayTopics);
	);
});

app.listen((process.env.PORT || 80));


app.get('/ciao', function(req, res) {
	res.end("ciao");
});

console.log("ciao");


