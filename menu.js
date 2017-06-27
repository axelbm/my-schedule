
var readline = require('readline');
var _ = require("lodash");

var DAYS = [
	'Dimanche',
	'Lundi',
	'Mardi',
	'Mercredi',
	'Jeudi',
	'Vendredi',
	'Samedi'
]

var schedule_options = [
	{
		desc: "Regarder l'horaire de tout le monde.",
		callback: function (schedule) {
			var schdl = schedule.schedule
			var peoples = _.keys(schdl)

			console.log('##################################################')

			for (var i = 0; i < peoples.length; i++) {
				var name = peoples[i]

				console.log(name + ':')
				var sc = schdl[name]

				for (var day = 0; day < 7; day++) {
					if (sc[day]) {
						console.log('\t' + DAYS[day] + ' ' + (schedule.date.getDate() + day) + ':\t' + sc[day][0] + ' à ' + sc[day][1])
					}
				}
			}
		}
	},
	{
		desc: "Regarder les détails.",
		callback: function (schedule) {
			console.log('##################################################')
			console.log(decodeURIComponent(schedule.message.snippet))
		}
	},
	{
		desc: "Enregistrer dans mon calendrier.",
		callback: function (schedule) {

		}
	}
]

module.exports = function (schedules) {
	var selected_schedule

	var selectSchedule = function () {
		console.log('##################################################')
		console.log('Quel horaire voulez-vous consulter?')

		var temp = _.sortBy(schedules, [function(o) {
			if (o.date) {
				return -o.date.getTime()
			}
		}])
		schedules = temp


		for (var i = 0; i < schedules.length; i++) {
			var schedule = schedules[i]

			if (schedule.date){
				date = schedule.date

				console.log((i + 1) + ': ' + date.getDate() + ' - ' + (date.getMonth() + 1) + ' - ' + date.getFullYear())
			} else if (schedule.error.date) {
				console.log('err: Date incorrect: ' + schedule.error.date)
			}
		}
		console.log('')
		console.log('q: Quiter')

		var tryquestion = function() {
			var rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});

			rl.question('> ', function(code) {
				rl.close()

				if (code === 'q') {
					return
				}

				var index = parseInt(code) - 1

				if (index >= 0) {
					if (schedules[index]) {
						selected_schedule = schedules[index]
						scheduleMenu()
					} else {
						console.log('Vous devez choisire entre 1 et ' + schedules.length + '.')
						tryquestion()
					}
				} else {
					console.log('Vous devez entrer un nombre.')
					tryquestion()
				}
			})
		}
		tryquestion()
	}

	var scheduleMenu = function () {
		console.log('##################################################')
		console.log('Que voulez-vous faire?')

		for (var i = 0; i < schedule_options.length; i++) {
			var option = schedule_options[i]

			console.log((i + 1) + ': ' + option.desc)
		}

		console.log('')
		console.log('r: Retour')
		console.log('q: Quiter')

		var tryquestion = function() {
			var rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout
			});

			rl.question('> ', function(code) {
				rl.close()

				if (code === 'q') {
					return
				}

				if (code === 'r') {
					selectSchedule()
					selected_schedule = null
					return
				}

				var index = parseInt(code) - 1

				if (index >= 0) {
					if (schedule_options[index]) {
						schedule_options[index].callback(selected_schedule)
						scheduleMenu()
					} else {
						console.log('Vous devez choisire entre 1 et ' + schedules.length + '.')
						tryquestion()
					}
				} else {
					console.log('Vous devez entrer un nombre.')
					tryquestion()
				}
			})
		}

		tryquestion()
	}

	selectSchedule()
}
