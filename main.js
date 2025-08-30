const ask = require("readline-sync"); // npm install readline-sync

// draw -gradio ID -pos "POSITIVE PROMPT" [-neg "NEGATIVE PROMPT"] [-size WIDTHxHEIGHT] [-count COUNT] [-seed SEED]
// size default is 1200x1200
// count default is 1
// seed default is -1 (random)

// https://${ gradioID }.gradio.live/

// const seed = Math.floor(Math.random() * 999999);

// images.push((await generateImage({
//     pos: getArgValue("pos").replaceAll("BELLY", "flat stomach").replaceAll("HIPS", "narrow hips").replaceAll("THIGHS", "thin thighs").replaceAll("BOOBS", "flat chest") + ", (relaxed, smile, looking at viewer:0.5)",
//     neg: getArgValue("neg"),
//     seed: seed,
//     width: w,
//     height: h
// })));

while (true) {
    console.log(ask.question("> "));
}

// queues the generation and fetches when it's its turn. await on this!
async function generateImage(prompt) {

    // instead of polling the API immediately for every drawing request (and overwhelming it/having requests dropped), we have a queueing system
    // since the API fetch automatically drops (after the time it takes to gen ~3.5 images) if it's open for too long (even if we extend the fetch's timeout)

    // queue this prompt
    genQueue.push(prompt);

    // wait until nothing it currently being generated AND we're next in queue
    while (genCurrent || genQueue[0] != prompt) {
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // set ourselves as what's currently being generated
    genCurrent = genQueue.shift();

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
            "steps":            30,
            // cfg_scale: 7,
            "width":            prompt.width,
            "height":           prompt.height,
            // "sampler_index": "Euler",
            "send_images":      true,
            "save_images":      false
        })
    });

    // show we're done generating so the next in queue can start
    genCurrent = undefined;

    // process response
    if (!response.ok) {
        throw new Error(response.status);
    };

    const json = await response.json();

    // TODO include json.info as metadata in the image

    return new AttachmentBuilder(Buffer.from(json.images[0], "base64"), { name: "image.png" });
}

// code for getting loras
// // if a gradio ID isn't even set, there's no chance the API request will work
// if (!gradioID) {

//     await interaction.reply({ content: "Drawing is currently offline. Ping the owner to have them set it up.", flags: MessageFlags.Ephemeral });
//     return;
// }

// // fetch loras
// fetch(`https://${ gradioID }.gradio.live/sdapi/v1/loras`)
// .then(response => {
//     if (!response.ok) {
//         throw new Error(response.status + " " + response.statusText);
//     }
//     return response.json();
// })
// .then(json => {

//     let construct = "";

//     for (const lora of json) {
//         construct += `\`<lora:${ lora.alias }:1>\`\n`;
//     }

//     interaction.reply({ content: construct, flags: MessageFlags.Ephemeral });
// })
// .catch(error => {
//     interaction.reply({ content: `There was a problem with the fetch operation: ${ error }`, flags: MessageFlags.Ephemeral });
// });