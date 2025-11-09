// Nova Furry XL (Checkpoint) https://civitai.com/models/503815/nova-furry-xl
// Hyper Girls (Lora) https://civitai.com/models/645787?modelVersionId=1671255

// mmmm if we're trying to pump out 400-600 images every few hours
// some things you have to settle for

const fs = require("fs");
const ask = require("readline-sync");
const seedrandom = require("seedrandom"); 	// npm install seedrandom
const { Jimp } = require("jimp"); 			// npm install jimp
const { intToRGBA } = require("@jimp/utils");

const gradioID = ask.question("Enter gradio ID: ");

// verify gradioID is valid by pinging, if not valid then quit program
fetch(`https://${ gradioID }.gradio.live/internal/ping`)
.then(async (res) => {

    if (res.status != 200)
        throw new Error("Invalid gradio ID!");

	let count;

	do {

		count = Number(ask.question("Enter amount of posts to generate: "));

	} while (isNaN(count) || count < 1);

	count = Math.floor(count);

	for (let i = 0; i < count; i++) {

		process.stdout.write("\x1b[2m" + (i + 1) + "... ");

		try {

			const seed = Math.floor(Math.random() * 100000);
			await generatePost(seed);
			console.log("\x1b[0m\x1b[32mDONE\x1b[2m (" + seed + ")\x1b[0m");

		} catch (e) {

			console.log("\x1b[0m\x1b[31mFAIL / " + e + "\x1b[0m");
		}
	}
})
.catch((e) => {

	console.log("\x1b[0m");
    console.error(e + "\x1b[0m");
});

class Rand {

	constructor(...parts) {
		this.parts = parts;
		this.type = "Rand";
	}

	evaluate(getRandom) {

		const part = this.parts[Math.floor(this.parts.length * getRandom())];

		if (part && part.type)
			return part.evaluate(getRandom);

		return part;
	}
}

class Concat { // may introduce "WeightedConcat"

	constructor(...parts) {
		this.parts = parts;
		this.type = "Concat";
	}

	evaluate(getRandom) {

		let construct = "";

		for (const part of this.parts) {

			if (part && part.type)
				construct += part.evaluate(getRandom) + ", ";
			else if (part)
				construct += part + ", ";
		}

		return construct.substring(0, construct.length - 2);
	}
}

function getWhiteness(color) {

	color = intToRGBA(color);

	return (color.r + color.g + color.b) / 3;
}

// const basePromptTree = new Concat(

// 	"<lora:SyMix_NovaFurryXL_illusV10_v01a01:0.5> 1girl",
// 	"masterpiece, best quality, amazing quality, very aesthetic, absurdres",

// 	"adult, mature, cowboy shot, standing, white background",

// 	new Rand(
// 		`fluffy fur, anthro ${ animal }, ${ animal } ears, ${colors[0]} fur, ${colors[0]} tail, ${colors[0]} ears`,
// 		undefined
// 	),

// 	colors[1] + " hair",
// 	new Rand("long hair", "short hair", "ponytail"),
// 	new Rand("straight hair", "wavy hair", "curly hair"),

// 	new Rand("tareme", "tsurime"),
// 	new Rand(colors[0], colors[1]) + "eyes",

// 	"tight white tshirt, black leggings, midriff exposed"

// 	// new Rand(colors[1] + " v-neck shirt", colors[1] + " sports bra", colors[1] + " hoodie", colors[1] + " sweater"),
// 	// new Rand("black leather pants", colors[1] + " pencil skirt", colors[1] + " sweatpants")
// );

// const frontPromptTree = new Concat(
// 	"front view, wide hips, leaning back, slim, soft smile, looking at viewer, arms at sides"
// );

// const backPromptTree = new Concat(
// 	"<lora:HYPv1-4:0.5> front view, wide hips, leaning forward, motion lines, (wide navel), gigantic breasts, thick thighs, venusbody, chubby, bbw, round belly, grabbing belly, looking down, shocked, (belly folds, deep navel, love handles)"
// );

// /*
// 	* generate images
// 	*/
// const basePos = basePromptTree.evaluate(getRandom);
// const baseNeg = "(text, male:1.1), leaning on table, lowres, worst quality, bad quality, bad anatomy, jpeg artifacts, signature, watermark";

