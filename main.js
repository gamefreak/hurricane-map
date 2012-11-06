var SCALE = 15;

dataFiles = {}
// PHILIPPE,bret,irene,katia,lee,maria,ophelia,rhina,sean
hurricaneList = ["philippe", "sandy", "isaac", "nadine", "beryl", "bret"]
function load() {
	var picker = document.getElementById("picker");
	var hash = location.hash;
	var choice = hurricaneList[0];
	for (var i = 0; i < hurricaneList.length; i++) {
		if ("#" + hurricaneList[i] == hash) {
			choice = hurricaneList[i];
			break;
		}
	}
	var jsonFile = choice + ".json";
	picker.value = "#" + choice;
	if (jsonFile in dataFiles) newData(dataFiles[jsonFile]);
	else d3.json(jsonFile, function(json) {
		dataFiles[jsonFile] = json;
		newData(json);
	});
}


document.addEventListener("DOMContentLoaded", function() {
	var options = d3.select("#picker")
		.selectAll("option")
		.data(hurricaneList)
	options
		.enter()
		.append("option")
		.attr("value", function(d,i) {return "#"+d})
		.text(function(d, i){return d[0].toUpperCase() + d.slice(1).toLowerCase()})
	window.addEventListener("hashchange", load);
	document.getElementById("picker").addEventListener("change", function(){
		// console.log('a');
		location.hash = document.getElementById("picker").value;
	});

	if (location.hash == "") {
		// document.getElementById("picker").value = "#sandy"
load();
	} else {
		load();
	}
// document.getElementById("picker").addEventListener




	window.svg = d3.select("body").append("svg")
		.attr("width", 360)
		.attr("height", 180)

	var transformLayer = svg.append("g")
		.attr("transform", "scale(1 -1)")
	transformLayer
		.append("image")
		.attr("x", -180)
		.attr("y", -90)
		.attr("width", 360)
		.attr("height", 180)
		.attr("transform", "scale(1, -1)")
		.attr("xlink:href", "world_map.jpeg")

	var opacityLayer = transformLayer.append("g")
		.style("opacity", ".5")

	var timestamp = svg
			.append("text")
			.attr("x", 0)
			.attr("y", 10)
			.attr("fill", "white")
			.attr("font-size", 10)

	window.newData = function newData(data) {
		console.log(data);
		window.data = data;

		var scales = data.forecast
			.map(function(e1, i, a) {
				return d3.time.scale()
					.domain(e1.points.map(function(e2,i,a){return new Date((e2.time));}))
					// .range(e1.points.map(function(e2,i,a){return [e2.point.x, e2.point.y];}))
					.range(e1.points.map(function(e2,i,a){return e2.point}))
					.clamp(true);
		});
		var mscales = scales.map(function(int,i,a){
			return {interpolator: int, interpolator2:scales[Math.min(scales.length-1,i+1)], index: i};
		});

		svg
			.attr("width", (data.bounds.xmax-data.bounds.xmin)*SCALE)
			.attr("height", (data.bounds.ymax-data.bounds.ymin)*SCALE)
		transformLayer
			.attr("transform",  "scale(1, -1) scale("+SCALE+") translate(0 0) translate("+(-data.bounds.xmin)+" "+(-data.bounds.ymax)+") scale(1)")

		window.scales = scales;

		var subLayers = opacityLayer.selectAll("g").data(mscales);

		var subLayersEntered = subLayers.enter().append("g")
			.style("fill", function(dat, i){
				return d3.rgb(0, 0, 255).darker(((7-i)/3.0))
			});

		subLayersEntered.append("polygon")
		subLayersEntered.append("circle").attr("r", function(r,i){return data.ranges[i]});

		subLayers.exit().remove();

		// subTransitions = subLayers
		subTransitions = svg
			.transition()
			.delay(500)
			.duration(15000)
			.ease("linear")

		subTransitions
			.selectAll('text')
			.tween("timestamp", function(dat, i) {
				return function(t) {
					this.textContent = (new Date((data.times.from + (data.times.to-data.times.from)*t)*1000)).toString();
				}
			})

		subTransitions.selectAll("circle")
			.tween("circle pos", function(dat,i){
				// console.log(arguments);
				return function(t){
					var date = new Date((data.times.from + (data.times.to-data.times.from)*t)*1000);
					
					pos = scales[dat.index](date);
					this.setAttribute("cx", pos[0]);
					this.setAttribute("cy", pos[1]);
				}
			});


		subTransitions.selectAll("polygon")
			.tween("poly verts", function(dat, i) {
				return function(t) {
					var date = new Date((data.times.from + (data.times.to-data.times.from)*t)*1000);
					// var v1 = dat.interpolator(date);
					var v1 = scales[dat.index](date);
					var v2 = scales[Math.min(dat.index+1,scales.length-1)](date);
					// var v2 = dat.interpolator2(date);
					if (i != 7) this.setAttribute("points", polypoints(v1, v2, dat.index));
			};
		});

		function polypoints(p1, p2, i) {
			var x1 = p1[0],
				y1 = p1[1],
				x2 = p2[0],
				y2 = p2[1];
			var r1 = data.ranges[i],
				r2 = data.ranges[i+1];
			var d = Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
			if (d == 0) return "";
			var vx = (x2-x1)/d,
				vy = (y2-y1)/d;
			var c = (r1-r2)/d
			if (c*c > 1.0) {
				return "";
			}
			var h = Math.sqrt(Math.max(0.0, 1.0-c*c));

			var quad_points = [];
			{
				var nx = vx * c - (-1) * h * vy;
				var ny = vy * c + (-1) * h * vx;

				quad_points.push([x1+r1*nx, y1+r1*ny].join(","));
				quad_points.push([x2+r2*nx, y2+r2*ny].join(","));
			}
			{
				var nx = vx * c - (+1) * h * vy;
				var ny = vy * c + (+1) * h * vx;
				
				//swapped
				quad_points.push([x2+r2*nx, y2+r2*ny].join(","));
				quad_points.push([x1+r1*nx, y1+r1*ny].join(","));
			}
			
			return quad_points.join(" ");
		}
	};

	// d3.json(jsonFile, function(data){newData(data)});

	// d3.json('sandy2.json', function(d){window.sandy = d})
	// d3.json('isaac2.json', function(d){window.isaac = d})
});
