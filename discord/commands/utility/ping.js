const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Replies with data from mysite.com'),
	async execute(interaction) {
		try {
			// Dynamically import fetch
			const { default: fetch } = await import('node-fetch');

			const response = await fetch('https://www.mobile-infanterie.de/armada_1_matches_api.php');
			if (!response.ok) {
				throw new Error('Network response was not ok');
			}
			const data = await response.json();
			await interaction.reply(`Received data: ${JSON.stringify(data)}`);
			sleep(2000);
			interaction.message('second reply?');
		} catch (error) {
			await interaction.reply(`Error fetching data: ${error.message}`);
		}
	},
};