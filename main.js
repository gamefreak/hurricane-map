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
var dataFiles = {};
// lee,maria,ophelia,rhina,sean
var hurricaneList = ["sandy", "jova", "philippe", "irene", "isaac", "nadine", "beryl", "bret", "katia"];

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
	var jsonFile = "storms/" + choice + ".json";
	document.querySelector('input[name="choice"][value="#'+choice+'"]').checked = true
	if (jsonFile in dataFiles) newData(dataFiles[jsonFile]);
	else d3.json(jsonFile, function(json) {
		dataFiles[jsonFile] = json;
		newData(json);
	});
}

function updateColors(selection) {
	var col = d3.hsl(document.querySelector("#conecolor").value);
	selection.style("fill", function(dat, i){
		return col.brighter(1.1).darker(((7-dat)/3.0));
	});
}

function updateOpacity(selection, opacity) {
	// console.log(arguments);
	// var opacity = document.querySelector("#opacityfield").value;
	// d3.selectAll(".opacity").style("opacity", opacity);
	selection.style("opacity", opacity);
}

function zoomUpdate(translate, scale, svg) {
	if (d3.event) {
		translate = d3.event.translate;
		scale = d3.event.scale;
	} else {
		translate = [-scale*translate[0], scale*translate[1]];
		svg.call(d3.behavior.zoom()
		.x(d3.scale.linear().domain([-180, 180]).range([-180, 180]))
		.y(d3.scale.linear().domain([90, -90]).range([180, 0]))
		.translate(translate)
		.scale(scale)
		.scaleExtent([2.5, 25.0])
		.on("zoom", zoomUpdate));
	}
	d3.select("#transform").attr("transform", "translate("+translate+") scale("+scale+") scale(1 -1)");
}
window.zu = zoomUpdate;

