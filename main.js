function polypoints(arr, i) {
	var circles = [0.0, 36.0, 59.0, 79.0, 98.0, 144.0, 190.0, 239.0];
	var x1 = arr[0],
		y1 = arr[1],
		x2 = arr[2],
		y2 = arr[3];
	var r1 = circles[i]/60,
		r2 = circles[i+1]/60.0;
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
var SCALE = 10;

d3.json("sandy.json", function(data) {
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
	var scales = data.forecast.map(function(e1, i, a) {
		return d3.time.scale()
		.domain(e1.points.map(function(e2,i,a){
			return new Date((e2.time-e1.range*3600)*1000);
		}))
		.range(e1.points.map(function(e2,i,a){return [e2.point.x, e2.point.y];}))
		.clamp(true);
	});

	window.scales = scales;

	var subLayers = opacityLayer.selectAll("g").data(scales);
	var subLayersEntered = subLayers.enter().append("g")
		.style("fill", function(dat, i){
			return d3.rgb(255, 0, 255).darker(((7-i)/3.0))
		});
	var circles = subLayersEntered.append("circle")
	circles.attr("r", function(r,i){
			return ([0.0, 36.0, 59.0, 79.0, 98.0, 144.0, 190.0, 239.0])[i]/60.0;
	});
	circles
		.transition()
		.duration(5000)
		.ease("linear")
		.tween("att", function(interp,i){
			return function(t){
				var da = new Date((data.times.from + (data.times.to-data.times.from)*t)*1000);
				v =  interp(da);
				this.setAttribute("cx", (v[0]));
				this.setAttribute("cy", (v[1]));
			}
		});

	var polys = subLayersEntered.append("polygon")
	polys
		.transition()
		.duration(5000)
		.ease("linear")
		.tween("att", function(dd, i) {
			return function(t) {
				// console.log(this.select);
				var da = new Date((data.times.from + (data.times.to-data.times.from)*t)*1000);
				// var da = (data.times.from + (data.times.to-data.times.from)*t);
				// v =  dd(da);
				var v =  dd(da).concat(
					scales[Math.min(i+1,scales.length-1)
						](da));
				// if (i==7)console.log(v, polypoints(v, i));
				if (i != 7)
				this.setAttribute("points", polypoints(v, i));
		};
	});
});