async function generatePost(seed) {

    if (!fs.existsSync("output"))
		fs.mkdirSync("output");

	const getRandom = seedrandom(seed);

	const animal = new Rand("wolf", "cat", "fox", "bunny", "bear", "otter").evaluate(getRandom);
	const colors = [];

	for (let i = 0; i < 2; i++)
		colors.push(new Rand("white", "grey", "black", "brown", "red", "orange", "yellow", "light green", "dark green", "light blue", "dark blue", "purple", "pink").evaluate(getRandom));

	const basePromptTree = new Concat(

		"<lora:SyMix_NovaFurryXL_illusV10_v01a01:0.5> <lora:HYPv1-4:0.5> 1girl",
		"masterpiece, best quality, amazing quality, very aesthetic, absurdres",

		"gigantic breasts, thick thighs, venusbody, adult, mature, chubby, bbw, round belly, cowboy shot, standing, white background, soft smile, arms at sides, looking at viewer",

		new Rand(
			`fluffy fur, anthro ${ animal }, ${ animal } ears, ${colors[0]} fur, ${colors[0]} tail, ${colors[0]} ears`,
			undefined
		),

		colors[1] + " hair",
		new Rand("long hair", "short hair", "ponytail"),
		new Rand("straight hair", "wavy hair", "curly hair"),

		new Rand("tareme", "tsurime"),
		new Rand(colors[0], colors[1]) + "eyes",

		"tight white tshirt, black leggings, midriff exposed"

		// new Rand(colors[1] + " v-neck shirt", colors[1] + " sports bra", colors[1] + " hoodie", colors[1] + " sweater"),
		// new Rand("black leather pants", colors[1] + " pencil skirt", colors[1] + " sweatpants")
	);

	const frontPromptTree = new Concat(
		"front view, wide hips, leaning back, (wide navel), (pregnant, big belly:0.2)"
	);

	const backPromptTree = new Concat(
		"side view, fat ass, big belly"
	);

	/*
	 * generate images
	 */
	const basePos = basePromptTree.evaluate(getRandom);
	const baseNeg = "(belly folds, deep navel, love handles), (text, male:1.1), leaning on table, lowres, worst quality, bad quality, bad anatomy, jpeg artifacts, signature, watermark";

	const imgWidth = 1200;
	const imgHeight = 1600;

	const frontImg = await generateImage({
		pos: frontPromptTree.evaluate(getRandom) + basePos,
		neg: baseNeg,
		seed: seed,
		steps: 30,
		cfg: 6,
		width: imgWidth,
		height: imgHeight
	});

	const backImg = await generateImage({
		pos: backPromptTree.evaluate(getRandom) + basePos,
		neg: baseNeg,
		seed: seed + 1,
		steps: 30,
		cfg: 6,
		width: imgWidth,
		height: imgHeight
	});

	// if right edge of backImg is whiter than left edge, flip backImg (opposite for frontImg)
	let frontLeftEdgeWhiteness  = 0;
	let frontRightEdgeWhiteness = 0;
	let backLeftEdgeWhiteness   = 0;
	let backRightEdgeWhiteness  = 0;

	for (let y=0; y<imgHeight; y++) {

		frontLeftEdgeWhiteness  += getWhiteness(frontImg.getPixelColor(0, y));
		frontRightEdgeWhiteness += getWhiteness(frontImg.getPixelColor(imgWidth-1, y));

		backLeftEdgeWhiteness   += getWhiteness(backImg.getPixelColor(0, y));
		backRightEdgeWhiteness  += getWhiteness(backImg.getPixelColor(imgWidth-1, y));
	}

	if (frontLeftEdgeWhiteness > frontRightEdgeWhiteness)
		frontImg.flip({ horizontal: true });

	if (backRightEdgeWhiteness > backLeftEdgeWhiteness)
		backImg.flip({ horizontal: true });

	// stitch together matrix
	const matrix = new Jimp({ width: imgWidth * 2, height: imgHeight, color: 0xFFFFFFFF });

	matrix.composite(frontImg,        0, 0, { mode: Jimp.BLEND_SOURCE_OVER, opacitySource: 1 });
	matrix.composite( backImg, imgWidth, 0, { mode: Jimp.BLEND_SOURCE_OVER, opacitySource: 1 });

	matrix.write(`output/${ seed }_matrix.png`);
}

async function generateImage(prompt) {

    // do txt2img API request (can't let the request hang for too long or else we get a 504!)
    const response = await fetch(`https://${ gradioID }.gradio.live/sdapi/v1/txt2img`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            "prompt":           prompt.pos,
            "negative_prompt":  prompt.neg,
            "seed":             prompt.seed,
			"steps":            prompt.steps,
            "cfg_scale":        prompt.cfg,
            "width":            prompt.width,
            "height":           prompt.height,
            "sampler_name":		"DPM++ 2M SDE",
			// "sampler_index": "Euler",
            "scheduler":		"Automatic",
            "send_images":      true,
            "save_images":      false
        })
    });

    if (!response.ok)
        throw new Error(response.status);

	const json = await response.json(); // json.info = metadata

    return await Jimp.read(Buffer.from(json.images[0], "base64"));
}