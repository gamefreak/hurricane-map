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
	var hashes = location.hash.length<2?["sandy"]:location.hash.slice(1).split(",");
	for (var i = 0; i < hurricaneList.length; i++) {
		var opt = document.querySelector('option[value="'+hurricaneList[i]+'"]');
		opt.selected = (hashes.indexOf(hurricaneList[i])!=-1);
	}
	loadData(hashes)
}

function loadData(files) {
	var data = [];
	for (var i = 0; i < files.length; i++) {
		if (files[i] in dataFiles) {
			data.push(dataFiles[files[i]]);
		} else {
			// var jsonFile = "storms/" + choice + ".json";
			d3.json("storms/" + files[i] + ".json", function(json) {
				dataFiles[files[i]] = json;
				loadData(files);
			});
			return;
		}
	}
	newData(data);
}

function updateColors(selection) {
	var col = d3.hsl(document.querySelector("#conecolor").value);
	selection.style("fill", function(dat, i){
		return col.brighter(1.1).darker(((i)/2.0));
	});
}

function updateOpacity(selection, opacity) {
	if (opacity == null) {
		opacity = document.querySelector("#opacityfield").value;
	}
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


	var options = d3.select("#stormlist")
		.on("change", function() {
			console.log(this.value);
			// console.dir(this);
			location.hash = "#" + Array.prototype.slice.call(this.selectedOptions).map(function(d){return d.value});
		})
		.selectAll("option")
		.data(hurricaneList)

	options.enter()
		.append("option")
		.attr("value", function(d,i) {return d})
		.text(function(d, i){return d[0].toUpperCase() + d.slice(1).toLowerCase()})
	// var options = d3.select("#picker")
	// 	.selectAll("div")
	// 	.data(hurricaneList);

	// var divs = options
	// 	.enter().append("div");

	// divs.append("input")
	// 	.attr("name", "choice")
	// 	.attr("type", "radio")
	// 	.attr("id", function(d) {return "strm"+d})
	// 	.attr("value", function(d,i) {return "#"+d})
	// 	.on("change", function(data) {
	// 		location.hash = "#" + data;
	// 	});

	// divs.append("label")
	// 	.attr("for", function(d) {return "strm"+d})
	// 	.text(function(d, i){return d[0].toUpperCase() + d.slice(1).toLowerCase()});

	window.addEventListener("hashchange", load);

	load();

	window.svg = d3.select("svg#map")
		.attr("width", 360)
		.attr("height", 180);

	var transformLayer = svg.select("g#transform");
	var stormWrapper = transformLayer.select("#storms");


	var timestamp = svg.select("#timestamp");

	var slider = svg.select("#slider").style("fill", "grey");

	var radiusEntries = d3.transpose(RANGE_TABLE);
	var radii = d3.scale.linear().domain(radiusEntries[0]).range(radiusEntries[1].map(function(d){return d/60.0}));

	window.newData = function newData(data) {
		// data = data[0];
		console.log(data);
		window.data = data;
		data.forEach(function(data, idx, array) {
			data.forecast.sort(function(a, b) {return d3.descending(a.range, b.range)})
		});


		var bounds = null;
		for (var s = 0; s < data.length; s++) {
			for (var a = 0; a < data[s].forecast.length; a++) {
				for (var b = 0; b < data[s].forecast[a].points.length; b++) {
					var pt = data[s].forecast[a].points[b].point;

					var range = radii(data[s].forecast[a].range);

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
		}
		window.bounds = bounds;


		if (data.basin == "EP" && bounds.left > bounds.right) {
			console.log("SHIFT");
			bounds.left -= 360.0;
		}
	
		console.log(bounds);

		svg
			.attr("width", (bounds.right-bounds.left)*SCALE)
			.attr("height", (bounds.top-bounds.bottom)*SCALE);

		zoomUpdate([bounds.left,bounds.top], SCALE, svg)

		slider
			.attr("x", 0)
			.attr("y", (bounds.top-bounds.bottom)*SCALE-10);


		var timescale = d3.scale.linear().range([
			d3.min(data, function(d){return d.times.from})*1000,
			d3.max(data, function(d){return d.times.to})*1000]);
		window.timescale = timescale;

		var storm = stormWrapper.selectAll("g.storm").data(data);
		storm.enter()
			.append("g").classed("storm", true)
			.call(function(d) {this.append("g").classed("opacity", true).call(updateOpacity)})
			.call(function(d) {
				this.append("g").classed("history", true)
					.append("path").classed("historyline", true);
			});
		storm.exit().remove();

		var layer = storm.select(".opacity").selectAll("g.colors").data(function(data, i) {
			return data.forecast.map(function(level, index, array) {
				var timeDomain = level.points.map(function(point,i,a){return new Date(point.time);});
				var xRange = level.points.map(function(point,i,a){return point.point.x});
				var yRange = level.points.map(function(point,i,a){return point.point.y});
				return {
					range: level.range,
					x: d3.time.scale().domain(timeDomain).range(xRange).clamp(true),
					y: d3.time.scale().domain(timeDomain).range(yRange).clamp(true)
				};
			}).map(function(level, index, array) {
				level.prev = array[Math.min(index + 1, array.length - 1)];
				return level;
			});
		});
		console.log(layer);

		layer.enter().append("g").classed("colors", true)
			.call(function() {this.append("circle")})
			.call(function() {this.append("polygon")})
			.call(function() {this.append("polyline")});
		layer.exit().remove();
		layer.call(updateColors);
		layer.select("circle")
			.attr("r", function(data, i) {return radii(data.range)})
			.attr("cx", function(data, i) {return data.x(0)})
			.attr("cy", function(data, i) {return data.y(0)})
			.style("stroke", "black").style("stroke-width", "0.1");
		layer.select("polygon");
		layer.select("polyline");


		function masterTween() {
			// console.log(this, arguments);
			// var startTime = new Date(data.times.from*1000);
			var startTime = new Date(timescale(0));
			var layerdata = layer.data();
			// console.log(layerdata[layerdata.length-1]);
			var linePath = d3.svg.line()
					.interpolate("basis")
					.x(function(d){return layerdata[layerdata.length-1].x(d)})
					.y(function(d){return layerdata[layerdata.length-1].y(d)});

			var historyLine = svg.select(".historyline");

			var timestamp = svg.select('#timestamp');

			var circle = d3.selectAll("#storms circle")
			
			var poly = svg.selectAll("polygon, polyline:not(.historyline)");

			return function(t) {
				// console.log(t, timescale(t), new Date(timescale(t)));
			// 	var now = new Date((data.times.from + (data.times.to-data.times.from)*t)*1000);
				var now = new Date(timescale(t));

				var pts = linePath(d3.time.hours(startTime, now, 6)) || "M 0 0";
				historyLine.attr("d", pts)

				timestamp.property("textContent", now);
				circle
					.attr("cx", function(d, i) {return d.x(now)})
					.attr("cy", function(d, i) {return d.y(now)})
				
				poly.attr("points", function(data, i) {
					return polypoints(data.x(now), data.y(now), radii(data.range), data.prev.x(now), data.prev.y(now), radii(data.prev.range));
				});
			};
		}

			svg
			.transition()
			.delay(50)
			.duration(10000)
			.ease("linear")
			.tween("main", masterTween)
			.tween("slider", function() {
				return function(t) {
					var width = (bounds.right-bounds.left)*SCALE-20;
					slider.attr("x", width*t);
				}
			});


		var dragger = d3.behavior.drag()
			.origin(function(d){return {x:parseFloat(this.getAttribute("x")), y:0}})
			.on("dragstart", function(){svg.transition()})
			.on("drag", function() {
				console.log(this);
				var width = (bounds.right-bounds.left)*SCALE - 20;
				var x = Math.max(0, Math.min(d3.event.x, width))
				this.setAttribute("x", x);
				masterTween()(x/width);
			})
		d3.select("#slider").call(dragger);
	
		function polypoints(x1, y1, r1, x2, y2, r2) {
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
	}
});
