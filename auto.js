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

class Rand {

	constructor(...parts) {
		this.parts = parts;
		this.type = "Rand";
	}

	evaluate(getRandom) {

		const part = this.parts[Math.floor(this.parts.length * getRandom())];

		if (part.type)
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

			if (part.type)
				construct += part.evaluate(getRandom) + ", ";
			else
				construct += part + ", ";
		}

		return construct.substring(0, construct.length - 2);
	}
}

async function generatePost(seed) {

    if (!fs.existsSync("output"))
		fs.mkdirSync("output");

	const getRandom = seedrandom(seed);

	const animal = new Rand("wolf", "cat", "fox", "bunny", "bear", "otter").evaluate(getRandom);
	const colors = [];

	for (let i = 0; i < 2; i++)
		colors.push(new Rand("white", "grey", "black", "brown", "red", "orange", "yellow", "light green", "dark green", "light blue", "dark blue", "purple", "pink").evaluate(getRandom));

	const basePromptTree = new Concat(

		// style prompt
		"<lora:HYPv1-4:0.5> <lora:DetailedFur:1> <lora:LaBiuda_IL_Style:0.5>",
		"(small head:1.3), (solo, cowboy shot), (white background), (anthro, furry_female, fluffy fur:1.4), (standing straight)",
		"bright colors, perfect shading, (soft shading, rimlight:1.4), hips, thick thighs, narrow waist, sexy, (tall, adult, big woman:1.2), (enormous breasts:1.2)",
		"L4B1ud4, squinting, (tsurime, eyeliner, black eyeshadow, smug, wide smirk, bedroom eyes, calm:1.2), perfect eyes, very detailed eyes, bangs, large eyes, short snout",

		// content prompt
		`(anthro ${ animal }, ${ animal } ears:1.2)`,
		`${colors[0]} fur, ${colors[0]} tail, ${colors[0]} ears, (${colors[0]} skin, ${colors[0]} breasts:1.5)`,
		colors[1] + " hair",
		new Rand("long hair", "short hair", "ponytail"),
		"(red v-neck shirt, black leather pants)"
	);

	const frontPromptTree = new Concat(
		"(front view:1.5), looking at viewer, (breasts together:1.4), cleavage, shiny breasts, breast focus, hands behind back",
		colors[1] + "eyes"
	);

	const backPromptTree = new Concat(
		"(view from behind, looking away:1.5), sideboob, hands at sides"
	);

	/*
	 * generate images
	 */
	let basePos = basePromptTree.evaluate(getRandom);
	let baseNeg = "cel shading, flat shading, skindentation, bursting breasts, side view, three-quarters view, closeup, close up, cramped, out of frame, areolas, sweaty, earrings, monochrome, skin, human, human nose, human face, watermark, grayscale, multiple people, more than one, 3 arms, deformed, bad quality, amateur drawing, beginner drawing, bad anatomy, deformed hands, deformed feet, bright hair, missing fingers, extra digit, fewer digits, cropped, very displeasing, bad eyes, deformed eyes, extra marks, extra arms, eye bangs, eye shadow, eye bags, logo, nsfw";

	const frontImg = await generateImage({
		pos: frontPromptTree.evaluate(getRandom) + basePos,
		neg: baseNeg,
		seed: seed,
		steps: 30,
		cfg: 6,
		width: 1200,
		height: 1600
	});

	const backImg = await generateImage({
		pos: backPromptTree.evaluate(getRandom) + basePos,
		neg: baseNeg,
		seed: seed + 1,
		steps: 30,
		cfg: 6,
		width: 1200,
		height: 1600
	});

	// stitch together matrix
	const matrix = new Jimp({ width: 2400, height: 1600, color: 0xFFFFFFFF });

	matrix.composite(frontImg,    0, 0, { mode: Jimp.BLEND_SOURCE_OVER, opacitySource: 1 });
	matrix.composite( backImg, 1200, 0, { mode: Jimp.BLEND_SOURCE_OVER, opacitySource: 1 });

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