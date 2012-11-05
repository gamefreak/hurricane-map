function polypoints(arr, i) {
	var circles = [0.0, 36.0, 59.0, 79.0, 98.0, 144.0, 190.0, 239.0];
	var x1 = arr[0]*4,
		y1 = arr[1]*4,
		x2 = arr[2]*4,
		y2 = arr[3]*4;
	var r1 = circles[i]/60*4,
		r2 = circles[i+1]/60.0*4;
	var d = Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
	var vx = (x2-x1)/d,
		vy = (y2-y1)/d;
	var c = (r1-r2)/d
	if (c*c > 1.0) {
		// console.log(sign1,sign2);
		// continue;
		return "";
	}
	var h = Math.sqrt(Math.max(0.0, 1.0-c*c));
	// h = pow(abs(1.0-c*c), 0.5)
	var quad_points = [];
	{
		var nx = vx * c - (-1) * h * vy;
		var ny = vy * c + (-1) * h * vx;
		// color = [(256,0,0),(0,256,0)][int((sign2+1)/2)]
		// # print (sign1, sign2), color
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
	// [a,b,d,c] = quad_points
	// quad_points = [a,b,c,d]
	return quad_points.join(" ");
}
var SCALE = 4;
d3.json("sandy.json", function(data) {
	console.log(data);
	window.data = data;
	// var svg = d3.select("body").append("svg")
	// 	.attr("width", (data.bounds.xmax-data.bounds.xmin)*5)
	// 	.attr("height", (data.bounds.ymax-data.bounds.ymin)*5);

var svg = d3.select("body").append("svg")
		.style("background-image", "url('world_map.jpeg')")
		.style("background-size", "100%")
		.attr("width", 360*SCALE)
		.attr("height", 180*SCALE);
var layer = svg.append("g");
	layer.style("opacity", ".5").style("fill", "blue");
	// for (var i = 0; i < data.forecast.length;i++) {
		// console.log(data.forecast[i].points[0].time, data.forecast[i].points[0].time, data.forecast[i].points[0].time-data.forecast[i].range*3600);
	// }
	// var dat = data.forecast[0];
	// var scale = d3.time.scale()
		// .domain(data.forecast.map(function(e,i,a){return e.points.map(function(e1,i,a){return e1.time;})}))
		// .range(data.forecast.map(function(e,i,a){return e.points.map(function(e1,i,a){return e1.point;})}));
		// .domain(data.forecast[0].points.map(function(e1,i,a){return new Date(e1.time*1000);}))
		// .range(data.forecast[0].points.map(function(e1,i,a){return [e1.point.x, e1.point.y];}));
	var scales = data.forecast.map(function(e1, i, a) {
		return d3.time.scale()
		.domain(e1.points.map(function(e2,i,a){
			return new Date((e2.time-e1.range*3600)*1000);
			// return e2.time-e1.range*3600
			// return new Date(e1.time*1000);
		}))
		// (ymax-ymin)-(y-ymin)
		// .range(data.forecast[i].points.map(function(e1,i,a){return [e1.point.x+180, (90- -90)-(e1.point.y- -90)];}));
		.range(e1.points.map(function(e2,i,a){return [e2.point.x+180, (90- -90)-(e2.point.y- -90)];}))
		.clamp(true);
		// return el.points.map(function(e2,i,a){return [e2.point.x, e2.point.y];})
	});

	var rectScales = d3.zip(data.forecast.slice(0,-1),data.forecast.slice(1)).map(function(e1, i, a) {
		// var dmne = e1[0].points.map(function(e2,i,a){
		// 	return new Date((e2.time-e1[0].range*3600)*1000);
		// });
		// var rnge = d3.zip(
		// 	e1[0].points.map(function(e2,i,a){return [e2.point.x+180, (90- -90)-(e2.point.y- -90)];}),
		// 	e1[1].points.map(function(e2,i,a){return [e2.point.x+180, (90- -90)-(e2.point.y- -90)];})
		// 	).map(d3.merge)
		return d3.time.scale()
		.domain(e1[0].points.map(function(e2,i,a){
			return new Date((e2.time-e1[0].range*3600)*1000);
		}))
		// (ymax-ymin)-(y-ymin)
		// .range(data.forecast[i].points.map(function(e1,i,a){return [e1.point.x+180, (90- -90)-(e1.point.y- -90)];}));
		.range(d3.zip(
			e1[0].points.map(function(e2,i,a){return [e2.point.x+180, (90- -90)-(e2.point.y- -90)];}),
			e1[1].points.map(function(e2,i,a){return [e2.point.x+180, (90- -90)-(e2.point.y- -90)];})
			).map(d3.merge))
		.clamp(true);
		// return el.points.map(function(e2,i,a){return [e2.point.x, e2.point.y];})
	});
	window.scales = scales;
	window.rectScales = rectScales;

	// var rects = layer.selectAll("polygon").data(rectScales);
	var rects = layer.selectAll("polygon").data(scales);
	rects.enter()
		.append("polygon")
		// .style("fill", "blue")
		// .style("opacity", "50%");
		// .attr("x0", 0).attr("y0", 0).attr("x1", 0).attr("y1", 0)
	rects.transition()
		.duration(15000)
		.tween("att", function(dd, i) {
			return function(t) {
				var da = new Date((data.times.from + (data.times.to-data.times.from)*t)*1000);
				// var da = (data.times.from + (data.times.to-data.times.from)*t);
				// v =  dd(da);
				var v =  dd(da).concat(
					scales[Math.min(i+1,scales.length-1)
						](da));
				// if (i==7)console.log(v, polypoints(v, i));
				if (i != 7)
				this.setAttribute("points", polypoints(v, i));
				
				// console.log(v);
				// this.setAttribute("x0", (v[0])*4);
				// this.setAttribute("y0", (v[1])*4);
				// this.setAttribute("x1", (v[2])*4);
				// this.setAttribute("y1", (v[3])*4);
			};
		})

	//*
	var circles = layer.selectAll("circle").data(scales);

	circles.enter()
		.append("circle")
		// .attr("fill", "blue")
		.attr("cx", 0).attr("cy", function(d,i){return 0*i}).attr("r", function(r,i){
			// console.log(data.forecast[i].range);
			return ([0.0, 36.0, 59.0, 79.0, 98.0, 144.0, 190.0, 239.0])[i]/60*4
			
		})
		// .attr("fill", "rgba(0, 0, 255, 127)")
		// .attr("fill", "rgba(0%, 0%, 100%, 50%)")
		// .style("fill", "blue")
		// .style("opacity", "0.5")
		// .style("color", "blue").attr("color", "blue")
		// .style("background-color", "blue").attr("background-color", "blue");

	circles.transition()
		.duration(15000)
		.tween("att", function(interp,i){
			return function(t){
				var da = new Date((data.times.from + (data.times.to-data.times.from)*t)*1000);
				v =  interp(da);
				this.setAttribute("cx", (v[0])*4);
				this.setAttribute("cy", (v[1])*4);
			}
		});
	//*/

});
