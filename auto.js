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

	const promptJsonString = fs.readFileSync(ask.question("Enter path of prompt JSON (ex. ./prompt.json): "), "utf8");

	for (let i = 0; i < count; i++) {

		process.stdout.write("\x1b[2m" + (i + 1) + "... ");

		try {

			const seed = Math.floor(Math.random() * 100000);
			await generatePost(JSON.parse(promptJsonString), seed);
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

async function generatePost(prompt, seed) {

    if (!fs.existsSync("output"))
		fs.mkdirSync("output");

	const getRandom = seedrandom(seed);

	/*
	 * collapse and substitute variables
	 */

	for (const [key, choices] of Object.entries(prompt.randomizedVariables)) {

		const value = choices[Math.floor(choices.length * getRandom())];

		prompt.sharedPos = prompt.sharedPos.replaceAll(`[[${ key }]]`, value);
	}

	/*
	 * generate images
	 */
	let images = [];

	for (const i in prompt.images) {

		images.push(await generateImage({
			pos: prompt.images[i].pos + ", " + prompt.sharedPos,
			neg: prompt.images[i].neg + ", " + prompt.sharedNeg,
			seed: seed + i,
			steps: 30,
			cfg: 6,
			width: prompt.images[i].width,
			height: prompt.sharedHeight
		}));
	}

	// stitch together matrix
	stitch_images(`output/${ seed }_matrix.png`, images);
}

// assumes all images are the same height
async function stitch_images(path, images_arr) {

	let width = 0;
	let height = images_arr[0].bitmap.height;

	for (const img of images_arr)
		width += img.bitmap.width;

	const matrix = new Jimp({ width: width, height: height, color: 0xFFFFFFFF });

	let x_offset = 0;

	for (const img of images_arr) {

		matrix.composite(img, x_offset, 0, { mode: Jimp.BLEND_SOURCE_OVER, opacitySource: 1 });
		x_offset += img.bitmap.width;
	}

	matrix.write(path);
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