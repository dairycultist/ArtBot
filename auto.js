const fs = require("fs");
const ask = require("readline-sync");
const seedrandom = require("seedrandom"); 	// npm install seedrandom
const { Jimp } = require("jimp"); 			// npm install jimp

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
		await generatePost(Math.floor(Math.random() * 100000));
		console.log("\x1b[0m\x1b[32mDONE\x1b[0m");
	}
})
.catch((e) => {

	console.log("\x1b[0m");
    console.error(e + "\x1b[0m");
});

async function generatePost(seed) {

    if (!fs.existsSync("output"))
		fs.mkdirSync("output");

	const getRandom   = seedrandom(seed);
	const getRandomOf = array => array[Math.floor(array.length * getRandom())];

	// create prompts for composition
	const colors = [];

	for (let i = 0; i < 2; i++)
		colors.push(getRandomOf([ "red", "light blue", "dark blue", "light green", "dark green", "yellow", "orange", "pink", "white", "grey", "black", "brown" ]));

	let basePos = "<lora:HYPv1-4:0.5> <lora:SyMix_NoobAI_epred_v1_1__fromE7_v01a01:0.5> (1woman, white background:1.4), shine, standing straight, full body, huge breasts, soft breasts, wide hips, ";
	let frontPos = "front view, looking at viewer, soft colors, perfect shading, ";
	let backPos = "(view from behind, looking back at viewer), (soft colors, perfect shading:1.2), ";

	if (getRandom() > 0.5) {

		basePos += getRandomOf(["chubby", "obese, wide shoulders, fat rolls"]) + ", ";
		frontPos += "chubby face, squishy belly, soft belly, exposed belly, ";

	} else {

		basePos += "slim, ";
	}

	basePos += getRandomOf(["tsurime", "tareme"]) + ", ";

	basePos += getRandomOf([ "smug", "smile", "grin", "sad", "pout", "angry" ]) + ", ";

	if (getRandom() > 0.5)
		basePos += getRandomOf(["goth", "emo", "milf", "gyaru", "priestess", "bimbo", "gamer"]) + ", ";

	if (getRandom() > 0.5)
		basePos += "<lora:DetailedFur:0.5> (anthro, wolf girl, fluffy fur, long furry tail, " + getRandomOf(colors) + " fur:1.2), ";
	else
		basePos += getRandomOf([ "light skin", "dark skin", "tan skin" ]) + ", ";

	basePos += getRandomOf(colors.concat("blonde")) + " hair, ";

	basePos += getRandomOf([ "long hair", "short hair", "ponytail" ]) + ", ";
	
	basePos += getRandomOf(colors) + " " + getRandomOf([ "tight t-shirt", "jacket", "hoodie", "loose t-shirt", "crop top", "tube top", "lace bra", "bikini top" ]) + ", ";

	basePos += getRandomOf(colors) + " " + getRandomOf([ "jean shorts", "yoga pants", "tights", "pleated short skirt", "short pencilskirt", "bikini bottom" ]) + ", ";
	
	basePos += getRandomOf(colors) + " " + getRandomOf([ "sandals", "sneakers", "barefoot", "heels" ]) + ", ";

	if (getRandom() > 0.8)
		basePos += getRandomOf([ "witch hat", "chef hat", "crown" ]) + ", ";

	if (getRandom() > 0.5)
		basePos += "holding " + getRandomOf([ "teddy bear", getRandomOf(colors) + " balloon", "sword", "gun", "coffee" ]) + ", ";

	// output images
	const image1 = await generateImage({
		pos: frontPos + basePos,
		neg: "flat shading, ugly, blurry, nose, sweat, monochrome, earrings, artifacts",
		seed: seed,
		steps: 30,
		cfg: 6,
		width: 1000,
		height: 1600
	});

	const image2 = await generateImage({
		pos: backPos + basePos,
		neg: "flat shading, ugly, blurry, nose, sweat, monochrome, earrings, artifacts",
		seed: seed + 1,
		steps: 30,
		cfg: 6,
		width: 1000,
		height: 1600
	});

	// stitch together matrix
	const matrix = new Jimp({ width: 2000, height: 1600, color: 0xFFFFFFFF });

	matrix.composite(image1,    0, 0, { mode: Jimp.BLEND_SOURCE_OVER, opacitySource: 1 });
	matrix.composite(image2, 1000, 0, { mode: Jimp.BLEND_SOURCE_OVER, opacitySource: 1 });

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