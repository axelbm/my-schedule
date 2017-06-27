

var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');
var opn = require('opn');
var PDFParser = require("pdf2json");
var _ = require("lodash");

var schedule_perser = require('./schedule_perser');
var menu = require('./menu');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/gmail-nodejs-quickstart.json
var SCOPES = ['https://www.googleapis.com/auth/gmail.readonly', 'https://www.googleapis.com/auth/calendar'];
var TOKEN_DIR = './';
var TOKEN_PATH = TOKEN_DIR + '_google-key.json';

var TEMP_PDF_DIR = './';
var TEMP_PDF_PATH = TEMP_PDF_DIR + '_temp.pdf';


// Load client secrets from a local file.
fs.readFile('client_secret.json', function processClientSecrets(err, content) {
	if (err) {
		console.log('Error loading client secret file: ' + err);
		return;
	}
	// Authorize a client with the loaded credentials, then call the
	// Gmail API.
	authorize(JSON.parse(content), run);
});

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
	var clientSecret = credentials.installed.client_secret;
	var clientId = credentials.installed.client_id;
	var redirectUrl = credentials.installed.redirect_uris[0];
	var auth = new googleAuth();
	var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

	// Check if we have previously stored a token.
	fs.readFile(TOKEN_PATH, function(err, token) {
		if (err) {
			getNewToken(oauth2Client, callback);
		} else {
			oauth2Client.credentials = JSON.parse(token);
			callback(oauth2Client);
		}
	});
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
	var authUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES
	});

	opn(authUrl);

	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	});
	rl.question('Enter the code from that page here: ', function(code) {
		rl.close();
		oauth2Client.getToken(code, function(err, token) {
			if (err) {
				console.log('Error while trying to retrieve access token', err);
				return;
			}
			oauth2Client.credentials = token;
			storeToken(token);
			callback(oauth2Client);
		});
	});
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
	try {
		fs.mkdirSync(TOKEN_DIR);
	} catch (err) {
		if (err.code != 'EEXIST') {
			throw err;
		}
	}
	fs.writeFile(TOKEN_PATH, JSON.stringify(token));
	console.log('Token stored to ' + TOKEN_PATH);
}



function getScheduleEmails(auth, max, callback) {
	var gmail = google.gmail('v1');

	gmail.users.messages.list({ // Request to get all email in the good label
		auth: auth,
		userId: 'me',
		labelIds: 'Label_2',
		maxResults: max > 0 ? max : null
	}, function(err, response) {
		if (err) {
			console.log('The API returned an error: ' + err);
			return;
		}
		var messageIds = response.messages;
		var messagesCount = 0
		var messages = []

		if (messageIds.length == 0) {
			console.log('No message found.');
		} else {
			for (var i = 0; i < messageIds.length; i++) {

				var messageId = messageIds[i];

				if (messageId.id === messageId.threadId) {
					gmail.users.messages.get({ // Request for each emails
						auth: auth,
						userId: 'me',
						id: messageId.id
					}, function(err , message) {
						messagesCount++

						if (err) {
							console.log('The API returned an error: ' + err);
							return;
						}

						messages.push(message)

						if (messageIds.length === messagesCount) {
							callback(messages)
						}
					})
				}else {
					messagesCount++
				}
			}
		}
	});
}


function getPDF(auth, message, callback) {
	var gmail = google.gmail('v1');
	var parts = message.payload.parts

	for (var i = 0; i < parts.length; i++) {
		var part = parts[i]

		if (part.mimeType === 'application/pdf') {
			gmail.users.messages.attachments.get({
				auth: auth,
				userId: 'me',
				messageId: message.id,
				id: part.body.attachmentId
			}, function (err, attachment) {
				if (err) {
					console.log('The API returned an error: ' + err);
					return;
				}

				callback(message, Buffer.from(attachment.data, 'base64'))
			})
		}
	}
}

function getScheduleFromPDF(message, pdf, callback) {
	var pdfParser = new PDFParser();

	pdfParser.on("pdfParser_dataError", errData => console.error(errData.parserError) );
	pdfParser.on("pdfParser_dataReady", pdfData => {
		var data = schedule_perser(pdfData)
		callback(message, data.date, data.schedule, data.err);
	});

	pdfParser.parseBuffer(pdf);
}

/**
 * Lists the labels in the user's account.
 *
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function run(auth) {
	var schedules = [];
	var schedulesCount = 0

	getScheduleEmails(auth, 200, function(messages) {
		for (var i = 0; i < messages.length; i++) {
			message = messages[i]

			getPDF(auth, message, function(message, pdf) {

				getScheduleFromPDF(message, pdf, function(message, date, schedule, error) {
					schedulesCount++

					schedules.push({
						message: message,
						date: date,
						schedule: schedule,
						error: error
					})

					if (messages.length === schedulesCount) {
						new menu(schedules)
					}
				})
			})
		}
	})
}
