const fs = require("fs");
const ask = require("readline-sync");
const seedrandom = require("seedrandom"); // npm install seedrandom
const { Jimp } = require("jimp"); // npm install --save jimp

const gradioID = ask.question("Enter gradio ID: ");

// verify gradioID is valid by pinging, if not valid then quit program
fetch(`https://${ gradioID }.gradio.live/internal/ping`)
.then(async (res) => {

    if (res.status != 200)
        throw new Error("");

	let count = NaN;

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

    console.error("\x1b[0mInvalid gradio ID! " + e);
});

async function generatePost(seed) {

	const getRandom = seedrandom(seed);

	const getRandomOf = (array) => {

		return array[Math.floor(array.length * getRandom())];
	};

	const basePos = 
		`<lora:Immobile_USSBBW_Concept_Lora_for_Illustrious-XL:0.05> <lora:HYPv1-4:0.5> <lora:SyMix_NoobAI_epred_v1_1__fromE7_v01a01:1>
		<lora:Weather_shine_pupils_mix:1> <lora:KrekkovLycoXLV2:0.5> perfect anatomy, masterpiece, soft lighting, faded colors, (1woman, betterwithsalt), white background, `;

	// seeded character/clothing/emotion prompt
	const headPos =
		getRandomOf([ "red hair", "blue hair", "blonde hair", "pink hair", "black hair" ]) + ", " + getRandomOf([ "long hair", "short hair", "ponytail" ]) + ", " +
		getRandom() > 0.5 ? "tsurime, " : "tareme, " + getRandomOf([ "smug", "smile", "grin", "sad", "pout", "angry" ]) + ", ";
	
	const torsoPos =
		getRandomOf([ "red", "blue", "yellow", "pink", "white", "black" ]) + " " +
		getRandomOf([ "tight t-shirt", "jacket", "hoodie", "loose t-shirt", "crop top", "tube top", "bra", "bikini top" ]) + ", ";

	const hipsPos =
		getRandomOf([ "red", "blue", "yellow", "pink", "white", "black" ]) + " " + getRandomOf([ "jean shorts", "yoga pants", "tights", "miniskirt", "bikini bottom" ]) + ", ";

	// output images + stitched images matrix
	await generateImage(`output/${ seed }_1.png`, {
		pos: basePos + "standing, looking at viewer, dynamic pose, front view, full body, wide hips, squishy belly, breasts, soft breasts, soft belly, chubby, chubby face, wide shoulders, exposed belly, " + headPos + torsoPos + hipsPos,
		neg: "ugly, blurry, nose, sweat, monochrome",
		seed: seed,
		steps: 30,
		cfg: 6,
		width: 800,
		height: 1600
	});

	await generateImage(`output/${ seed }_2.png`, {
		pos: basePos + "looking away, expressive, dynamic pose, front view, bust shot, headshot, chubby face, " + headPos + `(${ torsoPos }:0.4)`,
		neg: "ugly, blurry, nose, sweat, monochrome, legs, body, touching edge of image, offscreen",
		seed: seed + 10,
		steps: 30,
		cfg: 6,
		width: 800,
		height: 800
	});

	await generateImage(`output/${ seed }_3.png`, {
		pos: basePos + "lower body, (view from behind), fat ass, wide hips, chubby, " + hipsPos + `(${ torsoPos }:0.4)`,
		neg: "upper body, head, face, front view, ugly, blurry, nose, sweat, monochrome, touching edge of image, offscreen",
		seed: seed + 10,
		steps: 30,
		cfg: 6,
		width: 800,
		height: 800
	});

	// compose matrix
	const matrix = new Jimp({ width: 1600, height: 1600, color: 0xFFFFFFFF });

	const image1 = await Jimp.read(`output/${ seed }_1.png`);
	const image2 = await Jimp.read(`output/${ seed }_2.png`);
	const image3 = await Jimp.read(`output/${ seed }_3.png`);

	matrix.composite(image1, 0, 0);
	matrix.composite(image2, 800, 0);
	matrix.composite(image3, 800, 800);

	matrix.write(`output/${ seed }_matrix.png`);
}

async function generateImage(path, prompt) {

    // do API request (text to image endpoint <GRADIO_LIVE_URL>/docs#/default/text2imgapi_sdapi_v1_txt2img_post)
    // we don't batch multiple since it has a chance of returning 504
    const response = await fetch(`https://${ gradioID }.gradio.live/sdapi/v1/txt2img`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            "prompt":           prompt.pos,
            "negative_prompt":  prompt.neg,
            "seed":             prompt.seed,
            // sampler_name: null,
            // scheduler: null,
            "steps":            prompt.steps,
            "cfg_scale":        prompt.cfg,
            "width":            prompt.width,
            "height":           prompt.height,
            // "sampler_index": "Euler",
            "send_images":      true,
            "save_images":      false
        })
    });

    // process response
    if (!response.ok) {
        throw new Error(response.status);
    };

	// json.info = metadata
	// json.images = array of base64 images
	const json = await response.json();

    // save file
	const directoryPath = path.substring(0, path.lastIndexOf("/"));
    if (!fs.existsSync(directoryPath))
		fs.mkdirSync(directoryPath, { recursive: true });

    fs.writeFileSync(path, Buffer.from(json.images[0], "base64"));
}