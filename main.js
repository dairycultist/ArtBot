const fs = require("fs");
const { createServer } = require("node:http");
const sharp = require("sharp");                 // npm install sharp

createServer((req, res) => {

    // GET /

    // GET /draw?pos=_&neg=_&...

    //     -gradio ID              \x1b[2mthe gradio id of your gradio link (i.e. https://<THIS_PART>.gradio.live/)\x1b[0m
    //     -pos POSITIVE_PROMPT
    //     [-neg NEGATIVE_PROMPT]
    //     [-size WIDTHxHEIGHT]    \x1b[2mdefault is 1200x1200. minimum size is 640x640\x1b[0m
    //     [-count COUNT]          \x1b[2mdefault is 1\x1b[0m
    //     [-seed SEED]            \x1b[2mdefault is -1 (random)\x1b[0m
    //     [-steps STEPS]          \x1b[2mdefault is 50\x1b[0m
    //     [-cfg CFG]              \x1b[2mdefault is 7\x1b[0m

    const request = req.method + " " + req.url;

    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }); // image/png 

    res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ArtBot</title>
</head>
<body>
    <label for="gradio">Gradio ID:</label> https://<input type="text" id="gradio" name="gradio">.gradio.live/
</body>
</html>
    `);

}).listen(3000, "localhost", () => { console.log(`Copy this into your browser => http://localhost:3000/`); });





// analyze
//     -in IMAGE_PATH          \x1b[2mprints a draw command reconstructed from this image's metadata\x1b[0m
//     [-out PATH.txt]         \x1b[2m(not implemented yet) if provided, instead of printing the draw command, outputs it into the specified file\x1b[0m

// loras (lists loras)
// model [list|use MODEL]
// stash DIRECTORY | uploads all images in the DIRECTORY to stash as separate posts with tags automatically added based on the prompt (what about description? title?)




//             } else if (commandName == "analyze") {

//                 if (!command.includes("-in")) {

//                     throw new Error("Missing -in argument.");
//                 }

//                 const metadata = await sharp(getCommandArgument(command, "in")).metadata();

//                 const parameters = metadata.comments.filter((value) => { return value.keyword == "parameters"; });

//                 if (parameters.length > 0) {

//                     let text = parameters[0].text;

//                     text = text.split("\nNegative prompt: ", 2);

//                     const pos = text[0];

//                     text = text[1].split("\nSteps: ", 2);

//                     const neg = text[0];

//                     text = text[1].split(", Sampler: Euler, Schedule type: Automatic, CFG scale: ", 2);

//                     const steps = text[0];

//                     text = text[1].split(", Seed: ", 2);

//                     const cfg = Number(text[0]); // conveniently converts 7.0 to 7 for us

//                     text = text[1].split(", Size: ", 2);

//                     const seed = text[0];

//                     text = text[1].split(", Model hash:", 2);

//                     const size = text[0];

//                     console.log(`draw -pos ${ pos } -neg ${ neg } -size ${ size } -seed ${ seed } -steps ${ steps } -cfg ${ cfg }`);
//                 }








                // // validate
                // if (!command.includes("-gradio") || !command.includes("-pos")) {

                //     throw new Error("Missing -gradio or -pos arguments.");
                // }

                // // get arguments
                // const gradio = getCommandArgument(command, "gradio");
                // const pos = getCommandArgument(command, "pos");
                // const neg = getCommandArgument(command, "neg");

                // const steps = (() => {
                //     let steps = getCommandArgument(command, "steps");
                //     return steps && Number(steps) != NaN && Number(steps) >= 1 ? Math.floor(Number(steps)) : 50;
                // })();

                // const cfg = (() => {
                //     let cfg = getCommandArgument(command, "cfg");
                //     return cfg && Number(cfg) != NaN && Number(cfg) >= 1 ? Number(cfg) : 7.0;
                // })();
                
                // const [ width, height ] = (() => {
                //     let size = getCommandArgument(command, "size");

                //     if (!size) {
                //         return [ 1200, 1200 ];
                //     }

                //     size = size.split("x");

                //     if (size.length != 2 || Number(size[0]) == NaN || Number(size[1]) == NaN) {
                //         return [ 1200, 1200 ];
                //     }

                //     return [ Math.max(640, Number(size[0])),  Math.max(640, Number(size[1])) ];
                // })();

                // const count = (() => {
                //     let count = getCommandArgument(command, "count");
                //     return count && Number(count) != NaN && Number(count) >= 1 ? Math.floor(Number(count)) : 1;
                // })();

                // const seed = (() => {
                //     let seed = getCommandArgument(command, "seed");
                //     return seed ? seed : -1;
                // })();

                // // attempt to generate (will fail if API cannot be polled)
                // for (let i = 0; i < count; i++) {

                //     console.log(`${ i }/${ count } images complete.`);

                //     await generateImage(
                //         gradio,
                //         {
                //             pos:    pos,
                //             neg:    neg,
                //             seed:   seed,
                //             steps:  steps,
                //             cfg:    cfg,
                //             width:  width,
                //             height: height
                //         }
                //     );
                // }

                // console.log(`${ count }/${ count } images complete.`);





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
            "steps":            prompt.steps,
            cfg_scale:          prompt.cfg,
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