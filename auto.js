// WAI https://civitai.com/models/827184?modelVersionId=1761560
// Lora https://civitai.com/models/645787?modelVersionId=1671255
// Lora https://civitai.com/models/1454012?modelVersionId=1644028
// Lora https://civitai.com/models/488546/fluffy-fur-or-pony-and-illustrious
// Lora https://civitai.com/models/140809/weathershinepupilsmix-weathermix
// Lora https://civitai.com/models/1820232/artem-vitt-style-or-anime-thick-outlines
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

	// create prompts for composition
	const colors = [];

	for (let i = 0; i < 2; i++)
		colors.push(getRandomOf([ "red", "light blue", "dark blue", "light green", "dark green", "yellow", "orange", "pink", "white", "grey", "black", "brown" ]));

	// <lora:SyMix_NoobAI_epred_v1_1__fromE7_v01a01:0.5>
	let basePos =
		"<lora:HYPv1-4:0.8> <lora:Breast_Implants_V2.5:0.9> <lora:DetailedFur:1.0> <lora:Vitt:1> <lora:Weather_shine_pupils_mix:0.5> " +
		"(solo, cowboy shot, view from below, white background), (anthro, furry_female, fluffy fur, snout:1.1), (vittstyle, thick outlines, bold outlines:1.2), " +
		"perfect eyes, very detailed eyes, bright colors, perfect shading, soft shading, open eyes, standing straight, (gigantic breasts:1.3), (breast implants, breasts together, innerboob), " +
		"hips, thighs, narrow waist, sexy, bangs, eyeliner, smug, smirk, bedroom eyes, ";
	
	let frontPos = "(front view), directly in front, looking at viewer, cleavage, shiny breasts, breast focus, ";
	let backPos = "(view from behind, looking back at viewer:1.5), ";

	let baseNeg = "flat shading, cramped, out of frame, areolas, earrings, monochrome, skin, human, human nose, human face, squinting, lipstick, full lips, watermark, grayscale, multiple people, more than one, 3 arms, deformed ,bad quality, amateur drawing, beginner drawing, bad anatomy, deformed hands, deformed feet, bright hair, missing fingers, extra digit, fewer digits, cropped, very displeasing, bad eyes, deformed eyes, extra marks, extra arms, eye bangs, eye shadow, eye bags, logo, nsfw";

	basePos += getRandomOf([ "long tail, wolf", "long tail, cat", "long tail, fox", "long tail, scales, fluffy dragon", "bunny" ]) + " girl, ";
	basePos += `(${colors[0]} fur, ${colors[0]} tail, ${colors[0]} ears, ${colors[0]} face, ${colors[0]} breasts:1.2), `;

	basePos += getRandomOf(["tsurime", "tareme"]) + ", ";

	basePos += colors[1] + "eyes, ";

	if (getRandom() > 0.8)
		basePos += "black sclera, ";

	if (getRandom() > 0.5)
		basePos += getRandomOf(["goth", "emo", "milf", "gyaru", "priestess", "bimbo", "gamer"]) + ", ";

	basePos += colors[1] + " hair, ";
	basePos += getRandomOf([ "long hair", "short hair", "ponytail" ]) + ", ";
	
	if (getRandom() > 0.8) {
		basePos += getRandomOf(colors) + getRandomOf(["leotard, v-cut boob window, ", "wedding dress, ", "slingshot bikini, "]);
	} else {
		basePos += getRandomOf(colors) + " " + getRandomOf([ "tight t-shirt", "jacket", "hoodie", "button-up shirt, tight shirt, button gap", "loose t-shirt", "crop top", "tube top", "lace bra", "bikini top" ]) + ", ";
		basePos += colors[1] + " " + getRandomOf([ "jean shorts", "yoga pants", "tights", "pleated short skirt", "short pencil skirt", "bikini bottom", "leather pants" ]) + ", ";
	}
	
	if (getRandom() > 0.8)
		basePos += getRandomOf([ "witch hat", "chef hat", "crown" ]) + ", ";

	if (getRandom() > 0.5)
		basePos += "hands on hips, ";

	// output images
	const image1 = await generateImage({
		pos: frontPos + basePos,
		neg: baseNeg,
		seed: seed,
		steps: 30,
		cfg: 6,
		width: 1200,
		height: 1760
	});

	const image2 = await generateImage({
		pos: backPos + basePos,
		neg: "front view, " + baseNeg,
		seed: seed + 1,
		steps: 30,
		cfg: 6,
		width: 1200,
		height: 1760
	});

	// stitch together matrix
	const matrix = new Jimp({ width: 2400, height: 1760, color: 0xFFFFFFFF });

	matrix.composite(image1,    0, 0, { mode: Jimp.BLEND_SOURCE_OVER, opacitySource: 1 });
	matrix.composite(image2, 1200, 0, { mode: Jimp.BLEND_SOURCE_OVER, opacitySource: 1 });

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