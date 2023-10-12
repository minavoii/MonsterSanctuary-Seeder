import { findGamesByFilter } from './FindSeed.js';
import { generateAllSeeds } from './GenerateAllSeeds.js';
import { GameModeManager } from './structures/GameModeManager.js';

const manager = new GameModeManager();

main();

function main(): void {
    if (process.argv.length > 2) {
        const command = process.argv[2];
        const map = parseArgs(process.argv.slice(3));

        const randomizerMode = map.has('randomizer');
        const braveryMode = map.has('bravery');
        const relicsMode = map.has('relics');
        const seed = map.has('seed') ? Number(map.get('seed')) : undefined;
        const filter = map.get('filter') as string;

        // Check seed
        if (command === 'check') {
            if (seed === undefined) return;
            if (!randomizerMode && !braveryMode && !relicsMode) return;

            const game = manager.generateGame(randomizerMode, braveryMode, relicsMode, seed);

            if (game === undefined) throw new Error('Could not generated game.');

            game.exportToText();
            console.log(`Saved as ./seeds/${game.seed}.txt`);
        }

        // Find a specific seed
        else if (command === 'find') {
            if (filter === undefined) return;
            if (!randomizerMode && !braveryMode) return;

            let path = filter.includes('/filters/') ? filter : './filters/' + filter;
            path = path.endsWith('.json') ? path : path + '.json';

            const games = findGamesByFilter(path, randomizerMode, braveryMode, relicsMode);

            for (const game of games) {
                console.log('Found seed:', game.seed);
                game.exportToText();
            }

            if (games.length > 0)
                console.log(
                    `All seeds saved to ./seeds/${path
                        .replace('./filters/', '')
                        .replace('.json', '')}/`
                );
            else console.log('No seed found');
        }

        // Generate x random seeds
        else if (command === 'random') {
            const amount = map.has('amount') ? Number(map.get('amount')) : 10;

            for (let i = 0; i < amount; i++) {
                const game = manager.generateGame(randomizerMode, braveryMode, relicsMode);

                if (game !== undefined) game.exportToText();
            }

            console.log(`Exported ${amount} random seeds to ./seeds.`);
        }

        // Generate ALL seeds and populate the database
        else if (command === 'create-database') {
            console.warn('This is a slow process and should only be needed to run once.');
            generateAllSeeds();
        }
    }
}

function parseArgs(args: string[]): Map<string, string | boolean> {
    const map = new Map<string, string | boolean>();

    for (let i = 0; i < args.length; i++) {
        const currentArg = args[i];
        const nextArg = i + 1 < args.length ? args[i + 1] : undefined;

        if (currentArg.startsWith('--')) {
            if (nextArg !== undefined && !nextArg.startsWith('--')) {
                map.set(currentArg.substring(2), nextArg);
                i++;
            } else map.set(currentArg.substring(2), true);
        }
    }

    return map;
}
