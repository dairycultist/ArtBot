const fs = require("fs");
const ask = require("readline-sync"); // npm install readline-sync

(async () => {

    while (true) {

        let command = ask.question("\x1b[32mArtBot$ \x1b[0m").trim();

        const commandName = command.substring(0, command.includes(" ") ? command.indexOf(" ") : command.length);

        try {

            if (commandName == "help") {

                // log helpful message on commands
                console.log(`
    draw
        -gradio ID              \x1b[2mthe gradio id of your gradio link (i.e. https://<THIS_PART>.gradio.live/)\x1b[0m
        -pos POSITIVE_PROMPT
        [-neg NEGATIVE_PROMPT]
        [-size WIDTHxHEIGHT]    \x1b[2mdefault is 1200x1200. minimum size is 640x640\x1b[0m
        [-count COUNT]          \x1b[2mdefault is 1\x1b[0m
        [-seed SEED]            \x1b[2mdefault is -1 (random)\x1b[0m
        [-steps STEPS]          \x1b[2m(not implemented yet) default is 50\x1b[0m
        [-in FILE]              \x1b[2mif specified, reads additional arguments from a file and behaves as if appending the content of the file to the end of the command (i.e. the file follows the same argument structure)\x1b[0m
        [-out DIRECTORY]        \x1b[2m(not implemented yet) output folder to put generated images into. default is ./ (current directory)\x1b[0m
        [-bg]                   \x1b[2m(not implemented yet) run generator in the background, doesn't announce when it finishes, and you can continue to queue more\x1b[0m
                `);

                // loras (lists loras)
                // model [list|use MODEL]
                // stash DIRECTORY | uploads all images in the DIRECTORY to stash as separate posts with tags automatically added based on the prompt (what about description? title?)
                // analyze IMAGE_PATH | reconstruct a draw command based on the image's metadata

            } else if (commandName == "draw") {

                // check for -in (done first because it may add new arguments)
                const inFile = getCommandArgument(command, "in");

                if (inFile && fs.existsSync(inFile)) {

                    command += " " + fs.readFileSync(inFile, "utf8");
                }

                // validate
                if (!command.includes("-gradio") || !command.includes("-pos")) {

                    throw new Error("Missing -gradio or -pos arguments.");
                }

                // get arguments
                const gradio = getCommandArgument(command, "gradio");
                const pos = getCommandArgument(command, "pos");
                const neg = getCommandArgument(command, "neg");
                
                const [ width, height ] = (() => {
                    let size = getCommandArgument(command, "size");

                    if (!size) {
                        return [ 1200, 1200 ];
                    }

                    size = size.split("x");

                    if (size.length != 2 || Number(size[0]) == NaN || Number(size[1]) == NaN) {
                        return [ 1200, 1200 ];
                    }

                    return [ Math.max(640, Number(size[0])),  Math.max(640, Number(size[1])) ];
                })();

                const count = (() => {
                    let count = getCommandArgument(command, "count");
                    return count && Number(count) != NaN && Number(count) >= 1 ? Math.floor(Number(count)) : 1;
                })();

                const seed = (() => {
                    let seed = getCommandArgument(command, "seed");
                    return seed ? seed : -1;
                })();

                console.log(`
\x1b[2mgradio link:\x1b[0m https://${ gradio }.gradio.live/
\x1b[2mpositive:   \x1b[0m ${ pos }
\x1b[2mnegative:   \x1b[0m ${ neg }
\x1b[2msize:       \x1b[0m ${ width }x${ height }
\x1b[2mcount:      \x1b[0m ${ count }
\x1b[2mseed:       \x1b[0m ${ seed }
                `);

                // attempt to generate (will fail if API cannot be polled)
                for (let i = 0; i < count; i++) {

                    console.log(`${ i }/${ count } images complete.`);

                    await generateImage(
                        gradio,
                        {
                            pos:    pos,
                            neg:    neg,
                            seed:   seed,
                            width:  width,
                            height: height
                        }
                    );
                }

                console.log(`${ count }/${ count } images complete.`);

            } else {
                
                throw new Error("Unrecognized command. Type \"help\" for help.");
            }

        } catch (err) {

            console.log("\x1b[31m" + err + "\x1b[0m");
        }
    }

})();

function getCommandArgument(command, flag) {

    if (!command.includes(" -" + flag)) {
        return undefined;
    }

    let flagIndex = command.indexOf(" -" + flag) + flag.length + 3; // +3 to accomodate " -" and the space following the flag

    let terminalIndex = command.indexOf(" -", flagIndex);

    if (terminalIndex == -1) {
        terminalIndex = command.length;
    }

    return command.substring(flagIndex, terminalIndex).trim();
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
            "steps":            50,
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