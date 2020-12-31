const { Console } = require('console')
const Discord = require('discord.js')
const client = new Discord.Client()
const {prefix, token, applicationURL} = require('./config.json')

// Setup for vars and array. Note that everything is using their ids
let authTokens = []
let memberRole = '726562209617936414'
let applicationChannel = '751744956678275172'
let staffRole = '740544739773775882'
let staffChannel = '751095498974167161'
let reactionEmojis = ['780549171089637376', '780549170770870292', '780548158068621355'] // Agree, disagree, neutral

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
    if(message.channel == applicationChannel) {
        var attemptedAuthToken = message.embeds[0].fields[0].value.toString()
        if(authTokens.includes(attemptedAuthToken) && (message.webhookID != null)) {
        await message.react(reactionEmojis[0]) // These 3 are for voting, remove them if you do not want them.
        await message.react(reactionEmojis[1])
        await message.react(reactionEmojis[2])
        authTokens = authTokens.filter(attemptedAuthToken)
        message.guild.channels.cache.get(staffChannel).send(`User ${message.embeds[0].fields[1].value} applied using token ${attemptedAuthToken}`)
        } else {
            message.delete().catch();
        }
    }

    // Args and command variable, also checks if user is not a bot.
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    // Apply command, will generate an authentication token and a prefilled link including it as an answer, wont work if author doesnt have member role
    if(command == 'apply' && message.member.roles.cache.get(memberRole)) {
        var newAuthToken = require('crypto').randomBytes(32).toString('hex')
        if(authTokens.includes(newAuthToken)) return;
        authTokens.push(newAuthToken)
        const embed = new Discord.MessageEmbed()
            .setTitle('Click here to apply!')
            .setURL(applicationURL + newAuthToken)
            .setDescription('Authentication token is included in the URL, your application will not work without it.')
            .setColor(0xff7f50)
            .setFooter(message.author.tag, message.author.avatarURL());
        const embed2 = new Discord.MessageEmbed()
        .setTitle('New Token Generated!')
        .setDescription(newAuthToken)
        .setColor(0xff7f50)
        .setFooter(`Generated by ${message.author.tag} in #${message.channel.name}`, message.author.avatarURL());
        message.channel.send(embed)
        message.guild.channels.cache.get(staffChannel).send(embed2)
    }

    if(command == 'removetoken' && message.member.roles.cache.get(staffRole)) {
        authTokens = authTokens.filter(args[0])
        message.guild.channels.cache.get(staffChannel).send(`Removed token ${args[0]}`)
    }
});