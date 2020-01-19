const Discord = require('discord.js');
const {
  prefix,
  token,
} = require('./config.json');
const ytdl = require('ytdl-core');

const client = new Discord.Client();

const queue = new Map();


//f Listeneers that Log when they get executed
client.once('ready', () => {
  console.log('Ready!');
});

client.once('reconnecting', () => {
  console.log('Reconnecting!');
});

client.once('disconnect', () => {
  console.log('Disconnect!');
});


// Reading Messages and Responding
//Listener on message Event--> save into message when triggered
client.on('message', async message => {
  // Ignore message if it is from client
  if (message.author.bot) return;
  // Ignore messages that don't start with bot prefix
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);

  // Check for Commands
  if (message.content.startsWith(`${prefix}p`)) {
    message.channel.send(`ZERODEV-MUSICBOT playing: ${message.content}`)
    execute(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}sk`)) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}s`)) {
    stop(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}help`)) {
    //profiding help messages
    let commands = [
      `To play a song: **&p URL**`,
      `To skip a song: **&sk**`,
      `To stop zerodev-musicbot: **&s**`,
    ]

    message.channel.send(commands)

  } else {
    message.channel.send(`You entered: ${message.content} Please use a valid command.`)
  }
});

const execute = async (message, serverQueue) => {
  const args = message.content.split(' ');

  const voiceChannel = message.member.voiceChannel;
  if (!voiceChannel) return message.channel.send('You need to be in a voice channel to play music!');
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
    return message.channel.send('I need the permissions to join and speak in your voice channel!');
  }

  const songInfo = await ytdl.getInfo(args[1]);
  const song = {
    title: songInfo.title,
    url: songInfo.video_url,
  };

  if (!serverQueue) {
    const queueContruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };

    queue.set(message.guild.id, queueContruct);

    queueContruct.songs.push(song);

    try {
      var connection = await voiceChannel.join();
      queueContruct.connection = connection;
      play(message.guild, queueContruct.songs[0]);
    } catch (err) {
      console.log(err);
      queue.delete(message.guild.id);
      return message.channel.send(err);
    }
  } else {
    serverQueue.songs.push(song);
    console.log(serverQueue.songs);
    return message.channel.send(`${song.title} has been added to the queue!`);
  }

}

const skip = (message, serverQueue) => {
  if (!message.member.voiceChannel) return message.channel.send('You must be in a Voice Channel');
  if (!serverQueue) return message.channel.send('You must be in a Voice Channel');
  serverQueue.connection.dispatcher.end();
}

const stop = (message, serverQueue) => {
  if (!message.member.voiceChannel) return message.channel.send('You must be in a Voice Channel');
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}

const play = (guild, song) => {
  const serverQueue = queue.get(guild.id);

  if (!song) {
    serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }

  const dispatcher = serverQueue.connection.playStream(ytdl(song.url))
    .on('end', () => {
      console.log('Music has reached the End');
      // Deleted played Song from musicqueue
      serverQueue.songs.shift();
      // Calls play again with next Song from musicqueue
      play(guild, serverQueue.songs[0]);
    })
    .on('error', error => {
      console.error(error);
    });
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
}

client.login(token);