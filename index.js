const { Console } = require('console')
const Discord = require('discord.js')
const ms = require('ms')
const client = new Discord.Client()
const {prefix, token, applicationURL, memberRole, trialRole, fullMemberRole, applicationChannel, staffChannel, pollChannel, memberChannel} = require('./config.json')

// Setup for vars and array. Note that everything is using their ids
let authTokens = []
let reactionEmojis = ['780549171089637376', '780549170770870292', '780548158068621355'] // Agree, disagree, neutral


client.login(token)

// Startup, dms Owner of the bot that it is online, sets activity
client.on('ready', async () => {
    const embed = new Discord.MessageEmbed()
        .setDescription(`${client.user.tag} is online!`);
    let owner = await client.users.fetch('213585513326706690')
    owner.send(embed)
    client.user.setActivity('over Khaos Applications', { type : "WATCHING" })
    console.log('Bot is up and running!')
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
    };

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
            .setColor(0x00ff40)
            .setFooter(message.author.tag, message.author.avatarURL());
        const embed2 = new Discord.MessageEmbed()
        .setTitle('New Token Generated!')
        .setDescription(newAuthToken)
        .setColor(0xff7f50)
        .setFooter(`Generated by ${message.author.tag} in #${message.channel.name}`, message.author.avatarURL());
        message.channel.send(embed)
        message.guild.channels.cache.get(staffChannel).send(embed2)
    };

    // Remove Auth Tokens if needed, needs to be able to manage servers for this.
    if(command === 'removetoken' && message.member.hasPermission('MANAGE_GUILD')) {
        authTokens = authTokens.filter(args[0])
        message.guild.channels.cache.get(staffChannel).send(`Removed token ${args[0]}`)
    };

    // Poll command, remind me to add multiple choice option to it too, only works with member role
    if(command === 'poll' && message.member.roles.cache.get(memberRole)) {
        message.delete().catch()
        if(!args[1]) return message.channel.send(`Please use a valid format! (${prefix}poll [time] [Poll question]`).then(msg => {msg.delete(10000)})
        var pollTime = ms(args[0])
        if(pollTime > 604800000) return message.channel.send('Please select a smaller poll time.') // Checks if pull time is less than 7 days
        var pollQuestion = args.slice(1).join(' ')
        const embed = new Discord.MessageEmbed()
            .setTitle('Pending..')
            .setColor(0x8DEEEE)
            .setFooter(message.author.username, message.author.avatarURL())
            .setTimestamp();

        // Send poll message, react and handle the results on poll end
        var poll = await message.guild.channels.cache.get(pollChannel).send(embed)
        await poll.react(reactionEmojis[0])
        await poll.react(reactionEmojis[1])
        await poll.react(reactionEmojis[2])
        const collector = poll.createReactionCollector((reaction, user) => reaction.id == reactionEmojis[0] || reactionEmojis[1] || reactionEmojis[2], {time: pollTime})
        poll.edit(embed.setTitle(pollQuestion + `(Ends in ${args[0]})`))
        collector.on('end', collected => {
            let agree = collected.filter(reaction => reaction.emoji.id == reactionEmojis[0]).size
            let disagree = collected.filter(reaction => reaction.emoji.id == reactionEmojis[1]).size
            let neutral = collected.filter(reaction => reaction.emoji.id == reactionEmojis[2]).size
            let winner;
            if(agree > disagree) { winner = 'The majority agrees!' }
            if(agree < disagree) { winner = 'The majority disagrees!'}
            if(agree == disagree) { winner = 'It is a tie!'}
            const editembed = new Discord.MessageEmbed()
                .setTitle(`${pollQuestion} (Over!)`)
                .setColor(0x721111)
                .addField(winner, `${agree}/${disagree + agree} people agrees.`)
                .setDescription(`${agree} people agree, ${disagree} people disagree and ${neutral} passed on this vote.`)
                .setFooter(message.author.username, message.author.avatarURL())
                .setTimestamp();
            poll.edit(editembed)
            poll.reactions.removeAll().catch();
        })
    };

    // Promote users to trial or full member, only works with those who can manage roles.
    if(command === 'promote' && message.member.hasPermission('MANAGE_ROLES')) {
        message.delete().catch()
        var toPromote = message.mentions.members.first()
        if(!toPromote) return message.channel.send('You need to mention a user to promote!')
        const trial = new Discord.MessageEmbed()
            .setTitle(`${toPromote.user.username} was promoted to Trial Member!`)
            .setColor(0xff8b00)
            .setDescription(`Promoted by ${message.author.username}`)
            .setFooter(toPromote.user.tag, toPromote.user.avatarURL());

        const fullMember = new Discord.MessageEmbed()
            .setTitle(`${toPromote.user.username} was promoted to Full Member!`)
            .setColor(0xbb0a0a)
            .setDescription(`Promoted by ${message.author.username}`)
            .setFooter(toPromote.user.tag, toPromote.user.avatarURL());

        // Promote user if they dont have all member role
        if(!toPromote.roles.cache.get(memberRole)) {
            try {
                toPromote.roles.add(trialRole)
                toPromote.roles.add(memberRole)
                message.guild.channels.cache.get(memberChannel).send(trial)
            } catch { message.channel.send(`Oopsie! Failed to add roles. Please check my permissions.`).then(msg => {msg.delete(10000)}) }
                return;}
    
        // Promote user if they have trial role
        if(toPromote.roles.cache.get(memberRole)) {
            try {
                toPromote.roles.remove(trialRole)
                toPromote.roles.add(fullMemberRole)
                message.guild.channels.cache.get(memberChannel).send(fullMember)
            } catch {
                message.channel.send(`Oopsie! Failed to add roles. Please check my permissions.`).then(msg => {msg.delete(10000)}) }
            return; }
        };
});