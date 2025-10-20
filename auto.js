// seed => seeded character/clothing/emotion prompt + fixed style prompt + fixed array of proportions,
// view, pose (e.g. prog, char sheet, "gen mode") => { output image matrix + title based on seed }

const fs = require("fs");
const { createServer } = require("node:http");
// const sharp = require("sharp");                 // npm install sharp
const ask = require('readline-sync');

const gradioID = ask.question("Enter gradio ID: ");

// verify gradioID is valid by pinging, if not valid then quit program
fetch(`https://${ gradioID }.gradio.live/internal/ping`)
.then((res) => {

    if (res.status != 200)
        throw new Error("");

    console.log(`\x1b[2mgradio link:\x1b[0m https://${ gradioID }.gradio.live/`);

	generateImage({
		pos: "catgirl, bikini, huge breasts"
	});
})
.catch((e) => {

    console.error("Invalid gradio ID!");
});

async function generateImage(prompt) {

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

    const json = await response.json(); // json.info = metadata
    const seed = json.info.match(/"seed": ([0-9]+),/)[1];
    const filename = `output/img_${ seed }.png`;

    // save file with name based on seed
    if (!fs.existsSync("output"))
        fs.mkdirSync("output");
    fs.writeFileSync(filename, Buffer.from(json.images[0], "base64"));

    return filename;
}