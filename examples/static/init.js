var randomData = function (num) {
	var random = [],
		max = 1000 * 15,
		min = 300 * 15;
	for (var i = 0; i < num; i++) {
		random.push(Math.floor(Math.random() * (max - min + 1) + min));
	}
	return random;
};
var randCount = 30;
var xAxis = [];
for (var i = 1; i <= randCount; i++) {
	xAxis.push({
		small: moment(new Date()).subtract('d', randCount - i).format('D/M'),
		/*medium: moment(new Date()).subtract('d', randCount - i).format('YYYY-MM-DD'),
		large: moment(new Date()).subtract('d', randCount - i).format('LL'),*/
		tooltip: moment(new Date()).subtract('d', randCount - i).format('LL')
	});
}
document.addEventListener('DOMContentLoaded', function () {
	hljs.initHighlightingOnLoad();

	var tooltipCallback = function (label, data, index) {
		console.log(label);
		console.log(data);
		console.log(index);
	};
	new rechart({
		element: document.getElementById('chart1'),
		dataset: [{
			data: randomData(randCount),
			color: 'white',
			label: 'Windows Phone'
		}],
		xAxis: xAxis
	}, {
		ratio: 0.3,
		minHeight: 200
	});
	new rechart({
		element: document.getElementById('chart1.1'),
		dataset: [{
			data: randomData(randCount),
			color: 'white',
			label: 'Safari'
		}, {
			data: randomData(randCount),
			color: 'black',
			label: 'Internet Explorer'
		}],
		xAxis: xAxis
	}, {
		showXAxisLabel: false,
		showXAxisGrid: false,
		showXAxisLine: false,
		showYAxisLabel: false,
		showYAxisGrid: false,
		showYAxisLine: false,
		showLine: false,
		showCircle: false,
		showTooltip: false,
		bezier: true,
		showXAxisGuideline: false,
		reduceData: false,
		ratio: 0.3
	});
	new rechart({
		element: document.getElementById('chart4'),
		dataset: [{
			data: randomData(randCount),
			color: 'fuchsia',
			label: 'Safari'
		}, {
			data: randomData(randCount),
			color: 'navy',
			label: 'Internet Explorer'
		}],
		xAxis: xAxis
	}, {
		maxHeight: 200,
		minHeight: 200
	});
	new rechart({
		element: document.getElementById('chart8'),
		dataset: [{
			data: randomData(randCount),
			color: 'yellow',
			label: 'Safari'
		}, {
			data: randomData(randCount),
			color: 'orange',
			label: 'Internet Explorer'
		}, {
			data: randomData(randCount),
			color: 'red',
			label: 'Internet Explorer'
		}],
		xAxis: xAxis
	}, {

		showLine: false,
		showCircle: false,
		showArea: false,
		showBar: true,
		bezier: false,
		ratio: 0.3,
		minHeight: 200
	});
	new rechart({
		element: document.getElementById('chart6'),
		dataset: [{
			data: randomData(randCount),
			color: 'black',
			label: 'Maybe'
		}, {
			data: randomData(randCount),
			color: 'orange',
			label: 'Something'
		}, {
			data: randomData(randCount),
			color: 'maroon',
			label: 'Else'
		}],
		xAxis: xAxis
	}, {
		showArea: false,
		showCircle: false,
		reduceData: false,
		bezier: true,
		maxHeight: 200,
		minHeight: 200
	});
});