const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits, MessageAttachment, AttachmentBuilder } = require('discord.js');
const { token } = require('./config.json');

const client = new Client({ intents: [GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, 
	GatewayIntentBits.DirectMessages,
] });



client.commands = new Collection();
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
const screenshot = require('screenshot-desktop');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const fuzzysearch = require('fuzzysearch');
const robot = require('robotjs');
const axios = require('axios');
const fetcher = require('node-fetch');
const { OpenAI } = require('openai');
require('dotenv').config();

const TENOR_API_KEY = process.env.TENOR_API_KEY;
const GPT_KEY = process.env.GPT_KEY;

 const TEST_CHANNEL = process.env.TEST_CHANNEL;
 const LIVE_CHANNEL = process.env.LIVE_CHANNEL;
 const BOT_DEDICATED_CHANNEL = process.env.BOT_DEDICATED_CHANNEL;

const CURRENT_CHANNEL = TEST_CHANNEL;

const openai = new OpenAI({
	apiKey: GPT_KEY
});


let lastCheckResult = [];
let counter = 0;
let sleep = false;


let isStartup = true;

var msgArchive = [];
const USER_GIF_MAP = new Map([
//[Username, GIF lookup]
//Use all caps for user name
// This doesn't like spaces for now.  use dashes
    ['BATMAN', 'Batman'],
    ['COL', 'mustard-lick-spongebob'],
    ['LIFEFORM', 'Crocodile-Dundee'],
	['KERMIT', 'kermit-the-frog'],
	['DRW', 'afk'],
	['YOV', 'shapeshifter'],
	['RTS', 'romulan'],
	['EMPTY', 'empty'],
	['NICK', 'supremeleader'],
	['WEIHUNG', 'firefighter-calendar'],
	['BK', 'flame-broiled-whopper'],
	['PIPLE','pitbull'],
	['JOSH','serious-cat'],
	['BBZ','smoke-break'],
	['SHADOW','fps-hacks'],
	['DUKAT','dukat'],
	['DEF','shockmaster'],
	['WP','peewee']
]);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.once(Events.ClientReady, readyClient => {
	console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

client.on('ready', client => {
	console.log('ready')
   //doFetch();
run();
   
})

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
		}
	}
});

client.on('messageCreate', (message) => {
	// Ignore messages from the bot itself to prevent it from reacting to its own messages
	if (message.author.bot) return;
  
	// Check if the message content matches a specific string
	if (message.content.toLowerCase() === 'bot-enable-notifications' && sleep) {
	  message.reply('Enabling GameRanger notifications.  Say bot-disable-notifications to deactivate. ');
	  sleep = false;
	}

	if (message.content.toLowerCase() === 'bot-disable-notifications' && !sleep) {
		message.reply('Disabling GameRanger notifications.  Say bot-enable-notifications to reactivate. ');
		sleep = true;
	  }


	  if (message.content.toLowerCase() === 'bot-show') {
		currentScreenShot(message);
	  }
	  console.log(message);

	  if ( [BOT_DEDICATED_CHANNEL, TEST_CHANNEL].includes(message.channelId)){
	  if (message.content.toLowerCase().includes('hey-bot')) {
		const parts = message.content.split("hey-bot");
		console.log(parts);
        const prompt = parts.length > 1 ? parts[1].trim() : null;
		if(prompt!= null){
			askGPT(message, prompt);
		}
	}
	if(message.mentions?.repliedUser?.username == 'Armada Notifications'){
		askGPT(message, message.content);
	}
	if (message.content.toLowerCase().includes('bot-draw')) {
		const parts = message.content.split("bot-draw");
		console.log(parts);
        const prompt = parts.length > 1 ? parts[1].trim() : null;
		if(prompt!= null){
			generateImage(message, prompt);
		}
	}
	  }


  });

client.login(token);

