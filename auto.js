const fs = require("fs");
const ask = require("readline-sync");
const seedrandom = require("seedrandom"); // npm install seedrandom

const gradioID = ask.question("Enter gradio ID: ");

// verify gradioID is valid by pinging, if not valid then quit program
fetch(`https://${ gradioID }.gradio.live/internal/ping`)
.then(async (res) => {

    if (res.status != 200)
        throw new Error("");

	while (true) {
		await doAllTheWork(ask.question("Enter a seed string: "));
	}
})
.catch((e) => {

    console.error("Invalid gradio ID!");
});

async function doAllTheWork(seed) {

	const getRandom = seedrandom(seed);

	// seeded character/clothing/emotion prompt + fixed style prompt + fixed array of proportions, view, pose (e.g. prog, char sheet, "gen mode")
	let pos = "(rei \(sanbonzakura\):0.85), mx2j, sola \(solo0730\), ";

	pos += [ "red hair", "blue hair", "blonde hair", "pink hair", "black hair" ][Math.floor(5 * getRandom())] + ", ";
	pos += [ "long hair", "short hair", "ponytail" ][Math.floor(3 * getRandom())] + ", ";
	pos += getRandom() > 0.5 ? "tsurime, " : "tareme, ";
	pos += [ "smug", "smile", "grin", "sad", "pout", "angry" ][Math.floor(6 * getRandom())] + ", ";
	pos += [ "red", "blue", "yellow", "pink", "white", "black" ][Math.floor(6 * getRandom())] + " " + [ "tight t-shirt", "jacket", "hoodie", "loose t-shirt", "crop top", "tube top", "bra", "bikini top" ][Math.floor(8 * getRandom())] + ", ";
	pos += [ "red", "blue", "yellow", "pink", "white", "black" ][Math.floor(6 * getRandom())] + " " + [ "jean shorts", "yoga pants", "tights", "miniskirt", "bikini bottom" ][Math.floor(5 * getRandom())] + ", ";

	pos += "standing, gigantic breasts, front view, upper body";

	// output a folder with the name as the seed, containing: output images + output images matrix
	await generateImage(`output/${ seed }/img_1.png`, {
		pos: pos,
		neg: "ugly, blurry",
		steps: 30,
		cfg: 6,
		width: 1080,
		height: 1080
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