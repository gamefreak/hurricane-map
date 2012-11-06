var SCALE = 15;
var RANGE_TABLE = [
	[0, 0],
	[12, 36],
	[24, 59],
	[36, 79],
	[48, 98],
	[72, 144],
	[96, 190],
	[120, 239]
];
dataFiles = {}
// PHILIPPE,bret,irene,katia,lee,maria,ophelia,rhina,sean
hurricaneList = ["jova", "philippe", "sandy", "isaac", "nadine", "beryl", "bret", "katia"]
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
	document.querySelector('input[name="choice"][value="#'+choice+'"]').checked = true
	if (jsonFile in dataFiles) newData(dataFiles[jsonFile]);
	else d3.json(jsonFile, function(json) {
		dataFiles[jsonFile] = json;
		newData(json);
	});
}


document.addEventListener("DOMContentLoaded", function() {
	var rangeEntries = d3.transpose(RANGE_TABLE);
	var ranges = d3.scale.linear().domain(rangeEntries[0]).range(rangeEntries[1]);
	// window.ranges = ranges;

	var options = d3.select("#picker")
		.style("float", "right")
		.selectAll("span")
		.data(hurricaneList)
	var spans = options
		.enter().append("span")
	spans
		.append("input")
		.attr("name", "choice")
		.attr("type", "radio")
		.attr("id", function(d) {return "strm"+d})
		.attr("value", function(d,i) {return "#"+d})
		.on("change", function(data) {
			location.hash = "#" + data;
		})
	spans.append("label")
		.attr("for", function(d) {return "strm"+d})
		.text(function(d, i){return d[0].toUpperCase() + d.slice(1).toLowerCase()})
	spans.append("br")
	window.addEventListener("hashchange", load);

	load();

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
		var bounds;
		// var left, right, top, bottom;
		for (var a = 0; a < data.forecast.length; a++) {
			for (var b = 0; b < data.forecast[a].points.length; b++) {
				var pt = data.forecast[a].points[b].point;

				var range = ranges(data.forecast[a].range)/60.0;

				if (bounds == null) {
					bounds = {
						left: pt.x-range,
						right: pt.x+range,
						top: pt.y+range,
						bottom: pt.y - range
					};
				} else {
					bounds.left = Math.min(bounds.left, pt.x-range);
					bounds.right = Math.max(bounds.right, pt.x+range);
					bounds.top = Math.max(bounds.top, pt.y+range);
					bounds.bottom = Math.min(bounds.bottom, pt.y-range);
				}
			}
		}

		if (data.basin == "EP" && bounds.left > bounds.right) {
			bounds.left -= 360.0;
		}
		// console.log(bounds);

		var scales = data.forecast
			.map(function(e1, i, a) {
				return d3.time.scale()
					.domain(e1.points.map(function(e2,i,a){return new Date((e2.time));}))
					.range(e1.points.map(function(e2,i,a){return [e2.point.x, e2.point.y]}))
					.clamp(true);
		});
		
		window.scales = scales;
		var mappedScale = d3.scale.ordinal()
			.domain(d3.range(8))
			.range(scales);
		window.mappedScale = mappedScale;

		var sizes = d3.scale.linear()
			.domain(d3.range(8))
			.range(data.forecast.map(function(e,i,a){return e.range;}))
		svg
			.attr("width", (bounds.right-bounds.left)*SCALE)
			.attr("height", (bounds.top-bounds.bottom)*SCALE)
		transformLayer
			.attr("transform",  "scale(1, -1) scale("+SCALE+") translate(0 0) translate("+(-bounds.left)+" "+(-bounds.top)+") scale(1)")

		window.scales = scales;

		var subLayers = opacityLayer.selectAll("g").data(d3.range(8)
			.reverse()
			);

		var subLayersEntered = subLayers.enter().append("g")
			.style("fill", function(dat, i){
				return d3.rgb(0, 0, 255).darker(((8-dat)/3.0))
			});

		subLayersEntered.append("polygon")
		subLayersEntered.append("circle").attr("r", function(r,i){
			return ranges(sizes(r))/60.0;
		});
		// subLayersEntered.append("polygon")

		subLayers.exit().remove();

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
				return function(t){
					var date = new Date((data.times.from + (data.times.to-data.times.from)*t)*1000);
					
					var pos = mappedScale(dat)(date)
					this.setAttribute("cx", pos[0]);
					this.setAttribute("cy", pos[1]);
				}
			});


		subTransitions.selectAll("polygon")
			.tween("poly verts", function(dat, i) {
				return function(t) {
					var date = new Date((data.times.from + (data.times.to-data.times.from)*t)*1000);

					var v1 = mappedScale(dat)(date)
					var v2 = mappedScale(dat-1)(date)
					if (dat != 0) this.setAttribute("points", polypoints(v1, v2, dat));
					this.setAttribute("n", dat)
			};
		});

		function polypoints(p1, p2, i) {
			var x1 = p1[0],
				y1 = p1[1],
				x2 = p2[0],
				y2 = p2[1];
			var r1 = ranges(sizes(i))/60,
				r2 = ranges(sizes(i-1))/60;

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
});
