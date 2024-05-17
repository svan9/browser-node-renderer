const libName = "NodeRenderer";

function getCookie(name) {
  let matches = document.cookie.match(new RegExp(
    "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
  ));
  return matches ? decodeURIComponent(matches[1]) : undefined;
}

function deleteCookie(name) {
  setCookie(name, "", {
    'max-age': -1
  })
}

function setCookie(name, value, options = {}) {

  options = {
    path: '/',
    // при необходимости добавьте другие значения по умолчанию
    ...options
  };

  if (options.expires instanceof Date) {
    options.expires = options.expires.toUTCString();
  }

  let updatedCookie = encodeURIComponent(name) + "=" + encodeURIComponent(value);

  for (let optionKey in options) {
    updatedCookie += "; " + optionKey;
    let optionValue = options[optionKey];
    if (optionValue !== true) {
      updatedCookie += "=" + optionValue;
    }
  }

  document.cookie = updatedCookie;
}

(function(factory) {
	let node_renderer = factory();
	window[libName] 		= node_renderer;
	self[libName] 			= node_renderer;
	globalThis[libName] = node_renderer;

})(function() {
	let declareCanvas, 
	/**
	 * @type {CanvasRenderingContext2D}
	 */
	ctx,
	/**
	 * @type {HTMLCanvasElement}
	 */
	root,

	declareEvents,
	render,
	drawLine,
	showCollision,
	drawGrid,
	putsNodes,
	gridWidth,
	gridGap,
	gridStyle = "lines",
	nodeBackground,
	textColor,
	addNode,
	clearData,
	updateNodes,
	
	width,
	height,
	backgroundColor,
	gridColor,
	uinfo,
	hookStyles,
	setStyle, 
	wheelSpeedUp,
	e_wheelSpeedUp,
	isMouseDown,
	mouseHoldDelta,
	mouseHoldEvent,
	/**
	 * @type {(x: any, y: any)=> node_ | undefined}
	 */
	getnodein, 
	inside_circle,
	/**
	 * @type {(x: any, y: any) => {attr: node_attr; kind: string; parent: node_; } | undefined}
	 */
	getnodeattr,
	temp_line,
		/**
	 * @type {node_}
	 */
	temp_node,
	/**
	 * @type {node_[]}
	 */
	nodes_block = [],
	/**
	 * @type {{from_attr: node_attr, to_attr: node_attr, from__parent_:node_, to_parent_: node_}[]}
	 */
	connection = [],
	temp_mouse = {x: 0, y: 0}
	;
	uinfo = {
		scale: 100,
		x: 0,
		y: 0,
		minScale: 40,
		maxScale: 150,
	};


	let id_counter = (function() {
		let counter_ = 0;
		return function() {
			return counter_++;
		}
	})()

	// let circle;

	const radius_attr = 7;
	const radius_node = 20;
	const push_count  = 10;

	window.addEventListener("load", () => {
		let restored = localStorage.getItem("nr_data");
		if (restored != void 0) {
			uinfo = JSON.parse(window.atob(restored))
		}
		restored = localStorage.getItem("nr_data_nodes_block");
		if (restored != void 0) {
			let re = JSON.parse(window.atob(restored))
			nodes_block = nodes_block.map((el_, i)=>{
				let ew = re[i];
				ew.attrs = el_.attrs.map((attr, ind)=>{
					let a = re[i].attrs[ind];
					a.on = attr.on;
					return a;
				});
				return ew;
			});
		}
		restored = localStorage.getItem("nr_data_nodes_conns");
		if (restored != void 0) {
			let connection = JSON.parse(window.atob(restored))
			connection.forEach(con=>{
				let from = nodes_block.find(e=>e.id==con.from__parent_.id);
				let to = nodes_block.find(e=>e.id==con.to_parent_.id);
				from = from.attrs.find(e=>e.id==con.from_attr.id);
				to = to.attrs.find(e=>e.id==con.to_attr.id);
				
				from.on = con.from_attr.on;
				to.on = con.to_attr.on;

				con.from_attr = from;
				con.to_attr = to;

			});
		}
	});

	declareCanvas =
	/**
	 * @param {{canvas: HTMLCanvasElement}} param0 
	 */
	function({canvas}) {
		root = canvas;
		ctx = canvas.getContext("2d");

		window.document.body.style.margin = "0x";
		window.document.body.style.padding = "0x";
		window.document.body.style.top = "0x";
		window.document.body.style.left = "0x";

		hookStyles();
		declareEvents();
		setInterval(render, 10);
		setInterval(() => {
			localStorage.setItem("nr_data", window.btoa(JSON.stringify(uinfo)));
			localStorage.setItem("nr_data_nodes_block", window.btoa(JSON.stringify(nodes_block)));
			localStorage.setItem("nr_data_nodes_conns", window.btoa(JSON.stringify(connection)));
		}, 100);
	}
	clearData = 
	function() {
		localStorage.removeItem("nr_data");
		localStorage.removeItem("nr_data_nodes_block");
		localStorage.removeItem("nr_data_nodes_conns");
		window.location.reload();
	}

	addNode = 
	function(title, ...attrs) {
		attrs.forEach(attr=>{
			attr.id = id_counter();
			attr.noninput = attr.noninput ?? false; 
		})
		nodes_block.push({id: id_counter(), title, x: uinfo.x, y: uinfo.y, attrs});
	}

	function pointInRect(point, rect) {
		return (
			rect.x <= point.x && point.x <= rect.x + rect.width &&
			rect.y <= point.y && point.y <= rect.y + rect.height
		);
	}
	function rectanglesIntersect( 
    minAx, minAy, maxAx, maxAy,
    minBx, minBy, maxBx, maxBy ) {
    let aLeftOfB = maxAx < minBx;
    let aRightOfB = minAx > maxBx;
    let aAboveB = minAy > maxBy;
    let aBelowB = maxAy < minBy;

    return !( aLeftOfB || aRightOfB || aAboveB || aBelowB );
}

	function isCollision(rect1, rect2) {
		return rectanglesIntersect(
			rect1.x, rect1.y, rect1.x2, rect1.y2,
			rect2.x, rect2.y, rect2.x2, rect2.y2
		)
	}

	function findCollision(self_el) {
		let rect1 = {
			x: self_el.x,
			y: self_el.y,
			x2: self_el.screen_w,
			y2: self_el.screen_h,
		};

		let colider = collide(rect1);
		for (let el of nodes_block) {
			if (el.id == self_el.id) continue;
			let rect2 = {
				x: el.x,
				y: el.y,
				x2: el.screen_w,
				y2: el.screen_h,
			};
			
			if (colider(rect2)) {
				return el;
			}
		}

		return void 0;
	}

	function collide(rect1) {
		var nx1, nx2, ny1, ny2;
		nx1 = rect1.x;
		nx2 = rect1.x2;
		ny1 = rect1.y;
		ny2 = rect1.y2;
		return function(rect2) {
			var dx, dy;
		
			if (isCollision(rect1, rect2)) {
				dx = Math.min(rect1.x2 - rect2.x, rect2.x2 - rect1.x) / 2;
				rect1.x -= dx;
				rect2.x += dx;
				dy = Math.min(rect1.y2 - rect2.y, rect2.y2 - rect1.y) / 2;
				rect1.y -= dy;
				rect2.y += dy;

				return true;
			}

			return false;
		};
	};

	declareEvents = 
	function() {
		root.addEventListener("wheel", function(ev) {
			ev.preventDefault();
			return;
			clearTimeout(e_wheelSpeedUp);
			if (ev.ctrlKey) {
				let delta = ev.deltaY/100;
				let sim = uinfo.scale + (-delta)*10;

				if (!(sim > uinfo.maxScale || sim < uinfo.minScale)) {
					uinfo.scale = sim;
				}

				setCookie("nr_data", window.btoa(JSON.stringify(uinfo)));
				return;
			}
			let delta = ev.deltaY/100;
			uinfo.y += wheelSpeedUp 
				? (-delta*20)
				: (-delta*40);
			wheelSpeedUp = true;
			e_wheelSpeedUp = 
			setTimeout(() => {
				wheelSpeedUp = false;
			}, 100);

			setCookie("nr_data", window.btoa(JSON.stringify(uinfo)));
		});

		root.addEventListener("mousedown", function(ev) {
			isMouseDown = true;
			let attr = getnodeattr(ev.offsetX, ev.offsetY);
			if (attr != void 0) {
				// if (attr.kind != "input") {
					temp_line = {
						x: attr.kind == "input" ? attr.attr.screen_x[0] : attr.attr.screen_x[1],
						y: attr.kind == "input" ? attr.attr.screen_y[0] : attr.attr.screen_y[1],
						attr: attr.attr,
						kind: attr.kind,
						parent: attr.parent
					}
					let index = connection.findIndex(con=>
						con.to_attr.id == temp_line.attr.id
					)
					if (index != -1) {
						connection.splice(index, 1);
					}
					temp_node = attr.parent;
				// }
			} else {
				temp_node = getnodein(ev.x, ev.y);
			}
		});
		// MOUSE HOLD 
		root.addEventListener("mousemove", function(ev) {
			temp_mouse = {x: ev.offsetX*2, y: ev.offsetY*2};
			if (!isMouseDown) return;
			root.style.cursor = "grabbing";
			if (temp_line != void 0) {
				temp_line.ex = ev.offsetX*2;
				temp_line.ey = ev.offsetY*2;
				return;
			}

			if (mouseHoldDelta == null) {
				mouseHoldDelta = {};
				mouseHoldDelta.y = ev.clientY;
				mouseHoldDelta.x = ev.clientX;
				return;
			}
			let delta = {
				x: mouseHoldDelta.x - ev.clientX,
				y: mouseHoldDelta.y - ev.clientY
			};
			mouseHoldDelta.y = ev.clientY;
			mouseHoldDelta.x = ev.clientX;

			if (temp_node != void 0) {
				root.style.cursor = "move";
				let el = findCollision(temp_node);
				// if (el != void 0) {
				// 	// temp_node.y -= (-delta.y*2);
				// 	// temp_node.x -= (-delta.x*2);
				// } else {
					mouseHoldEvent(delta, true);
				// }
				return;
			}
			mouseHoldEvent(delta);
		});

		let leave_up_mouse = function(ev) {
			temp_mouse = void 0;
			isMouseDown = false;
			root.style.cursor = "auto";
			mouseHoldDelta = null;
			if (temp_line != void 0) {
				var attr = getnodeattr(ev.offsetX, ev.offsetY);
				if (attr != void 0 && (
					(temp_line.kind == "output" && attr.kind == "input") ||
					(temp_line.kind == "input" && attr.kind == "output")
				)) {

					let index = connection.findIndex(con=>
						con.to_attr.id == attr.attr.id
					)
					if (index != -1) {
						connection.splice(index, 1);
					}

					if ((temp_line.kind == "output" && attr.kind == "input")) {	
						connection.push({
							from_attr: temp_line.attr,
							to_attr: attr.attr,
							from__parent_: temp_line.parent,
							to_parent_: attr.parent
						});
					} else {
						connection.push({
							from_attr: attr.attr,
							to_attr: temp_line.attr,
							from__parent_: attr.parent,
							to_parent_: temp_line.parent
						});
					}
				} else if (temp_line.kind == "input") {
					let index = connection.findIndex(con=>
						con.to_attr.id == temp_line.attr.id
					)
					if (index != -1) {
						connection.splice(index, 1);
					}
				}
			}
			temp_node = void 0;
			temp_line = void 0;

		}

		
		root.addEventListener("mouseup", leave_up_mouse);
		root.addEventListener("mouseleave", leave_up_mouse);

		getnodein = function(x, y) {
			return nodes_block.find(el=>{
				if (
					x*2 >= (el.screen_x-(radius_node+radius_attr)) &&
					y*2 >= (el.screen_y-(radius_node+radius_attr)) &&
					x*2 <= (el.screen_w+(radius_node+radius_attr)) &&
					y*2 <= (el.screen_h+(radius_node+radius_attr))
				) {
					return true;
				}
				return false;
			});
		}

		inside_circle = function (x0, y0, x1, y1, r) {
			return Math.sqrt((x1-x0)*(x1-x0)+(y1-y0)*(y1-y0)) < r
		}

		getnodeattr = function(x, y) {
			let node_ = getnodein(x, y);
			if (node_?.attrs == void 0) {
				return void 0;
			}
			var attr;
			var kind;
			for (let attr_ of node_.attrs) {
				let is_input = inside_circle(attr_.screen_x[0], attr_.screen_y[0], x*2, y*2, radius_attr+5);
				let is_output = inside_circle(attr_.screen_x[1], attr_.screen_y[1], x*2, y*2, radius_attr+5);
				if (is_input) {
					kind = "input";
					attr = attr_;
				}
				else if (is_output) {
					kind = "output";
					attr = attr_;
				}
			}

			if (attr == void 0 || kind == void 0) {
				return void 0;
			}

			return {
				attr, kind, parent: node_
			}
		}

		window.addEventListener("resize", () => {
			hookStyles();
			render();
		})
	};
	
	mouseHoldEvent = 
	/**
	 * 
	 * @param {{x: number, y: number}} delta 
	 */
	function(delta, is_node=false) {
		if (is_node) {
			temp_node.y += (-delta.y*2);
			temp_node.x += (-delta.x*2);
			return;
		}

		// grab empty pos:
		uinfo.y += (-delta.y*2);
		uinfo.x += (-delta.x*2);
	}

	hookStyles =
	function() {
		root.style.width  = width ??  "500px";
		root.style.height = height ?? "500px";
		// root.style.backgroundColor = backgroundColor ?? "white";

		let bfr = root.getBoundingClientRect();

		root.width  = parseInt(bfr.width)*2;
		root.height = parseInt(bfr.height)*2;
	} 

	setStyle =
	function(event, ...args) {
		let touched = true;
		switch(event) {
			case "width": {
				if (typeof args[0] == "number") {
					width = args[0]+(args[1] == void 0? "%": args[1]);
				} else {
					width = args[0];
				}
			} break;

			case "height": {
				if (typeof args[0] == "number") {
					height = args[0]+(args[1] == void 0? "%": args[1]);
				} else {
					height = args[0];
				}
			} break;
			
			case "backgroundColor": {
				let color = args[0];
				if (typeof args[0] == "number") {
					color = "#"+color.toString(16);
				}
				backgroundColor = color;
			} break;
			
			case "gridColor": {
				let color = args[0];
				if (typeof args[0] == "number") {
					color = "#"+color.toString(16);
				}
				gridColor = color;
			} break;
			
			case "gridWidth": {
				gridWidth = args[0];
			} break;

			case "gridGap": {
				gridGap = args[0];
			} break;

			case "gridStyle": {
				gridStyle = args[0];
			} break;

			case "textColor": {
				textColor = args[0];
			} break;

			case "nodeBackground": {
				nodeBackground = args[0];
			} break;

			default: {
				touched = false;
			} break;
		}
		if (touched) {
			hookStyles();
		}
	}

	render = 
	function() {
		ctx.fillStyle = backgroundColor;
		ctx.fillRect(0, 0, root.width, root.height);
		drawGrid();
		putsNodes();
		drawLine();
		// findCollision
		showCollision();
		updateNodes();
		// ctx.beginPath();
		// ctx.arc(...circle);
		// ctx.fill();
	}
	updateNodes =
	function() {
		connection.forEach(con=>{
			con.from_attr.data = con.from_attr.on();
			let event = {
				data: con.from_attr.data
			};
			// if (event.data == void 0) {
			// }
			con.to_attr.data = con.to_attr.on(event);

			if (con.to_attr.type=="display") {
				con.to_attr.name = con.from_attr.data;
			}
		});
	}

	showCollision =
	function() {
		// if (temp_node == void 0) return;
		// let el = findCollision(temp_node, temp_node.screen_x, temp_node.screen_y, temp_node.screen_w, temp_node.screen_h);
		// if (el == void 0) return;
		// console.log(el);

		// el.x -= push_count;
		// el.y -= push_count;
	}

	drawLine =
	function() {
		connection.forEach(con=>{
			ctx.lineWidth = 5;
			ctx.strokeStyle = textColor??gridColor;

			let dx = con.from_attr.screen_x[1];
			let dy = con.from_attr.screen_y[1];
			
			ctx.beginPath();
			ctx.moveTo(dx, dy);

			dx = con.to_attr.screen_x[0];
			dy = con.to_attr.screen_y[0];

			ctx.lineTo(dx, dy);
			ctx.stroke();
		});

		if (temp_line == void 0 || temp_line.ex == void 0) return;

		ctx.lineWidth = 5;
		ctx.strokeStyle = textColor??gridColor;

		ctx.beginPath();
		ctx.moveTo(temp_line.x, temp_line.y);
		ctx.lineTo(temp_line.ex, temp_line.ey);
		ctx.stroke();

	}

	drawGrid = 
	function() {
		let cubesize = Math.floor((gridGap??40)*(uinfo.scale/100)),
			boundx = root.width/cubesize,
			boundy = root.height/cubesize;

		ctx.strokeStyle = gridColor;
		ctx.fillStyle  = gridColor;
		ctx.lineWidth = gridWidth??2;

		if (gridStyle == "lines") {
			for (let x = 0; x < boundx; x++) {
				let dx = ((x*cubesize+(uinfo.x)) % (root.width+(cubesize/2)));
				if (dx < 0) {
					dx = root.width-Math.abs(dx)+(cubesize/2);
				}
				ctx.beginPath();
				ctx.moveTo(dx, 0);
				ctx.lineTo(dx, root.height);
				ctx.stroke();
			}
			
			for (let y = 0; y < boundy; y++) {
				let dy = ((y*cubesize+(uinfo.y)) % (root.height+(cubesize/2)));
				if (dy < 0) {
					dy = root.height-Math.abs(dy)+(cubesize/2);
				}
				ctx.beginPath();
				ctx.moveTo(0, dy);
				ctx.lineTo(root.width, dy);
				ctx.stroke();
			}
		} 
		else if (gridStyle == "dots") {
			let m = Math.ceil((gridWidth??5)/2);
			for (let x = 0; x < boundx; x++) {
				let dx = (x*cubesize+(uinfo.x)) % (root.width+(cubesize/2));
				if (dx < 0) {
					dx = root.width-Math.abs(dx)+(cubesize/2);
				}
				for (let y = 0; y < boundy; y++) {
					let dy = ((y*cubesize+(uinfo.y)) % (root.height+(cubesize/2)));
					if (dy < 0) {
						dy = root.height-Math.abs(dy)+(cubesize/2);
					}
					ctx.beginPath();
					ctx.arc(dx, dy, m, 0, 2 * Math.PI, false);
					ctx.fill();
				}
			}
		} 
	}

	putsNodes = 
	function() {
		let text_margin = 20;
		let attr_height = 60;
		let scare = 10;
		for (let elit in nodes_block) {
			let el = nodes_block[elit];
			let w = 400; 
			let h = 500;
			
			let dy = (el.y+(uinfo.y));
			let dx = (el.x+(uinfo.x));

			nodes_block[elit].screen_x = dx;
			nodes_block[elit].screen_y = dy;
			nodes_block[elit].screen_w = w+dx;
			nodes_block[elit].screen_h = h+dy;
			
			ctx.fillStyle = nodeBackground??backgroundColor;
			ctx.beginPath();
			ctx.roundRect(dx, dy, w, h, radius_node);
			ctx.fill();
			
			// ctx.fillStyle = nodeBackground??backgroundColor;
			ctx.fillStyle = gridColor;
			ctx.strokeStyle = gridColor;
			ctx.beginPath();
			ctx.roundRect(dx, dy, w, h, radius_node);
			ctx.stroke();
			
			ctx.fillStyle = textColor??gridColor;
			ctx.strokeStyle = textColor??gridColor;
			ctx.font = "28pt Arial";
			let metrics = ctx.measureText(el.title);
			let title_dy = dy+metrics.actualBoundingBoxAscent+text_margin;

			ctx.fillText(el.title, dx + (w-metrics.width)/2, title_dy);

			// ctx.beginPath()
			// ctx.moveTo(scare+dx, dy+attr_height);
			// ctx.lineTo(dx+w-(scare*2), dy+attr_height);
			// ctx.stroke();

			for (let i in el.attrs) {
				let pt = 25;
				ctx.font = `${pt}pt Arial`;
				ctx.fillStyle = textColor??gridColor;
				ctx.strokeStyle = textColor??gridColor;

				dy = title_dy+text_margin+(attr_height*i);
				let attr = el.attrs[i];
				let metrics = ctx.measureText(attr.name);

				while (metrics.width > (w-text_margin*2)) {
					pt-=5;
					if (pt <= 0) {
						pt = 5;
						break;
					}
					ctx.font = `${pt}pt Arial`;
					ctx.fillStyle = textColor??gridColor;
					ctx.strokeStyle = textColor??gridColor;
	
					dy = title_dy+text_margin+(attr_height*i);
					metrics = ctx.measureText(attr.name);
				}
				
				ctx.fillText(attr.name, dx+text_margin*2, dy+metrics.actualBoundingBoxAscent+text_margin, (w-text_margin*2));
				// // ctx.strokeRect(dx, dy, w, attr_height);
				// ctx.beginPath()
				// ctx.moveTo(scare+dx, dy+attr_height);
				// ctx.lineTo(dx+w-(scare*2), dy+attr_height);
				// ctx.stroke();

				ctx.fillStyle = gridColor;

				if (!attr.noninput) {
					// left
					ctx.beginPath();
					ctx.arc(dx, dy+(attr_height/2), radius_attr, 0, 2 * Math.PI, false);
					ctx.fill();
				} 

				// right
				ctx.beginPath();
				ctx.arc(dx+w, dy+(attr_height/2), radius_attr, 0, 2 * Math.PI, false);
				ctx.fill();

				nodes_block[elit].attrs[i].screen_x = [dx, dx+w];
				nodes_block[elit].attrs[i].screen_y = [dy+(attr_height/2), dy+(attr_height/2)];
			}

		}
	}




	return {
		declareCanvas, setStyle, addNode, clearData
	}
});
