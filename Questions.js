var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var QuestionSchema = new Schema({
	value : String,
	answer : String,
	rating : String,
	nId : String,
	topic : String,
	screen : String
});

module.exports = mongoose.model('questions', QuestionSchema);