function watchGameRanger() {
	// Take a screenshot of the entire screen
	screenshot({ format: 'png' })
	  .then((imgBuffer) => {

		image = sharp(imgBuffer);
		image2 = image.clone();

		image
		.extract({ left: 0, top: 210, width: 900, height: 80 })
		.toBuffer()
		.then(cropped => { fs.writeFileSync('screenshotx.png', cropped);})

		image2
		  .extract({ left: 0, top: 210, width: 900, height: 80 }) // Adjust width/height based on screen resolution
		 // .grayscale()
		 .resize( 1800, 160, 
			{kernel: sharp.kernel.mitchell, fit: "contain"} 
		)
		  .threshold(180)
		  .toBuffer()
		  .then((croppedBuffer) => {
			

			fs.writeFileSync('screenshot.png', croppedBuffer);
			// Use Tesseract.js to extract text from the cropped screenshot
			Tesseract.recognize(croppedBuffer, 'eng', {
			//  logger: (info) => console.log(info), // Optional logging
			  tessedit_write_images: true,
			  tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz/~!@#$%^&*()<>?\\{}[]'
			})
			  .then(({ data: { text } }) => {
			//	console.log(sanitize(text));
				var games = extractWords(sanitize(text));
			//	console.log(games);

				games = games.sort();
                lastCheckResult = lastCheckResult.sort();

				//  console.log(games.length + " $ " + lastCheckResult.length)

				if(games.length > lastCheckResult.length){
				//	console.log(lastCheckResult + " : " + games);
					if(isStartup){
						isStartup = false;
						return;
					}
					const attachment = new AttachmentBuilder('screenshotx.png');
					//    client.channels.cache.get('1301945964680052851').send({
					const msg =	client.channels.cache.get(CURRENT_CHANNEL).send({
						content: 'Game hosted by: ' + games,  // Message content
						files: [attachment]                  // Attach the image
					});

					games.forEach(game => {
						// console.log("$" + game.toUpperCase())
						// console.log(USER_GIF_MAP.has(game.toUpperCase()))
					///	console.log(USER_GIF_MAP.get(game.toUpperCase()))
						if(USER_GIF_MAP.has(game.toUpperCase())){
							putGif(msg, USER_GIF_MAP.get(game.toUpperCase()));
						}
					})
					
				}
				lastCheckResult = games;
				
			  })
			  .catch((error) => {
				console.error('OCR Error:', error);
			  });
		  })
		  .catch((err) => {
			console.error('Cropping Error:', err);
		  });
	  })
	  .catch((error) => {
		console.error('Error capturing screenshot:', error);
	  });
  }

  function putGif(message, searchText){
        // Tenor API URL
        const url = `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(searchText)}&key=${TENOR_API_KEY}&limit=10`;

		//const url = `https://tenor.googleapis.com/v2/search?q=` + searchText + `&key=${TENOR_API_KEY}&limit=1&random=true`;
console.log("URL" + url)
        // Fetch a random Batman GIF
        axios.get(url)
            .then((response) => {
				console.log(response)
             //   const gifUrl = response.data.results[0].media_formats.gif.url;
			 const gifs = response.data.results;
			 if (gifs == null || gifs.length <1){
				return;
			 }
			const randomIndex = Math.floor(Math.random() * gifs.length);
            const gifUrl = gifs[randomIndex].url;

				client.channels.cache.get(CURRENT_CHANNEL).send(gifUrl);
                // Send the GIF URL in the Discord channel
               // return message.channel.send(gifUrl);
            })
            .catch((error) => {
                console.error('Error fetching GIF:', error);
             //   message.channel.send('Sorry, I could not fetch a Batman GIF right now.');
            });
  }

  function currentScreenShot(messageRef) {
	// Take a screenshot of the entire screen
	screenshot({ format: 'png' })
	  .then((imgBuffer) => {

		image = sharp(imgBuffer);

		image
		.extract({ left: 0, top: 210, width: 900, height: 180 })
		.toBuffer()
		.then(cropped => { fs.writeFileSync('current_screenshot.png', cropped);
		
			const attachment = new AttachmentBuilder(cropped);
			//    client.channels.cache.get('1301945964680052851').send({
			//	client.channels.cache.get(CURRENT_CHANNEL).send({
					messageRef.reply({
						content: 'Current Lobby: ',  // Message content
						files: [attachment]                  // Attach the image
					})
			});
		})
	 // })
	  .catch((error) => {
		console.error('Error capturing screenshot:', error);
	  });
  }

function extractWords(inputString) {
	const result = [];
	//const regex = /Armada (\w+)/g; // Regular expression to find "Star Trek: Armada" followed by a word
    const regex = /Armada (\S+)(?=\s|\t)/g;

	let match;
	while ((match = regex.exec(inputString)) !== null) {
	  result.push(match[1]); // Add the word following "Star Trek: Armada" to the array
	}
  
	return result;
  }

  //Responses from this server weren't correct last time i checked.
  function fetch2() {
    fetch('https://www.mobile-infanterie.de/armada_1_matches_api.php')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json(); // Use .text() if the response is plain text. Use .json() if it's JSON.
        })
        .then(body => {
            console.log("Response from mobile-infanterie:", body);
			if(body?.matches?.length > 0){
			 console.log("IPX game hosted")
			 body.matches.map(match => client.channels.cache.get(CURRENT_CHANNEL).send("ipx game hosted by: " + JSON.stringify(match)))
			 
			 client.channels.cache.get(CURRENT_CHANNEL).send("ipx game "); 
			}
            // Ensure CURRENT_CHANNEL is correctly set
        })
        .catch(error => {
            console.error('Fetch error:', error);
        });
}