document.addEventListener("DOMContentLoaded", function() {
	d3.selectAll("#optionwrapper > fieldset > legend")
		.on("click", function(dat, i) {
			this.parentNode.classList.toggle("collapse");
		});
	d3.select("#conecolor").on("input", function(dat, input) {
		d3.selectAll('.colors').call(updateColors)
	});
	d3.select("#opacityfield").on("input", function(dat, input) {
		d3.selectAll('.opacity').call(updateOpacity, this.value)
	});

	var options = d3.select("#picker")
		.selectAll("div")
		.data(hurricaneList);

	var divs = options
		.enter().append("div");

	divs.append("input")
		.attr("name", "choice")
		.attr("type", "radio")
		.attr("id", function(d) {return "strm"+d})
		.attr("value", function(d,i) {return "#"+d})
		.on("change", function(data) {
			location.hash = "#" + data;
		});

	divs.append("label")
		.attr("for", function(d) {return "strm"+d})
		.text(function(d, i){return d[0].toUpperCase() + d.slice(1).toLowerCase()});

	window.addEventListener("hashchange", load);

	load();

	window.svg = d3.select("svg#map")
		.attr("width", 360)
		.attr("height", 180);

	var transformLayer = svg.select("g#transform");
	var stormWrapper = transformLayer.select("#storms");
	var stormLayer = stormWrapper.append("g").attr("class", "storm")
	var opacityLayer = stormLayer.append("g").attr("class", "opacity").call(updateOpacity, 0.25)

	var histLayer = stormLayer
		.append("g")
		.attr("class", "history");
	var histLine = histLayer.append("path")
		.attr("class", "historyline")
		.style("fill", "none")
		.style("stroke", "green")
		.style("stroke-width", "0.1")

	var timestamp = svg.select("#timestamp");

	var slider = svg.select("#slider").style("fill", "grey");

	var rangeEntries = d3.transpose(RANGE_TABLE);
	var ranges = d3.scale.linear().domain(rangeEntries[0]).range(rangeEntries[1]);

	window.newData = function newData(data) {
		console.log(data);
		window.data = data;
		data.forecast.sort(function(a,b) {
			return d3.ascending(a.range, b.range)
		});
		var bounds = null;
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
		window.bounds = bounds;
		if (data.basin == "EP" && bounds.left > bounds.right) {
			console.log("SHIFT");
			bounds.left -= 360.0;
		}
		console.log(bounds);
	
		zoomUpdate([bounds.left,bounds.top], SCALE, svg)

		var shortForcast = data.forecast
			.filter(function(e, i, a) {return e.points.length >= 2});

		var scales = shortForcast
			.map(function(e1, i, a) {
				return d3.time.scale()
					.domain(e1.points.map(function(e2,i,a){return new Date((e2.time));}))
					.range(e1.points.map(function(e2,i,a){return [e2.point.x, e2.point.y]}))
					.clamp(true);
		});
	
		window.scales = scales;
		var mappedScale = d3.scale.ordinal()
			.domain(d3.range(scales.length))
			.range(scales);
		window.mappedScale = mappedScale;

		var sizes = d3.scale.linear()
			.domain(d3.range(shortForcast.length))
			.range(shortForcast.map(function(e,i,a){return e.range;}));
		svg
			.attr("width", (bounds.right-bounds.left)*SCALE)
			.attr("height", (bounds.top-bounds.bottom)*SCALE);

		slider
			.attr("x", 0)
			.attr("y", (bounds.top-bounds.bottom)*SCALE-10);

		var subLayers = opacityLayer.selectAll("g").data(d3.range(scales.length).reverse());

		var subLayersEntered = subLayers
			.enter().append("g").classed('colors', true);
		subLayers.call(updateColors);
			
		// subLayersEntered.append("polygon")
		subLayersEntered.append("circle")
			.attr("r", function(r,i){
				return ranges(sizes(r))/60.0;
			})
			.style("stroke", "black")
			.attr("stroke-width", ".1");

		subLayersEntered.append("polygon");

		subLayersEntered.append("polyline")
			.style("stroke", "black")
			.attr("stroke-width", ".1");

		subLayers.exit().remove();

		subTransitions = svg
			.transition()
			.delay(500)
			.duration(10000)
			.ease("linear");

		function masterTween() {
			var startTime = new Date(data.times.from*1000);
			var linePath = d3.svg.line()
					.interpolate("basis")
					.x(function(d){return scales[0](d)[0]})
					.y(function(d){return scales[0](d)[1]});

			var historyLine = svg.select(".historyline");

			var timestamp = svg.select('#timestamp');

			var circles = svg.selectAll("#transform circle")
			
			var polys = svg.selectAll("polygon, polyline:not(.historyline)");

			return function(t) {
				// console.log(t);
				var now = new Date((data.times.from + (data.times.to-data.times.from)*t)*1000);
				
				var pts = linePath(d3.time.hours(startTime, now, 6)) || "M 0 0";
				historyLine.attr("d", pts)

				timestamp.property("textContent", now);
				circles
					.attr("cx", function(d, i) {return mappedScale(d)(now)[0]})
					.attr("cy", function(d, i) {return mappedScale(d)(now)[1]})
				
				polys.attr("points", function(d, i) {
					var v1 = mappedScale(d)(now)
					var v2 = mappedScale(d-1)(now)
					return polypoints(v1, v2, d);
				});
			};
		}
		subTransitions.tween("main", masterTween)

		function sliderTween() {
			return function(t) {
				var width = (bounds.right-bounds.left)*SCALE-20;
				slider.attr("x", width*t);
			};
		}
		subTransitions.tween("slider", sliderTween)



		var dragger = d3.behavior.drag()
			.origin(function(d){return {x:parseFloat(this.getAttribute("x")), y:0}})
			.on("dragstart", function(){svg.transition()})
			.on("drag", function() {
				var width = (bounds.right-bounds.left)*SCALE - 20;
				var x = Math.max(0, Math.min(d3.event.x, width))
				this.setAttribute("x", x);
				masterTween()(x/width);
			})
		d3.select("#slider").call(dragger);
	
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
