var express = require('express');
var apiai = require('apiai');

var mongoose = require('mongoose');
mongoose.connect('mongodb://LucaBazza:test01@ds139436.mlab.com:39436/questions_database');

var app = express();

// client access token da cambiare con il mio
var dia = apiai('c22a4fe6d883458e8063bc34327996d5');

// Per template
var bind = require('bind');

// Per email
var nodemailer = require('nodemailer');

var questions_collection = require('./Questions.js');
var users_collection = require('./Users.js');

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

// variabile per il logn
var loggedIn = false;


// Ordino i topic per farmeli mostrare in ordine sulla home
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
// Quando parte heroku apre la home passandogli i topic precedentemente ordinati
// e una variabile booleana che checka il login
app.get('/', function(req, res) {

	bind.toFile('./home.html', 
		{
			topics : arrayTopics,
			logged : loggedIn
		},
		function (data) {
            res.writeHead(200, {'Content-Type': 'text/html'});
            res.end(data);
        }
	);
	//console.log(arrayTopics);
});



// Passa la frase inserita all'agent che la matcha con un topic
// Dopodichè cerca le domande con quel topic le ordina per rating 
// apre la pagina search  e mostra le doande all'utente
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
				if (questions[i].topic == ris) {
					arrayQuestions.push(questions[i]);
				}
			}

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
				topic : ris
			},
			function (data) {
           		res.writeHead(200, {'Content-Type': 'text/html'});
            	res.end(data);
       		}
			);
        });
    });

    request.on('error', function(error) {
    	 // Devo prendere la risposta vera e propria
   		 console.log(error);
	});

	request.end();
});


// Gestione dei bottoni sulla home
// dalla search puoi cliccare su uno dei bottoni che vengono creati dinamicamente
// per accedere alla stessa pagina che mostra le domande all'utente
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


// Dopo aver cliccato una domanda 
// vengono ritornati il suo id e il suo topic
// Cerco nel database la domanda con tali id e topic
// e la mostro all'utente insieme alla sua risposta nella pagina answer.html
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


// una volta cliccato il bottone non hai trovato quello che stavi cercandi
// Apre la pagina della segreteria
// Sent è un parametro che serve all'utente per sapere se l'email è stata mandata con successo
app.get('/segreteria', function(req, res) {
	bind.toFile('./segreteria.html',
		{
			sent : false
		},
		function (data) {
       	    res.writeHead(200, {'Content-Type': 'text/html'});
         	res.end(data); 				
		}
	);
});


// 20/12 invio riuscito
// Route che invia l'email
// Mette sent a true se tutto è andato come doveva andare
app.post('/messaggio', function(req, res) {
	var textMessage = req.body.message;
	
	var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
       		user: 'lucabazzatest01@gmail.com',
       	 	pass: 'test01_ingegneria'
    	}
	});

	var mailOptions = {
		from: 'lucabazzatest01@gmail.com',
		to : 'lucabazza123@gmail.com',
		subject : "RICHIESTA DI INSERIMENTO DOMANDA",
		text : textMessage
	};

	transporter.sendMail(mailOptions, function(error, info) {
		if(error) {
			console.log(error);
			console.log("errore");
		}
		else {		
			// Rimando alla pagina di inserimento o alla home
			bind.toFile('./segreteria.html', 
				{
					sent : true
				},
				function (data) {
       	    		res.writeHead(200, {'Content-Type': 'text/html'});
         			res.end(data); 				
				}
			);
		}
	});
});

// Una volta cliccato il bottone login dalla gome 
// viene aprte la pagina loginPage.html
app.get('/loginForm', function(req, res) {
	bind.toFile('./loginPage.html', 
		{
		},
		function (data) {
       	    res.writeHead(200, {'Content-Type': 'text/html'});
         	res.end(data); 				
		}
	);
});

// Una volta cliccato login sulla form di login
// controllo se l'utente esiste nel database quindi se l'utente è un segretario
// E in caso lo rimando all'AREA PERSONALE dove puo gestire le domande
app.post('/login', function(req, res) {
	var username = req.body.username;
	var password = req.body.password;

	// ADDED USER
	/*var utente = new users_collection();
	utente.username = "Luca";
	utente.password = "test01";
	utente.save(function(err) {
		if (err) {
			console.log(err);
		}
	});*/
	users_collection.find(function(err, users) {
		if (err) {
			console.log(err);
		}
		else {
			var i = 0;
			var found = false;
			while (found != true && i < users.length) {
				if (users[i].username == username && users[i].password == password) {
					loggedIn = true;
					found = true;
				}
				i = i + 1;
			}

			// CHECK SE TROVATO
			if (found == true) {
				bind.toFile('./personalArea.html', 
					{
						topics : arrayTopics
					},
					function (data) {
       	  		  	    res.writeHead(200, {'Content-Type': 'text/html'});
         				res.end(data); 				
					}
				);
			}
			if (found == false) {
				// Rimando alla pagina di login 
				bind.toFile('./loginPage.html', 
					{

					}, 
					function(data) {
						res.writeHead(200, {'Content-Type': 'text/html'});
         				res.end(data); 	
					}
				);
			}

		}
	});

});


