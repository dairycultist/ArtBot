const fs = require("fs");
const ask = require("readline-sync");
const seedrandom = require("seedrandom"); // npm install seedrandom

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
		await doAllTheWork(Math.floor(Math.random() * 100000));
		console.log("\x1b[0m\x1b[32mDONE\x1b[0m");
	}
})
.catch((e) => {

    console.error("Invalid gradio ID!");
});

async function doAllTheWork(seed) {

	const getRandom = seedrandom(seed);

	const getRandomOf = (array) => {

		return array[Math.floor(array.length * getRandom())];
	};

	// fixed style prompt
	let pos = 
		`<lora:Immobile_USSBBW_Concept_Lora_for_Illustrious-XL:0.05> <lora:HYPv1-4:0.5> <lora:SyMix_NoobAI_epred_v1_1__fromE7_v01a01:1>
		<lora:Weather_shine_pupils_mix:1> <lora:KrekkovLycoXLV2:0.5> perfect anatomy, perfect hands, masterpiece, soft lighting, (1woman, betterwithsalt), `;

	// "composition mode": fixed (TODO variable array of) proportions, view, pose (e.g. progression, character sheet)
	pos += "white background, standing, looking at viewer, dynamic pose, front view, full body, wide hips, squishy belly, breasts, soft breasts, soft belly, chubby, chubby face, wide shoulders, exposed belly";

	// seeded character/clothing/emotion prompt
	pos += getRandomOf([ "red hair", "blue hair", "blonde hair", "pink hair", "black hair" ]) + ", ";
	pos += getRandomOf([ "long hair", "short hair", "ponytail" ]) + ", ";
	pos += getRandom() > 0.5 ? "tsurime, " : "tareme, ";
	pos += getRandomOf([ "smug", "smile", "grin", "sad", "pout", "angry" ]) + ", ";
	pos += getRandomOf([ "red", "blue", "yellow", "pink", "white", "black" ]) + " " + getRandomOf([ "tight t-shirt", "jacket", "hoodie", "loose t-shirt", "crop top", "tube top", "bra", "bikini top" ]) + ", ";
	pos += getRandomOf([ "red", "blue", "yellow", "pink", "white", "black" ]) + " " + getRandomOf([ "jean shorts", "yoga pants", "tights", "miniskirt", "bikini bottom" ]) + ", ";

	// output images (TODO output images matrix via https://www.npmjs.com/package/jimp)
	await generateImage(`output/${ seed }_1.png`, {
		pos: pos,
		neg: "ugly, blurry, nose, sweat",
		seed: seed,
		steps: 30,
		cfg: 6,
		width: 1200,
		height: 1600
	});
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