const { Console } = require('console');
const Discord = require('discord.js')
const client = new Discord.Client();
const {prefix, token} = require('./config.json')
var authTokens = []


client.login(token)

// Startup, dms Owner of the bot that it is online
client.on('ready', async () => {
    const embed = new Discord.MessageEmbed()
        .setDescription(`${client.user.tag} is online!`);
    let owner = await client.users.fetch('213585513326706690')
    owner.send(embed)
});

client.on('message', async message => { 

    // Checks if webhook, valid auth token, is from #applications channel, otherwise deletes message. if those are true, then add reactions
    if(message.channel == '751744956678275172') {
        if(authTokens.includes(message.embeds[0].fields[0].value) && (message.webhookID != null)) {
        await message.react('780549171089637376')
        await message.react('780549170770870292')
        await message.react('780548158068621355')
        var authTokens = authTokens.filter(message.embeds[0].fields[0].value)
        } else {
            message.delete.catch();
        }
    }

    // Args and command variable, also checks if user is not a bot.
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Apply command, will generate an authentication token and a prefilled link including it as an answer, wont work if author doesnt have member role
    if(message.command == 'apply' && message.author.role.equals('726562209617936414')) {
        var newAuthToken = require('crypto').randomBytes(32).toString('base64')
        if(authTokens.includes(newAuthToken)) return;
        authTokens.append(newAuthToken)
        const embed = new MessageEmbed()
            .setTitle('Click here to apply!')
            .setUrl('https://docs.google.com/forms/d/e/1FAIpQLSfPSH-lkRLUwrPMtIoz1zibs0YwQyVKA_uDHGSGnHfCf7DdhA/viewform?usp=pp_url&entry.2046443512=' + newAuthToken)
            .setDescription('Authentication token is included in the URL, your application will not work without it.')
            .setAuthor(message.author)
        message.channel.send(embed)
    }
});