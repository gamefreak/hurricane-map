var SCALE = 10;
var jsonFile = "";
switch (location.hash) {
	default:
	case "#sandy":
		jsonFile = "sandy.json";
		break;
	case "#isaac":
		jsonFile = "isaac.json";
		break;
}
d3.json(jsonFile, function(data) {
	console.log(data);
	window.data = data;

	var svg = d3.select("body").append("svg")
		// .style("margin-left", "700px")
		.attr("width", (data.bounds.xmax-data.bounds.xmin)*SCALE)
		.attr("height", (data.bounds.ymax-data.bounds.ymin)*SCALE)

	var transformLayer = svg.append("g")
	.attr("transform", "scale(1, -1) scale("+SCALE+") translate(0 0) translate("+(-data.bounds.xmin)+" "+(-data.bounds.ymax)+") scale(1)")
	transformLayer.append("image")
		.attr("x", -180)
		.attr("y", -90)
		.attr("width", 360)
		.attr("height", 180)
		.attr("transform", "scale(1, -1)")
		.attr("xlink:href", "world_map.jpeg")

	var opacityLayer = transformLayer.append("g")
	opacityLayer.style("opacity", ".5")
	var scales = data.forecast
		// .sort(function(a,b){return d3.descending(a.range, b.range); })
		.map(function(e1, i, a) {
		return d3.time.scale()
		.domain(e1.points.map(function(e2,i,a){
			return new Date((e2.time-e1.range*3600)*1000);
		}))
		.range(e1.points.map(function(e2,i,a){return [e2.point.x, e2.point.y];}))
		.clamp(true);
	});

	window.scales = scales;

	var subLayers = opacityLayer.selectAll("g").data(scales.map(function(e,i,a){
		return {interpolator: e, index: i};
	}));
	var subLayersEntered = subLayers.enter().append("g")
		.style("fill", function(dat, i){
			return d3.rgb(255, 0, 255).darker(((7-i)/3.0))
		});

	subLayersEntered.append("polygon").property("index", function(r, i) {return i});
	subLayersEntered.append("circle").attr("r", function(r,i){return data.ranges[i]});

	subTrans = subLayers
		.transition()
		.delay(1000)
		.duration(15000)
		.ease("linear")
	subTrans.selectAll("circle")
		.tween("att", function(dat,i){
			return function(t){
				var date = new Date((data.times.from + (data.times.to-data.times.from)*t)*1000);
				pos = dat.interpolator(date);
				this.setAttribute("cx", pos[0]);
				this.setAttribute("cy", pos[1]);
			}
		});

	
	subTrans.selectAll("polygon")
		.tween("att", function(dat, i) {
			return function(t) {
				var date = new Date((data.times.from + (data.times.to-data.times.from)*t)*1000);
				// var i = this.index;
				var v1 = dat.interpolator(date);
				var v2 = scales[Math.min(dat.index+1,scales.length-1)](date);
				// if (i==7)console.log(v, polypoints(v, i));
				if (i != 7)
				this.setAttribute("points", polypoints(v1, v2, dat.index));
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
});
