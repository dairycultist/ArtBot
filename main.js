const fs = require("fs");
const ask = require("readline-sync"); // npm install readline-sync

// help

// list [loras|models]

// draw -gradio ID -pos POSITIVE PROMPT [-neg NEGATIVE PROMPT] [-size WIDTHxHEIGHT] [-count COUNT] [-seed SEED] [-bg]
// size default is 1200x1200
// count default is 1
// seed default is -1 (random)
// -bg means it runs in the background, doesn't announce when it finishes, and you can continue to queue more

// https://${ gradioID }.gradio.live/

// const seed = Math.floor(Math.random() * 999999);

(async () => {

    // draw -gradio ad79c6cb45caa4643f -pos catgirl, big breasts, smile, looking at viewer -neg ugly, blurry

    while (true) {

        const command = ask.question("\x1b[32mArtBot$ \x1b[0m");

        const gradio = getCommandParameter(command, "gradio");
        const pos = getCommandParameter(command, "pos");
        const neg = getCommandParameter(command, "neg");

        // for (let i = 0; i < count; i++)
        // console.log(`${ i }/${ count } images complete.`);

        await generateImage(
            gradio,
            {
                pos: pos,
                neg: neg,
                seed: -1,
                width: 1200,
                height: 1200
            }
        );

        // console.log(`${ count }/${ count } images complete.`);
    }

})();

function getCommandParameter(command, flag) {

    if (!command.includes(" -" + flag)) {
        return undefined;
    }

    let flagIndex = command.indexOf(" -" + flag) + flag.length + 3; // +3 to accomodate " -" and the space following the flag

    let terminalIndex = command.indexOf(" -", flagIndex);

    if (terminalIndex == -1) {
        terminalIndex = command.length;
    }

    return command.substring(flagIndex, terminalIndex);
}

async function generateImage(gradioID, prompt) {

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

    // process response
    if (!response.ok) {
        throw new Error(response.status);
    };

    const json = await response.json(); // json.info = metadata
    const seed = json.info.match(/"seed": ([0-9]+),/)[1];

    // save file with name based on seed
    fs.writeFileSync(`img_${ seed }.png`, Buffer.from(json.images[0], "base64"));
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