// Se un utente loggato è nella home invece che il tasto login ci sarà un tasto Area Personale
// Cliccandolo accederà direttamente alla sua area personale
app.get('/personalArea', function(req, res) {
	bind.toFile('./personalArea.html', 
		{
			topics : arrayTopics
		},
		function (data) {
       	    res.writeHead(200, {'Content-Type': 'text/html'});
         	res.end(data); 				
		}
	);
});

// Nell'area personale ci sarà una form tramite la quale l'utente segreatrio potrò aggiungere nuove domande 
// o nuovi topic
app.post('/addQuestion', function(req, res) {
	var nuovaDomanda = req.body.question;
	var chosenTopic = req.body.dropdownTopics;
	var newTopic = req.body.newTopic;
	var nuovaRisposta = req.body.answer;

	// Se è stato deciso di aggiungere un nuovo topic
	if (newTopic != "") {
		console.log("ciao");
		var domandaDatabase = new questions_collection();
		domandaDatabase.topic = newTopic;
		domandaDatabase.value = nuovaDomanda;
		domandaDatabase.nId = "1";
		domandaDatabase.screen = "";
		domandaDatabase.answer = nuovaRisposta;
		domandaDatabase.rating = "1";
		domandaDatabase.save(function(err) {
			if (err) {
				console.log(err); 
			}
			else {
				bind.toFile('./personalArea.html', 
					{
						topics : arrayTopics
					}, 
					function(data) {
						res.writeHead(200, {'Content-Type': 'text/html'});
         				res.end(data); 	
					}
				);
			}
		});
	}
	// Se è stato deciso di selezionare un topic gia esistente
	else {
		// Cerco l'id massimo
		questions_collection.find(function(err, questions) {
			if (err) {
				console.log(err);
			}
			else {
				var max = 0;
				// Per tutte le question
				for (var i = 0; i < questions.length; i++) {
					console.log("Questions[i].topic " + questions[i].topic + "  chosenTopic : " + chosenTopic);
					console.log("question[i].nId :" + parseInt(questions[i].nId) + "max : " + max);
					if (questions[i].topic == chosenTopic && parseInt(questions[i].nId) > max) {
						max = parseInt(questions[i].nId);
						console.log(max);
					}
				}
				var newId = max + 1;
				var domandaDatabase = new questions_collection();
				domandaDatabase.topic = chosenTopic;
				domandaDatabase.value = nuovaDomanda;
				domandaDatabase.nId = newId.toString();
				domandaDatabase.screen = "";
				domandaDatabase.answer = nuovaRisposta;
				domandaDatabase.rating = "1";
				domandaDatabase.save(function(err) {
					if (err) {
						console.log(err);
					}
					else {
						bind.toFile('./personalArea.html', 
							{
								topics : arrayTopics
							}, 
							function(data) {
								res.writeHead(200, {'Content-Type': 'text/html'});
         						res.end(data); 	
							}
						);
					}
				});
			}
		});
	}
});


// se l'utente amministratore preme logout setta la variabile loggein a falso
app.get('/logout', function(req, res) {
	loggedIn = false;
	bind.toFile('./loginPage.html', 
		{

		},
		function(data) {
			res.writeHead(200, {'Content-Type': 'text/html'});
         	res.end(data); 	
		}
	);
});



// Una volta scelto il topic contenent la domanda da modificare l'utente segretario
// Si troverà di fronte alle domande relative al topic 
app.get('/modify/:topic', function(req, res) {
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

		bind.toFile('./modify.html', 
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
});


// cliccando le domande si accederà alla pagina modifyPage.html
// dove si potrà modificare o elimnare la domanda scelta
app.get('/modify', function(req, res) {
	var nId = req.query.id;
	var topic = req.query.topic;

	// Cerco la domanda nel database
	questions_collection.find(function(err, questions) {
		if (err) {
			console.log(err);
		}
		var i = 0;
		var found = false;
		while (found != true && i < questions.length) {
			if (questions[i].nId == nId && questions[i].topic == topic) {
				// DA cambiare
				bind.toFile('./modifyPage.html', 
					{
						domanda : questions[i].value,
						topic : questions[i].topic,
						risposta : questions[i].answer,
						nId : questions[i].nId
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

app.post('/modified', function(req, res) {
	var topic = req.query.topic;
	var nId = req.query.id;
	console.log("TOPIC : " + topic);
	console.log("NID : " + nId);
});

app.listen((process.env.PORT || 8080));




