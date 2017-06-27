var START = 10.75
var SPACE = 2.5

module.exports = function (data) {
	var lines = data.formImage.Pages[0].Texts
	var last_person
	var schedule = {}
	var progress = 0
	var date
	var err = {}

	for (var i = 0; i < lines.length; i++) {
		var line = lines[i]
		var text = decodeURIComponent(line.R[0].T)

		if (last_person != null) {

			if (line.R[0].TS[1] === 17.04) {
				var x = line.x

				var mod = (x - START)%SPACE
				if (mod > 1.25) {mod = SPACE - mod}
				var pos = Math.round((x - START)/SPACE)
				var day = Math.floor(pos/2)

				if (day >= progress) {
					progress = day

					if (parseInt(text)) {
						if (pos%2 == 0) {
							schedule[last_person][day] = [text]
						} else if (schedule[last_person][day]) {
							schedule[last_person][day][1] = text
						}
					}
				} else {
					progress = 0
					last_person = null
				}

				if (day === 13 ) {
					progress = 0
					last_person = null
				}
			}
		}

		if (line.R[0].TS[2] === 1) {
			var re = /du ?([\d]*)\/([\d]*)\/([\d]*) ?au/g.exec(text.toLowerCase())

			if (re) {
				if (re[1] && re[2] && re[3]) {
					console.log("okk")
					date = new Date('20' + re[3], re[2] - 1, re[1])
				} else {
					console.log("wtf")
					err.date = text
				}
			} else {
			err.date = text

			}
		}

		if (line.R[0].TS[1] <= 15) {
			last_person = text
			progress = 0

			schedule[last_person] = {}
		}
	}

	return {date : date, schedule : schedule, err : err}
}
