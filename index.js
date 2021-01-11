const Discord = require('discord.js')
const ms = require('ms')
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

// Setup for auth token & reaction emoji id arrays. Note that everything is using their ids
let authTokens = []
let reactionEmojis = ['780549171089637376', '780549170770870292', '780548158068621355'] // Agree, disagree, neutral

client.login(token)

// Startup, sends a direct message to the Owner that the bot is online, sets activity
client.on('ready', async () => {
    const embed = new Discord.MessageEmbed()
        .setDescription(`${client.user.tag} is online!`);
    let owner = await client.users.fetch('213585513326706690')
    owner.send(embed)
    client.user.setActivity('over Khaos Applications', {
        type: "WATCHING"
    })
    console.log('Bot is up and running!')
});

client.on('message', async message => {

    // Checks if webhook, valid auth token, is from #applications channel, otherwise deletes message. if those are true, then add reactions
    if (message.channel == applicationChannel) {
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

    // Apply command, will generate an authentication token and a prefilled link including it as an answer, wont work if author doesnt have member role
    if (command == 'apply' && message.member.roles.cache.get(memberRole)) {

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
    if (command === 'removetoken' && message.member.hasPermission('MANAGE_GUILD')) {
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
    if (command === 'addtoken' && message.member.hasPermission('MANAGE_GUILD')) {
        //check if they've sent a token with the command, if not return and send a message that they need to input a token
        if (!args[0]) return message.channel.send('You need to input a token!');
        //else push the new token to the authTokens array
        authTokens.push(args[0]);
        //display a massage that the token has been added
        message.guild.channels.cache.get(staffChannel).send(`Added token ${args[0]}`);
    }

    // See list of auth tokens command, user needs to be able to manage servers for this.
    if (command === 'listtoken' && message.member.hasPermission('MANAGE_GUILD')) {
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

    // Poll command, remind me to add multiple choice option to it too, only works with member role
    //POLL NOT COMPLETLY DONE BUT CLEANED UP A LITTLE, WILL CONTINUE TO EDIT
    if (command === 'poll' && message.member.roles.cache.get(memberRole)) {

        // Delete message and check for arguments, setup & check time and create embed for question.
        message.delete().catch();
        //check if second part of command is set and if the first part is a number, tell the user to enter the correct format and delete message after 10 seconds
        if (!args[1]) return message.channel.send(`Please use a valid format! (${prefix}poll [time](in minutes) [Poll question]`).then(msg => {
            msg.delete(10000);
        });
        //set polltime and convert to milliseconds
        let pollTime = ms(args[0]);
        //checks if polltime is longer than 7 days, if so return and send a message
        if (pollTime > 604800000) return message.channel.send('Please select a smaller poll time.');
        //if not create a variable to handle the question
        let pollQuestion = args.slice(1).join(' ');
        const embed = new Discord.MessageEmbed()
            .setTitle(pollQuestion)
            .setColor(0x8DEEEE)
            .setFooter(message.author.username, message.author.avatarURL())
            .setTimestamp();

        // Send poll message and wait for poll reactions
        let poll = await message.guild.channels.cache.get(pollChannel).send(embed);
        await poll.react(reactionEmojis[0]);
        await poll.react(reactionEmojis[1]);
        await poll.react(reactionEmojis[2]);
        //collect reaction and which user
        const collector = poll.createReactionCollector((reaction, user) => reaction.id == reactionEmojis[0] || reaction.id == reactionEmojis[1] || reaction.id == reactionEmojis[2], {
            time: pollTime
        });
        //update when poll ends
        poll.edit(embed.setTitle(pollQuestion + `(Ends in ${args[0]})`));
        collector.on('end', collected => {

            // Filtering the collected reactions to determine the majority's opinion
            let agree = collected.filter(reaction => reaction.emoji.id == reactionEmojis[0]).size;
            let disagree = collected.filter(reaction => reaction.emoji.id == reactionEmojis[1]).size;
            let neutral = collected.filter(reaction => reaction.emoji.id == reactionEmojis[2]).size;
            let winner;

            // Check winner then edit the poll message to announce the outcome.
            if (agree > disagree) {
                winner = 'The majority agrees!';
            } else if (agree < disagree) {
                winner = 'The majority disagrees!';
            } else if (agree == disagree) {
                winner = 'It is a tie!';
            }
            //message to change to
            const editembed = new Discord.MessageEmbed()
                .setTitle(`${pollQuestion} (Over!)`)
                .setColor(0x721111)
                .addField(winner, `${agree}/${disagree + agree} people agrees.`)
                .setDescription(`${agree} people agree, ${disagree} people disagree and ${neutral} passed on this vote.`)
                .setFooter(message.author.username, message.author.avatarURL())
                .setTimestamp();

            //edit current message and remove all reactions
            poll.edit(editembed);
            poll.reactions.removeAll().catch();
        })
    };


    // Promote users to trial or full member command, only user wich can manage roles can use this command.
    if (command === 'promote' && message.member.hasPermission('MANAGE_ROLES')) {
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
    };

    // Inactive command for members to self assign to
    if (command == 'inactive' && message.member.roles.cache.get(fullMemberRole)) {
        message.delete().catch();
        let reason = args;
        //if they haven't specified a reason display this message
        if (!args) reason = 'Member did not specify reason';

        // Check if member doesn't have an inactive role, if they do give them the role.
        if (!(message.member.roles.cache.get(inactiveRole))) {

            //message to be displayed about becoming inactive
            const embed = new Discord.MessageEmbed()
                .setTitle(`${message.author.username} has invoked inactive status!`)
                .setDescription(reason)
                .setAuthor(message.author.tag)
                .setThumbnail(message.author.avatarURL())
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
                .setAuthor(message.author.tag)
                .setThumbnail(message.author.avatarURL())
                .setColor(message.guild.roles.cache.get(fullMemberRole).color)
                .setTimestamp();
            //display the new message about player becoming active again
            message.guild.channels.cache.get(memberChannel).send(embed);
            //remove inactive role
            message.member.roles.remove(inactiveRole);
        }
    };
});
