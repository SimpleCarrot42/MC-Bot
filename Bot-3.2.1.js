const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const GoalBlock = goals.GoalBlock;
const GoalFollow = goals.GoalFollow;
const defaultPlayer = 'Your name';

const bot = mineflayer.createBot({
    host: 'Serevr IP',  // Replace with your server address
    port: 25565,
    username: 'Bot name' // You can replace with a custom bot username
});

bot.loadPlugin(pathfinder);

// Function to locate ores dynamically
function locateOre(oreNames) {
    if (!bot.version) {
        bot.chat("Bot is not ready yet!");
        return;
    }

    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    movements.scaffoldingBlocks = [];
    bot.pathfinder.setMovements(movements);

    console.log(`Looking for ores: ${oreNames.join(', ')}...`);

    const oreBlocks = oreNames.map(name => mcData.blocksByName[name.toLowerCase()]).filter(Boolean);

    if (oreBlocks.length === 0) {
        bot.chat("I don't know about these ores!");
        return;
    }

    const oreBlock = bot.findBlock({
        matching: oreBlocks.map(ore => ore.id),
        maxDistance: 64
    });

    if (!oreBlock) {
        bot.chat("I can't see any of the specified ores!");
        return;
    }

    const { x, y, z } = oreBlock.position;
    bot.chat(`Found ore at (${x}, ${y}, ${z})! Moving there now.`);

    bot.pathfinder.setGoal(new GoalBlock(x, y + 1, z));
}

// Function to follow a player
function followPlayer(playerName) {
    const player = bot.players[playerName];
    if (!player || !player.entity) {
        bot.chat(`I can't see the player ${playerName}!`);
        return;
    }

    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    movements.scaffoldingBlocks = [];
    bot.pathfinder.setMovements(movements);

    bot.pathfinder.setGoal(new GoalFollow(player.entity, 1), true);
}

// Function to drop loot safely
async function dropLoot(itemName) {
    const dangerousBlocks = ['lava', 'water'];
    const blockBelow = bot.blockAt(bot.entity.position.offset(0, -1, 0));

    if (blockBelow && dangerousBlocks.includes(blockBelow.name)) {
        bot.chat("I can't drop items here, it's too dangerous!");
        return;
    }

    const items = bot.inventory.items().filter(i => i.name.includes(itemName.toLowerCase()));
    if (items.length === 0) {
        bot.chat(`I don't have any ${itemName} to drop!`);
        return;
    }

    for (const item of items) {
        bot.chat(`Dropping ${item.count} ${item.name}`);
        await bot.tossStack(item);
    }
}

// Function to guard an area
function guardArea(x, y, z) {
    bot.chat(`Guarding area at (${x}, ${y}, ${z})`);

    setInterval(() => {
        const entity = bot.nearestEntity(entity => entity.type === 'mob');
        if (entity) {
            bot.chat(`Enemy detected! Attacking ${entity.name}`);
            if (bot.entity.position.distanceTo(entity.position) < 10) {
                bot.attack(entity);
            }
        }
    }, 2000);

    bot.pathfinder.setGoal(new GoalBlock(x, y, z));
}

// Function to raid all mobs around the player
function raidAll(playerName) {
    const player = bot.players[playerName];
    if (!player || !player.entity) {
        bot.chat(`I can't see the player ${playerName}!`);
        return;
    }

    bot.chat(`Raiding all mobs around ${playerName}!`);

    // Follow the player
    followPlayer(playerName);

    // Attack all mobs around the bot
    setInterval(() => {
        const mob = bot.nearestEntity(entity => entity.type === 'mob');
        if (mob) {
            bot.chat(`Attacking mob: ${mob.name}`);
            bot.attack(mob);
        }
    }, 1000); // Attack every second
}

// Function to destroy all entities around the bot
function destroyAll() {
    bot.chat('Destroying all entities around me!');

    // Attack all mobs and blocks around the bot
    setInterval(() => {
        const mob = bot.nearestEntity(entity => entity.type === 'mob');
        if (mob) {
            bot.chat(`Destroying mob: ${mob.name}`);
            bot.attack(mob);
        }

        // Destroy nearby blocks (if necessary)
        const block = bot.blockAt(bot.entity.position.offset(0, -1, 0)); // Example: check for blocks below
        if (block) {
            bot.chat(`Destroying block: ${block.name}`);
            bot.dig(block);
        }
    }, 1000); // Destroy every second
}

// Listen for chat commands
bot.on('chat', (username, message) => {
    if (username === bot.username) return; // Ignore the bot's own messages

    if (message.startsWith('find ')) {
        const ores = message.split(' ').slice(1);
        if (ores.length > 0) {
            locateOre(ores);
        } else {
            bot.chat('Please specify at least one ore to find.');
        }
    }

    if (message.startsWith('follow ')) {
        const playerName = message.split(' ')[1];
        if (playerName) {
            followPlayer(playerName);
        } else {
            bot.chat('Please specify a player to follow.');
        }
    }

    if (message === 'follow me') {
        followPlayer(username);
    }

    if (message.startsWith('drop ')) {
        const itemName = message.split(' ')[1];
        if (itemName) {
            dropLoot(itemName);
        } else {
            bot.chat('Please specify an item to drop.');
        }
    }

    if (message.startsWith('guard ')) {
        const args = message.split(' ');
        if (args.length === 4) {
            const x = parseInt(args[1]);
            const y = parseInt(args[2]);
            const z = parseInt(args[3]);
            if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
                guardArea(x, y, z);
            } else {
                bot.chat('Invalid coordinates for guarding.');
            }
        } else {
            bot.chat('Usage: guard <x> <y> <z>');
        }
    }

    if (message.startsWith('raid all')) {
        raidAll(username); // Raid all mobs when player triggers the command
    }

    if (message.startsWith('destroy all')) {
        destroyAll(); // Destroy all entities when triggered
    }
});

bot.on('spawn', () => {
    bot.chat('I have spawned and I am ready to find ores, follow players, drop loot safely, guard areas, raid mobs, and destroy all entities!');
});
