interface NodeRendererSetStyle {
	width: [width: string|number, unit: string?],
	height: [height: string|number, unit: string?],
	backgroundColor: [color: string|number],
	gridColor: [color: string|number|null],
	gridWidth: [width: string|null],
	gridGap: [gap: string|null],
	nodeBackground: [color: string|number|null],
	textColor: [color: string|number|null],
	gridStyle: [style: "line"|"dots"],
	
}

interface node_attr_event {
	from: number,
	input: any
}

type node_attr = {
	name: string,
	data: any,
	on: (this: node_attr, ev: node_attr_event)=>any,
	screen_x: [number, number],
	screen_y: number,
	type: "simple"|"display",
};
type node_ = {
	title: string,
	attrs: Array<node_attr>,
	x: number,
	y: number,
	screen_x: number,
	screen_y: number,
	screen_w: number,
	screen_h: number
};

function declareCanvas(o: {canvas: HTMLCanvasElement}): void;
function setStyle<Event extends keyof NodeRendererSetStyle>(event: Event, ...args: NodeRendererSetStyle[Event]): void;
function addNode(title: string, ...attrs: Array<node_attr>): any;

var NodeRenderer = {
	declareCanvas,
	setStyle,
	addNode
};

globalThis.NoderRenderer = NodeRenderer;