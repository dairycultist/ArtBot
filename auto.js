// WAI https://civitai.com/models/827184?modelVersionId=1761560
// Lora https://civitai.com/models/645787?modelVersionId=1671255
// Lora https://civitai.com/models/488546/fluffy-fur-or-pony-and-illustrious
// Lora https://civitai.com/models/1454012?modelVersionId=1644028
// Lora https://civitai.com/models/1429234/breast-implants-round-breasts-illustrious

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

		try {

			await generatePost(Math.floor(Math.random() * 100000));
			console.log("\x1b[0m\x1b[32mDONE\x1b[0m");

		} catch (e) {

			console.log("\x1b[0m\x1b[31mFAIL\x1b[0m");
		}
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

	/*
	 * create style prompt
	 */
	const colors = [];

	for (let i = 0; i < 2; i++)
		colors.push(getRandomOf([ "red", "light blue", "dark blue", "light green", "dark green", "yellow", "orange", "pink", "white", "grey", "black", "brown" ]));

	let basePos =
		"<lora:HYPv1-4:0.5> <lora:Breast_Implants_V2.5:1> <lora:DetailedFur:1> <lora:LaBiuda_IL_Style:0.5> " +
		"(solo, cowboy shot), (white background:1.5), (anthro, furry_female, fluffy fur:1.4), dynamic pose, standing, " +
		"lit from behind, light from behind, bright colors, perfect shading, (soft shading), hips, thick thighs, narrow waist, sexy, tall, adult, hands on hips, " +
		"L4B1ud4, squinting, (tsurime, eyeliner, black eyeshadow, smug, wide smirk, bedroom eyes, calm:1.2), perfect eyes, very detailed eyes, bangs, large eyes, short snout, ";
	
	let frontPos = "(front view), leaning back, directly in front, looking at viewer, gigantic breasts, (breast implants, round breasts, breasts together:1.2), shiny breasts, breast focus, ";
	let backPos = "(view from behind, looking away from viewer, looking straight ahead:1.5), sideboob, (gigantic breasts:1.3), ";

	let baseNeg = "cel shading, flat shading, skindentation, bursting breasts, side view, three-quarters view, closeup, close up, cramped, out of frame, areolas, sweaty, earrings, monochrome, skin, human, human nose, human face, watermark, grayscale, multiple people, more than one, 3 arms, deformed, bad quality, amateur drawing, beginner drawing, bad anatomy, deformed hands, deformed feet, bright hair, missing fingers, extra digit, fewer digits, cropped, very displeasing, bad eyes, deformed eyes, extra marks, extra arms, eye bangs, eye shadow, eye bags, logo, nsfw";

	/*
	 * create content prompt
	 */
	const animal = getRandomOf([ "wolf", "cat", "fox", "bunny", "bear", "otter" ]);

	basePos += `(anthro ${ animal }, ${ animal } ears:1.2), `;
	basePos += `${colors[0]} fur, ${colors[0]} tail, ${colors[0]} ears, (${colors[0]} skin, ${colors[0]} breasts:1.5), `;

	frontPos += colors[1] + "eyes, ";
	basePos += colors[1] + " hair, ";
	basePos += getRandomOf([ "long hair", "short hair", "ponytail" ]) + ", ";

	basePos += "white button-up shirt, lanyard, black leather pants, ";
	frontPos += "(single button gap:1.2), ";

	/*
	 * generate images
	 */
	const image1 = await generateImage({
		pos: frontPos + basePos,
		neg: baseNeg,
		seed: seed,
		steps: 30,
		cfg: 6,
		width: 1360,
		height: 1760
	});

	const image2 = await generateImage({
		pos: backPos + basePos,
		neg: "(front view, looking back at viewer, looking at viewer, turning head), " + baseNeg,
		seed: seed + 1,
		steps: 30,
		cfg: 6,
		width: 1360,
		height: 1760
	});

	// stitch together matrix
	const matrix = new Jimp({ width: 2720, height: 1760, color: 0xFFFFFFFF });

	matrix.composite(image1,    0, 0, { mode: Jimp.BLEND_SOURCE_OVER, opacitySource: 1 });
	matrix.composite(image2, 1360, 0, { mode: Jimp.BLEND_SOURCE_OVER, opacitySource: 1 });

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