// const doFetch = async () => {
// 	try {
// 		// Dynamically import fetch
// 		const { default: fetch } = await fetcher // Use await here

// 		// Fetch data from the API
// 		const response = await fetch('https://www.mobile-infanterie.de/armada_1_matches_api.php'); // Use await here
// 		if (!response.ok) {
// 			throw new Error('Network response was not ok');
// 		}
// 		console.log("response from mobile-infantier")
// 		console.log(response);
		
// 		// Parse the JSON response
// 		const data = await response.json(); // Use await here for parsing

// 		// Execute additional code after the fetch completes
// 		client.channels.cache.get(CURRENT_CHANNEL).send('tried to fetch');
// 		client.channels.cache.get(CURRENT_CHANNEL).send(await data);
// 		// You can add more code here that should run after the fetch is done
// 	} catch (error) {
// 		console.error(`Error fetching data: ${error.message}`);
// 	}
// 	wait(50000);
// 	doFetch();
// };

function askGPT(messageRef, inputString){
	console.log(messageRef);
	const prePend = `
	You are a bot in a discord channel that is dedicated
	to an RTS game called Star Trek: Armada
	You want the user-base of the game to grow and help players get better at the game.
	Please keep responses somewhere between 50 and 100 words.
	Here is a message for you from user: ` + messageRef.author.globalName
	console.log("message trigger gpt call")
	console.log(messageRef);
	console.log("About to send to chatgpt: " + inputString)
    newMsgContent = "" + prePend + inputString;
	msgArchive.push({ role: "user", content: newMsgContent });

	const completion = openai.chat.completions.create({
	  model: "gpt-4o-mini",
	  store: true,
	  messages: msgArchive,
	});
	
	completion.then((result) => {
		messageRef.reply(result.choices[0].message.content)
		console.log(result.choices[0].message);
		msgArchive.push({role: "assistant", content: "" + result.choices[0].message })
	})
	.catch((error) => {
		console.error("Error occurred while calling ChatGPT:", error);
	  });
	;
}


function generateImage(messageRef, prompt) {


    openai.images
        .generate({
			model: "dall-e-3",
            prompt: prompt,
            n: 1, // Number of images to generate
            size: "1024x1024", // Resolution of the image
        })
        .then((response) => {
            const imageUrl = response.data[0].url; // URL of the generated image
            console.log("Image URL:", imageUrl);

            // Fetch the image as a buffer
            return axios.get(imageUrl, { responseType: "arraybuffer" });
        })
        .then((imageResponse) => {
            const imageBuffer = Buffer.from(imageResponse.data, "binary");
            console.log("Image Buffer Loaded");
            
            // Use `imageBuffer` as needed (e.g., save it, process it, etc.)
			const attachment = new AttachmentBuilder(imageBuffer);
			//    client.channels.cache.get('1301945964680052851').send({
			//	client.channels.cache.get(CURRENT_CHANNEL).send({
					messageRef.reply({
						content: 'Image: ',  // Message content
						files: [attachment]                  // Attach the image
					})
			})
     //   })
        .catch((error) => {
            console.error("Failed to generate or fetch image:", error);
			messageRef.reply(error.message)
        });
}

function wait(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
  }

  function sanitize(text) {
	var updated = text.replaceAll("(","")
	 updated = updated.replaceAll(")","")
	 updated = updated.replaceAll("{","")
	 updated = updated.replaceAll("}","")
	 updated = updated.replaceAll(",","")
	 updated = updated.replaceAll("[","")
	 updated = updated.replaceAll("]","")
	 updated = updated.replaceAll("<","")
	 updated = updated.replaceAll("<","")
	 updated = updated.replaceAll('"','')
	 updated = updated.replaceAll("~","")
	 updated = updated.replaceAll("/","")
	 updated = updated.replaceAll("\\","")
	 updated = updated.replaceAll('“','')
	 updated = updated.replaceAll('™', '')
	return updated;
    }

  async function run() {
	let count = 0;
   // fetch2();
	do {
	//Keep GameRanger awake and poke the shell running this bot

	robot.keyTap("enter");
	if(!sleep){
	  watchGameRanger();
	}else{
		console.log("sleeping");
	}
	  // Wait for 10 seconds before proceeding to the next iteration
	  await wait(10000);
	  count++;
	} while (count < 500000); // Run the loop 5 times
  }