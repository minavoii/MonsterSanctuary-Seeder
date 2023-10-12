# Monster Sanctuary Seeder

A seed finder and generator for [Monster Sanctuary](https://store.steampowered.com/app/814370/Monster_Sanctuary/) made in TypeScript with Node.js.

## About the game

Creating a new game generates a seed used to randomize the contents of the Bravery, Randomizer, and Relics of Chaos game modes.  
Seeds are numeric only and range from 1 to 6 digits, which means there's a total of 1 million possible seeds for a single game mode.  
In total, there are 4 million possible seeds: Bravery; Randomizer; both; neither.

Note that Relics of Chaos items are generated after the two other game modes, so enabling it does not affect their outputs.  
This tool excludes seeds with only Relics of Chaos enabled, bringing the total to 3 million seeds.

## How this works

As finding seeds would require a lot of time, this first generates all 3 million possible seeds.  
Their results are stored in a `seeds.db` file, which we then query to find specific (or random) seeds.

Note: you can also find a pre-generated `seeds.db` file in the [releases tab](https://github.com/minavoii/MonsterSanctuary-Seeder/releases).

## Usage

You can find batch scripts in the `./scripts` folder, or you can use the command line.  
Copy `template.json` from the `./filters` folder, and edit it to your will.

To check a specific seed:  
`node . check --seed xxxxxx [--randomizer] [--bravery] [--relics]`

To find seeds using a filter:  
`node . find --filter template.json [--randomizer] [--bravery] [--relics]`

To find random seeds:  
`node . random --amount 10`

To generate all seeds (this takes a while!):  
`node . create-database`
