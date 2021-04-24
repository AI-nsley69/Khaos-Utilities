const Discord = require('discord.js')
const ms = require('ms')
const fetch = require('node-fetch')
const client = new Discord.Client()
const {
    prefix,
    token,
    applicationURL,
    memberRole,
    trialRole,
    fullMemberRole,
    inactiveRole,
    applicationChannel,
    staffChannel,
    pollChannel,
    memberChannel
} = require('./config.json')
let {
    applications,
    help,
    poll,
    promote,
    inactive,
    tag,
    status,
    commands
} = require('./commands.json')
const { tags, descriptions } = require('./tags.json')
const { serverNames, serverIps } = require ('./servers.json')
const { Console } = require('console')

// Setup for auth token & reaction emoji id arrays. Note that everything is using their ids
let authTokens = []
let reactionEmojis = ['780549171089637376', '780549170770870292', '780548158068621355'] // Agree, disagree, neutral

client.login(token)

// Startup, sends a direct message to the Owner that the bot is online, sets activity
client.on('ready', async () => {
    client.user.setActivity('over Khaos Applications', {
        type: "WATCHING"
    })
    console.log('Bot is up and running!')
});

client.on('message', async message => {

    // Checks if webhook, valid auth token, is from #applications channel, otherwise deletes message. if those are true, then add reactions
    if (message.channel == applicationChannel && applications) {
        var attemptedAuthToken = message.embeds[0].fields[0].value.toString()
        if (authTokens.includes(attemptedAuthToken) && (message.webhookID != null)) {
            await message.react(reactionEmojis[0]) // These 3 message.react() are for voting, remove them if you do not want them.
            await message.react(reactionEmojis[1])
            await message.react(reactionEmojis[2])
            const index = authTokens.indexOf(attemptedAuthToken);
            if (index > -1) {
                authTokens.splice(index, 1);
            }
            message.guild.channels.cache.get(staffChannel).send(`User ${message.embeds[0].fields[1].value} applied using token ${attemptedAuthToken}`)
        } else {
            message.delete().catch()
        }
    }

    // Args and command variable, also checks if user is not a bot, if it doesnt start with the right prefix or it is a bot it just returns.
    if (!message.content.startsWith(prefix) || message.author.bot) return;
    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    if (command == 'help' && message.member.roles.cache.get(memberRole) && help) {
        message.delete().catch();
        //embed the new token to a message
        const embed = new Discord.MessageEmbed()
            .setTitle('Help!')
            .setDescription("k!help - displays this message\nk!inactive - Sets your role and color to display that you're inactive\nk!apply - Gives the user an apply form\n")
            .setColor(0x00ff40)
            .setFooter(message.author.tag, message.author.avatarURL());
        //display the new message about player becoming inactive
        message.guild.channels.cache.get(memberChannel).send(embed);
    }

    // Apply command, will generate an authentication token and a prefilled link including it as an answer, wont work if author doesnt have member role
    if (command == 'apply' && message.member.roles.cache.get(memberRole) && applications) {

        // Generate new auth token
        var newAuthToken = require('crypto').randomBytes(32).toString('hex');
        //if the token already exists create a new one
        if (authTokens.includes(newAuthToken)) {
            newAuthToken = require('crypto').randomBytes(32).toString('hex');
        }
        //push the new token to an array
        authTokens.push(newAuthToken);

        //embed the new token to a message
        const embed = new Discord.MessageEmbed()
            .setTitle('Click here to apply!')
            .setURL(applicationURL + newAuthToken)
            .setDescription('Authentication token is included in the URL, your application will not work without it.')
            .setColor(0x00ff40)
            .setFooter(message.author.tag, message.author.avatarURL());

        //embed another message which says who created the apply form and the token
        const embed2 = new Discord.MessageEmbed()
            .setTitle('New Token Generated!')
            .setDescription(newAuthToken)
            .setColor(0xff7f50)
            .setFooter(`Generated by ${message.author.tag} in #${message.channel.name}`, message.author.avatarURL());

        //send the first embed to the same channel the command was called
        message.channel.send(embed);
        //send the second embed to the staff channel
        message.guild.channels.cache.get(staffChannel).send(embed2);
    }

    // Remove Auth Tokens command, the user needs to be able to manage servers for this.
    else if (command === 'removetoken' && message.member.hasPermission('MANAGE_GUILD') && applications) {
        //check if they've sent a token with the command, if not return and send a message that they need to input a token
        if (!args[0]) return message.channel.send('You need to input a token!');
        //else remove the specified token in the array
        const index = authTokens.indexOf(args[0]);
        if (index > -1) {
            authTokens.splice(index, 1);
        }
        //send message that the specified token has been removed
        message.guild.channels.cache.get(staffChannel).send(`Removed token ${args[0]}`);
    }

    // Add Auth Tokens if needed, needs to be able to manage servers for this.
    else if (command === 'addtoken' && message.member.hasPermission('MANAGE_GUILD') && applications) {
        //check if they've sent a token with the command, if not return and send a message that they need to input a token
        if (!args[0]) return message.channel.send('You need to input a token!');
        //else push the new token to the authTokens array
        authTokens.push(args[0]);
        //display a massage that the token has been added
        message.guild.channels.cache.get(staffChannel).send(`Added token ${args[0]}`);
    }

    // See list of auth tokens command, user needs to be able to manage servers for this.
    else if (command === 'listtoken' && message.member.hasPermission('MANAGE_GUILD') && applications) {
        //check if there exists any tokens in the array, if not, send message that there's no tokens
        if (authTokens.length == 0) return message.channel.send('No active tokens currently.');
        //variable to display tokens
        let listTokens = 'Tokens:\n';
        console.log(authTokens.length);
        //loop through all tokens
        for (i = 0; i < authTokens.length; i++) {
            console.log(i);
            console.log(authTokens[i]);
            //add the token to the variable listTokens
            listTokens += authTokens[i] + `\n`;
        }
        //embed a new message containing all tokens
        const embed = new Discord.MessageEmbed()
            .setTitle('List of tokens!')
            .setDescription(listTokens)
            .setFooter(message.author.username, message.author.avatarURL());
        //send the message to staffChannel
        message.guild.channels.cache.get(staffChannel).send(embed);
    }

    /* Poll command, {prefix}poll [options] [title], (description), (url)
    [] = required, () = optional
    Remember to have a space after the comma. No usage of commas inside this, otherwise you will mess it up. 
    If poll option is 2, it will apply the 2 reaction emojis for a yes/no question.
    Options cannot be more than 9 or less than 2.*/
    else if (command === 'poll' && message.member.roles.cache.get(memberRole) && poll) {

        // Delete message and check for arguments, setup & check time and create embed for question.
        message.delete().catch();
        
        if (!(1 < args[0] && args[0] < 10)) return message.channel.send('Your poll option is too big!');

        if (!args[0]) return message.channel.send("You're missing a poll option!");

        let pollRelated = args.splice(1).join(' ').split(', ');

        if (!pollRelated[0]) return message.channel.send("You're missing a poll question!");
        const embed = new Discord.MessageEmbed()
            .setTitle(pollRelated[0])
            .setColor(0x8DEEEE)
            .setFooter(message.author.username, message.author.avatarURL())
            .setTimestamp();

        // Add description if there is any
        if (pollRelated[1]) {
            embed.setDescription(pollRelated[1]);
        }
        // Add url if there is any
        if (pollRelated[2]) {
            embed.setURL(pollRelated[2]);
        }
        // Send poll message and wait for poll reactions
        let pollMsg = await message.guild.channels.cache.get(pollChannel).send(embed);
        if (args[0] == 2) {
            await pollMsg.react(reactionEmojis[0]);
            await pollMsg.react(reactionEmojis[1]);
            await pollMsg.react(reactionEmojis[2]);
        } else {
            // Add reactions if there's multiple options
            let optionEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣']
            for (let i = 0; i < args[0]; i++) {
                await pollMsg.react(optionEmojis[i]).catch();
            }
            await pollMsg.react(reactionEmojis[2]);
        }
    }


    // Promote users to trial or full member command, only user wich can manage roles can use this command.
    else if (command === 'promote' && message.member.hasPermission('MANAGE_ROLES') && promote) {
        // Delete users message, check if a user was mentioned
        message.delete().catch();
        //variable to store if they mentioned a user
        let toPromote = message.mentions.members.first();
        //check if they mentioned a user, if not return and display message
        if (!toPromote) return message.channel.send('You need to mention a user to promote!');

        //embed message to display if member was promoted to trial member
        const trial = new Discord.MessageEmbed()
            .setTitle(`${toPromote.user.username} was promoted to Trial Member!`)
            .setColor(message.guild.roles.cache.get(trialRole).color)
            .setDescription(`Promoted by ${message.author.username}`)
            .setFooter(toPromote.user.tag, toPromote.user.avatarURL());

        //embed message to display if member was promoted to full member
        const fullMember = new Discord.MessageEmbed()
            .setTitle(`${toPromote.user.username} was promoted to Full Member!`)
            .setColor(message.guild.roles.cache.get(fullMemberRole).color)
            .setDescription(`Promoted by ${message.author.username}`)
            .setFooter(toPromote.user.tag, toPromote.user.avatarURL());

        // Promote user to trial and add member role if they dont have a member role
        if (!toPromote.roles.cache.get(memberRole)) {
            try {
                toPromote.roles.add(trialRole);
                toPromote.roles.add(memberRole);
                //send embeded message that says the user was promoted to trial member
                message.guild.channels.cache.get(memberChannel).send(trial);
            } catch {
                //if the bot doesnt have access to add roles display this error message
                message.channel.send(`Oopsie! Failed to add roles. Please check my permissions.`).then(msg => {
                    msg.delete(10000);
                });
            }
            return;
        }

        // Promote user to full member if they have a member role
        if (toPromote.roles.cache.get(memberRole)) {
            try {
                toPromote.roles.remove(trialRole);
                toPromote.roles.add(fullMemberRole);
                //send full member embeded message that says the user was promoted to full member
                message.guild.channels.cache.get(memberChannel).send(fullMember);
            } catch {
                //if the bot doesnt have access to add roles display this error message
                message.channel.send(`Oopsie! Failed to add roles. Please check my permissions.`).then(msg => {
                    msg.delete(10000);
                })
            }
            return;
        }
    }

    // Inactive command for members to self assign to
    else if (command == 'inactive' && message.member.roles.cache.get(fullMemberRole) && inactive) {
        message.delete().catch();
        let reason = args.join(" ");
        //if they haven't specified a reason display this message
        if (!args) reason = 'Member did not specify reason';

        // Check if member doesn't have an inactive role, if they do give them the role.
        if (!(message.member.roles.cache.get(inactiveRole))) {

            //message to be displayed about becoming inactive
            const embed = new Discord.MessageEmbed()
                .setTitle(`${message.author.username} has invoked inactive status!`)
                .setDescription(reason)
                .setFooter(message.author.tag, message.author.avatarURL())
                .setColor(message.guild.roles.cache.get(inactiveRole).color)
                .setTimestamp();

            //display the new message about player becoming inactive
            message.guild.channels.cache.get(memberChannel).send(embed);
            message.member.roles.add(inactiveRole);
        } else {

            //message to be displayed about removing inactive status
            const embed = new Discord.MessageEmbed()
                .setTitle(`${message.author.username} has revoked inactive status!`)
                .setDescription(reason)
                .setColor(message.guild.roles.cache.get(fullMemberRole).color)
                .setFooter(message.author.tag, message.author.avatarURL())
                .setTimestamp();
            //display the new message about player becoming active again
            message.guild.channels.cache.get(memberChannel).send(embed);
            //remove inactive role
            message.member.roles.remove(inactiveRole);
        }
           // Tag to be able to call through bot
    } else if (command == 'tag' && tag) {
        if (!args[0] || tags[args[0]-1] == undefined) {
            let descriptionsText = ''
            for(i = 0; i < descriptions.length; i++) {
                descriptionsText += '- ' + descriptions[i] + '\n'
            }
            const embed1 = new Discord.MessageEmbed()
            .setTitle('Currently available tags')
            .setDescription(descriptionsText)
            .setColor(message.guild.me.displayColor)
            .setFooter(message.author.tag, message.author.avatarURL())

            message.channel.send(embed1)
        } else {
            // Create an embed showing who authored the command and what tag it is, then send it.
            const embed = new Discord.MessageEmbed()
            .setTitle(`${tags[args[0]-1]} (Tag ${args[0]})`)
            .setDescription(descriptions[args[0]-1])
            .setColor(message.guild.me.displayColor)
            .setFooter(`Requested by ${message.author.tag}`, message.author.avatarURL())
            
            message.channel.send(embed) 
        }
           // Get status of servers through https://api.mcsrvstat.us/
    } else if (command == 'status' && status) {
        // Check if serverNames and serverIps are the same length
        if (serverIps.length != serverNames.length) return message.channel.send('Amount of server names and ips are not the same!')
        let statusMsg = await message.channel.send('Retreiving server status..')
        let descriptions = ''
        // Fetch status for each individual server.
        n = 0
        for (i = 0; i < serverIps.length; i++) {
            var link = 'https://api.mcsrvstat.us/simple/' + serverIps[n]
            await fetch(link).then(function(response) {
                if (response.status == '200') {
                    descriptions = descriptions + (serverNames[n] + ': Online ✅\n')
                } else {
                    descriptions = descriptions + (serverNames[n] + ': Offline ❌\n')
                    }
                    n = n + 1
                })
            
        }
        // Send embed for statuses
        const embed = new Discord.MessageEmbed()
        .setTitle('Minecraft Server Status!')
        .setDescription(descriptions)
        .setColor(message.guild.me.displayColor)
        .setFooter(message.author.tag, message.author.avatarURL())
        .setTimestamp();
        statusMsg.edit(embed)
    } else if (message.content.startsWith(prefix) && !message.member.roles.cache.get(memberRole)) {
        message.delete().catch();
        return;
    }
});
