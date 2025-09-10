const fs = require("fs");
const { createServer } = require("node:http");
const sharp = require("sharp");                 // npm install sharp

// [SAVE PROMPT] button + [LOAD PROMPT] dropdown + saved_prompts/ directory
// images/ directory
// file input that analyzes its metadata and loads the prompt (for easy saving!)

// idk
// loras (lists loras)
// model [list|use MODEL]
// stash DIRECTORY | uploads all images in the DIRECTORY to stash as separate posts with tags automatically added based on the prompt (what about description? title?)

const gradioID = require("readline-sync").question("Enter gradio ID: ");

console.log(`\x1b[2mgradio link:\x1b[0m https://${ gradioID }.gradio.live/`);

createServer((req, res) => {

    console.log(req.method + " " + req.url);

    if (req.method == "GET" && req.url.startsWith("/draw")) {

        const params = new URLSearchParams(req.url.split("?", 2)[1]);

        // validate
        if (!params.get("pos")) {

            // missing pos argument
            return;
        }

        // get arguments
        const pos = params.get("pos");
        const neg = params.get("neg") ? params.get("neg") : undefined;

        const steps = params.get("steps") && Number(params.get("steps")) != NaN && Number(params.get("steps")) >= 1 ? Math.floor(Number(params.get("steps"))) : 50;

        const cfg = params.get("cfg") && Number(params.get("cfg")) != NaN && Number(params.get("cfg")) >= 1 ? Number(params.get("cfg")) : 7.0;
        
        const [ width, height ] = (() => {

            let size = params.get("size");

            if (!size) {
                return [ 1200, 1200 ];
            }

            size = size.split("x");

            if (size.length != 2 || Number(size[0]) == NaN || Number(size[1]) == NaN) {
                return [ 1200, 1200 ];
            }

            return [ Math.max(640, Number(size[0])),  Math.max(640, Number(size[1])) ];
        })();

        const seed = params.get("seed") ? params.get("seed") : -1;

        // pretty print all arguments
        console.log(`
\x1b[2mpositive:   \x1b[0m ${ pos }
\x1b[2mnegative:   \x1b[0m ${ neg }
\x1b[2msize:       \x1b[0m ${ width }x${ height }
\x1b[2mseed:       \x1b[0m ${ seed }
\x1b[2msteps:      \x1b[0m ${ steps }
\x1b[2mcfg:        \x1b[0m ${ cfg }
        `);

        // TODO queue gen instead of launching it right away

        // attempt to generate (will fail if API cannot be polled)
        generateImage(
            {
                pos:    pos,
                neg:    neg,
                seed:   seed,
                steps:  steps,
                cfg:    cfg,
                width:  width,
                height: height
            }
        ).then((buffer) => {

            res.writeHead(200, { "Content-Type": "image/png" });
            res.end(buffer);
            console.log("Success");

        }).catch((e) => {

            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("error");
            console.log("Error: " + e);
        });

    } else {

        // size (blank for 1200x1200, minimum 640x640)
        // seed (blank for random)
        // steps (blank for 50)
        // cfg (blank for 7)

        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>ArtBot</title>
    <style>
        th { text-align: left; }
        img { height: 400px; min-width: 100px; background: #eee; border: 1px solid #aaa; }
        button { border-radius: 4px; border: none; cursor: pointer; background: green; color: white; font-weight: 700; font: inherit; padding: 1em 2em; }
    </style>
    <script>

        function queueGeneration() {

            const query = new URLSearchParams({
                pos: document.getElementById("pos").value,
                neg: undefined,
                size: undefined,
                seed: Math.floor(Math.random() * 10000000),
                steps: undefined,
                cfg: undefined
            }).toString();
        
            document.getElementById("insert").innerHTML += \`<img src="/draw?\${ query }">\`;
        }

    </script>
</head>
<body>

    <table>
        <tr>
            <th><label for="pos">Positive:</label></th>
            <td><textarea id="pos" name="pos" rows="4" cols="50"></textarea></td>
        </tr>
        <!--
        <tr>
            <th><label for="gradio">Gradio ID:</label></th>
            <td>https://<input type="text" id="gradio" name="gradio">.gradio.live/</td>
        </tr>
        -->
        <tr>
            <th></th>
            <td>
                <button type="button" onclick="queueGeneration();">Queue Generation</button>
            </td>
        </tr>
    </table>

    <div id="insert"></div>

</body>
</html>
        `);
    }

}).listen(3000, "localhost", () => { console.log(`Copy this into your browser => http://localhost:3000/`); });

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
    const image_buffer = Buffer.from(json.images[0], "base64");

    // save file with name based on seed
    fs.writeFileSync(`img_${ seed }.png`, image_buffer);

    return image_buffer;
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



// code for analyzing an image's metadata
// if (!command.includes("-in")) {

//     throw new Error("Missing -in argument.");
// }

// const metadata = await sharp(getCommandArgument(command, "in")).metadata();

// const parameters = metadata.comments.filter((value) => { return value.keyword == "parameters"; });

// if (parameters.length > 0) {

//     let text = parameters[0].text;

//     text = text.split("\nNegative prompt: ", 2);

//     const pos = text[0];

//     text = text[1].split("\nSteps: ", 2);

//     const neg = text[0];

//     text = text[1].split(", Sampler: Euler, Schedule type: Automatic, CFG scale: ", 2);

//     const steps = text[0];

//     text = text[1].split(", Seed: ", 2);

//     const cfg = Number(text[0]); // conveniently converts 7.0 to 7 for us

//     text = text[1].split(", Size: ", 2);

//     const seed = text[0];

//     text = text[1].split(", Model hash:", 2);

//     const size = text[0];

//     console.log(`draw -pos ${ pos } -neg ${ neg } -size ${ size } -seed ${ seed } -steps ${ steps } -cfg ${ cfg }`);