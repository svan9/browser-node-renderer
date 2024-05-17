const canvas = document.createElement("canvas");
document.body.prepend(canvas);

NodeRenderer.declareCanvas({canvas});
NodeRenderer.setStyle("width", 80, "vw");
NodeRenderer.setStyle("height", 80, "vh");
NodeRenderer.setStyle("backgroundColor", 0x1a1f29);
NodeRenderer.setStyle("gridColor", "hsla(217, 12%, 35%, 1)");
NodeRenderer.setStyle("textColor", "hsla(215, 21%, 77%, 1)");
NodeRenderer.setStyle("nodeBackground", "hsla(216, 20%, 10%, 1)");
NodeRenderer.setStyle("gridStyle", "dots");
NodeRenderer.setStyle("gridWidth", 3);
NodeRenderer.addNode("from",
	{	
		// noninput: true,
		name: "display", 
		on: function() {
			// console.log(this);
		},
		type: "display",
	},
	{
		name: "second", 
		on: function() {
			// console.log(this);
		}
	}
);
NodeRenderer.addNode("second", 
	{
		name: "first", 
		on: function() {
			return new Date().toISOString();
		}
	},
	{
		name: "second", 
		on: function() {
			// console.log(this);
		}
	}
);
NodeRenderer.setStyle("gridGap", 100);