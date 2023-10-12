import { readFileSync } from 'fs';

import Database from 'better-sqlite3';

import { BraveryMonsters } from './structures/BraveryMonsters.js';
import { FilterList, RandomizerFilter, BraveryFilter, RelicsFilter } from './structures/Filters.js';
import { Game } from './structures/Game.js';
import { GameModeManager } from './structures/GameModeManager.js';

import type { Relic, MapArea, Monster } from './structures/Interfaces.js';

const DEFAULT_LIMIT = 100;

const manager = new GameModeManager();
const db = new Database('seeds.db');

db.pragma('journal_mode = WAL');

export function findGamesByFilter(
    filename: string,
    randomizerMode: boolean,
    braveryMode: boolean,
    relicsMode: boolean,
    limit?: number,
    offset?: number
): Game[] {
    const filters = parseFilters(filename, randomizerMode, braveryMode, relicsMode);
    const statement = generateStatement(
        filters,
        randomizerMode,
        braveryMode,
        relicsMode,
        limit,
        offset
    );
    const rows = db.prepare(statement).all() as Array<Record<string, number>>;
    const games = [];

    for (const row of rows) {
        // Randomizer monster mapping
        const randomizerMonsterMapping = new Map<number, Monster>();

        for (const monster of manager.monsterJournalList) {
            const replacement = manager.monsterJournalList.find(
                (v) => v.id === row[formatName(monster.name)]
            );

            if (replacement === undefined) continue;

            randomizerMonsterMapping.set(monster.id, replacement);
        }

        // Bravery area monster
        const areaMonsters = new Map<MapArea, Monster>();

        for (const area of manager.monsterAreas) {
            const monster = manager.monsterJournalList.find(
                (v) => v.id === row[formatName(area.name)]
            );

            if (monster === undefined) continue;

            areaMonsters.set(area, monster);
        }

        // Relics
        const relics = new Map<number, Relic>();
        const relicAreaChests = [];

        for (const area of manager.monsterAreas) {
            const relic = manager.relics.find((v) => v.id === row[formatName(area.name) + 'Relic']);

            if (relic !== undefined) relics.set(area.id, relic);

            const areaData = manager.areaData.find(
                (v) => v.sceneId === row[formatName(area.name) + 'Scene']
            );

            if (areaData === undefined) continue;

            const areaChest = new Map<string, number>();
            areaChest.set(areaData.sceneName, row[formatName(area.name) + 'Chest']);

            relicAreaChests.push(areaChest);
        }

        const braveryMonsters = new BraveryMonsters(
            manager.monsterJournalList[50],
            manager.monsterJournalList[row.Swimming],
            manager.monsterJournalList[row.Bex],
            manager.monsterJournalList[row.Cryomancer],
            manager.monsterJournalList[row.CryomancerRequired],
            [
                manager.monsterJournalList[row.EndOfTime1],
                manager.monsterJournalList[row.EndOfTime2],
                manager.monsterJournalList[row.EndOfTime3],
            ],
            [
                manager.monsterJournalList[row.Army1],
                manager.monsterJournalList[row.Army2],
                manager.monsterJournalList[row.Army3],
                manager.monsterJournalList[row.Army4],
                manager.monsterJournalList[row.Army5],
                manager.monsterJournalList[row.Army6],
                manager.monsterJournalList[row.Army7],
            ],
            areaMonsters,
            [
                manager.monsterJournalList[row.Familiar],
                manager.monsterJournalList[row.Start1],
                manager.monsterJournalList[row.Start2],
            ]
        );

        const game = new Game(
            row.Seed,
            row.IsRandomizer === 1,
            row.IsBravery === 1,
            true,
            randomizerMonsterMapping,
            braveryMonsters,
            relics,
            relicAreaChests,
            filters.path
        );

        games.push(game);
    }

    return games;
}

function generateStatement(
    filters: FilterList,
    randomizerMode: boolean,
    braveryMode: boolean,
    relicsMode: boolean,
    limit?: number,
    offset?: number
): string {
    let statement =
        'SELECT Game.*' +
        (randomizerMode ? ', RandomizerMapping.*' : '') +
        (braveryMode ? ', BraveryMapping.*' : '') +
        (relicsMode ? ', RelicsMapping.*' : '') +
        '\nFROM Game' +
        (randomizerMode
            ? '\nJOIN RandomizerMapping ON RandomizerMapping.Id = Game.RandomizerMappingId'
            : '') +
        (braveryMode ? '\nJOIN BraveryMapping ON BraveryMapping.Id = Game.BraveryMappingId' : '') +
        (relicsMode ? '\nJOIN RelicsMapping ON RelicsMapping.Id = Game.RelicsMappingId' : '') +
        (randomizerMode
            ? braveryMode
                ? '\nWHERE Game.IsRandomizer AND Game.IsBravery\n'
                : '\nWHERE Game.IsRandomizer AND NOT Game.IsBravery\n'
            : braveryMode
            ? '\nWHERE Game.IsBravery AND NOT Game.IsRandomizer\n'
            : '\nWHERE 1\n');

    // Randomizer mode
    if (filters.randomizer !== undefined) {
        // Monster mapping
        if (filters.randomizer.monsters !== undefined) {
            for (const [monsterId, replacementId] of filters.randomizer.monsters) {
                const monster = manager.monsterJournalList.find((v) => v.id === monsterId);

                if (monster === undefined) continue;

                statement += `AND RandomizerMapping.${formatName(
                    monster.name
                )} = ${replacementId}\n`;
            }
        }

        // Area mapping
        if (filters.randomizer.areas !== undefined) {
            for (const [areaId, wantedIds] of filters.randomizer.areas) {
                const area = manager.monsterAreas.find((v) => v.id === areaId);

                if (area === undefined) continue;

                const areaMonsters = area.monsters
                    .map((v) => manager.monsterJournalList.find((w) => w.id === v))
                    .filter((v) => v !== undefined) as Monster[];

                if (areaMonsters.length < 1) continue;

                // area.monsters.map(v=> manager. )
                for (const wantedId of wantedIds) {
                    statement += 'AND (';

                    for (const areaMonster of areaMonsters) {
                        statement += `RandomizerMapping.${formatName(
                            areaMonster.name
                        )} = ${wantedId} OR `;
                    }

                    statement = statement.substring(0, statement.length - 4);
                    statement += ')\n';
                }
            }
        }
    }

    // Bravery mode
    if (filters.bravery !== undefined) {
        // Available
        if (filters.bravery.available !== undefined) {
            for (const wantedId of filters.bravery.available) {
                statement +=
                    `AND (Familiar = ${wantedId} OR Start1 = ${wantedId} OR Start2 = ${wantedId}` +
                    ` OR Swimming = ${wantedId} OR Bex = ${wantedId} OR Cryomancer = ${wantedId}` +
                    ` OR CryomancerRequired = ${wantedId} OR EndOfTime1 = ${wantedId} OR EndOfTime2 = ${wantedId}` +
                    ` OR EndOfTime3 = ${wantedId} OR Army1 = ${wantedId} OR Army2 = ${wantedId} OR Army3 = ${wantedId}` +
                    ` OR Army4 = ${wantedId} OR Army5 = ${wantedId} OR Army6 = ${wantedId} OR Army7 = ${wantedId}` +
                    ` OR BraveryMapping.MountainPath = ${wantedId} OR BraveryMapping.BlueCaves = ${wantedId}` +
                    ` OR BraveryMapping.StrongholdDungeon = ${wantedId} OR BraveryMapping.AncientWoods = ${wantedId}` +
                    ` OR BraveryMapping.SnowyPeaks = ${wantedId} OR BraveryMapping.SunPalace = ${wantedId}` +
                    ` OR BraveryMapping.HorizonBeach = ${wantedId} OR BraveryMapping.MagmaChamber = ${wantedId}` +
                    ` OR BraveryMapping.MysticalWorkshop = ${wantedId} OR BraveryMapping.Underworld = ${wantedId}` +
                    ` OR BraveryMapping.AbandonedTower = ${wantedId} OR BraveryMapping.BlobBurg = ${wantedId}` +
                    ` OR BraveryMapping.ForgottenWorld = ${wantedId})\n`;
            }
        }

        // Familiar
        if (filters.bravery.familiar !== undefined) {
            statement += `AND Familiar = ${filters.bravery.familiar}\n`;
        }

        // Start monsters
        if (filters.bravery.start !== undefined) {
            for (const monsterId of filters.bravery.start) {
                statement += `AND (Start1 = ${monsterId} OR Start2 = ${monsterId})\n`;
            }
        }

        // Swimming monster
        if (filters.bravery.swimming !== undefined) {
            statement += `AND Swimming = ${filters.bravery.swimming}\n`;
        }

        // Bex monster
        if (filters.bravery.bex !== undefined) {
            statement += `AND Bex = ${filters.bravery.bex}\n`;
        }

        // Cryomancer monster
        if (filters.bravery.cryomancer !== undefined) {
            statement += `AND Cryomancer = ${filters.bravery.cryomancer}\n`;
        }

        // Cryomancer required monster
        if (filters.bravery.cryomancerRequired !== undefined) {
            statement += `AND CryomancerRequired = ${filters.bravery.cryomancerRequired}\n`;
        }

        // End of time monsters
        if (filters.bravery.endOfTime !== undefined) {
            for (const monsterId of filters.bravery.endOfTime) {
                statement += `AND (EndOfTime1 = ${monsterId} OR EndOfTime2 = ${monsterId} OR EndOfTime3 = ${monsterId})\n`;
            }
        }

        // Army monsters
        if (filters.bravery.army !== undefined) {
            for (const monsterId of filters.bravery.army) {
                statement +=
                    `AND (Army1 = ${monsterId} OR Army2 = ${monsterId} OR Army3 = ${monsterId}` +
                    ` OR Army4 = ${monsterId} OR Army5 = ${monsterId} OR Army6 = ${monsterId} OR Army7 = ${monsterId})\n`;
            }
        }

        // Area mapping
        if (filters.bravery.areas !== undefined) {
            for (const [areaId, monsterId] of filters.bravery.areas) {
                const area = manager.monsterAreas.find((v) => v.id === areaId);

                if (area === undefined) continue;

                statement += `AND BraveryMapping.${formatName(area.name)} = ${monsterId}\n`;
            }
        }
    }

    // Relics mode
    if (filters.relics !== undefined) {
        // Available
        if (filters.relics.available !== undefined) {
            for (const relicId of filters.relics.available) {
                statement += 'AND (';

                for (const area of manager.monsterAreas) {
                    statement += `${formatName(area.name)}Relic = ${relicId} OR `;
                }

                statement = statement.substring(0, statement.length - 4);
                statement += ')\n';
            }
        }

        // Area mapping
        if (filters.relics.areas !== undefined) {
            for (const [areaId, relicId] of filters.relics.areas) {
                const area = manager.monsterAreas.find((v) => v.id === areaId);

                if (area === undefined) continue;

                statement += `AND ${formatName(area.name)}Relic = ${relicId}\n`;
            }
        }
    }

    statement += `LIMIT ${limit ?? DEFAULT_LIMIT}`;
    if (offset !== undefined) statement += ` OFFSET ${offset}`;

    return statement;
}

export function parseFilters(
    path: string,
    randomizerMode: boolean,
    braveryMode: boolean,
    relicsMode: boolean
): FilterList {
    const read = readFileSync(path).toString();
    const json = JSON.parse(read);

    const filterList = new FilterList();

    if (randomizerMode) filterList.randomizer = parseRandomizerFilter(json);
    if (braveryMode) filterList.bravery = parseBraveryFilter(json);
    if (relicsMode) filterList.relics = parseRelicsFilter(json);
    filterList.path = path;

    return filterList;
}

function parseRandomizerFilter(json: any): RandomizerFilter {
    const randomizerFilter = new RandomizerFilter();

    if (json.Randomizer === undefined) return randomizerFilter;

    // Randomizer monster mapping
    if (json.Randomizer.Monsters !== undefined) {
        randomizerFilter.monsters = new Map<number, number>();

        for (const monsterName in json.Randomizer.Monsters) {
            const replacementName = json.Randomizer.Monsters[monsterName];
            const monster = manager.monsterJournalList.find(
                (v) => parseName(v.name) === parseName(monsterName)
            );
            const replacement = manager.monsterJournalList.find(
                (v) => parseName(v.name) === parseName(replacementName)
            );

            if (monster !== undefined && replacement !== undefined)
                randomizerFilter.monsters.set(monster.id, replacement.id);
        }
    }

    // Randomizer area mapping
    if (json.Randomizer.Areas !== undefined) {
        randomizerFilter.areas = new Map<number, number[]>();

        for (const areaName in json.Randomizer.Areas) {
            let monsterList = json.Randomizer.Areas[areaName] as string[] | undefined;
            const area = manager.monsterAreas.find(
                (v) => parseName(v.name) === parseName(areaName)
            );

            if (area === undefined || monsterList === undefined) continue;

            const areaMonsters = [];
            monsterList = monsterList.map((v) => parseName(v));

            for (const monsterName of monsterList) {
                const monster = manager.monsterJournalList.find(
                    (v) => parseName(v.name) === monsterName
                );

                if (monster !== undefined && monsterList.includes(parseName(monster.name)))
                    areaMonsters.push(monster.id);
            }

            if (areaMonsters.length > 0) randomizerFilter.areas.set(area.id, areaMonsters);
        }
    }

    return randomizerFilter;
}

function parseBraveryFilter(json: any): BraveryFilter {
    const braveryFilter = new BraveryFilter();

    if (json.Bravery === undefined) return braveryFilter;

    // Available monsters
    if (json.Bravery.Available !== undefined) {
        braveryFilter.available = [];

        for (const monsterName of json.Bravery.Available) {
            const monster = manager.monsterJournalList.find(
                (v) => parseName(v.name) === parseName(monsterName)
            );
            if (monster !== undefined) braveryFilter.available.push(monster.id);
        }
    }

    // Familiar
    if (json.Bravery.Familiar !== undefined) {
        const monster = manager.monsterJournalList.find(
            (v) => parseName(v.name) === parseName(json.Bravery.Familiar)
        );
        if (monster !== undefined) braveryFilter.familiar = monster.id;
    }

    // Start monsters
    if (json.Bravery.Start !== undefined) {
        braveryFilter.start = [];

        for (const monsterName of json.Bravery.Start) {
            const monster = manager.monsterJournalList.find(
                (v) => parseName(v.name) === parseName(monsterName)
            );
            if (monster !== undefined) braveryFilter.start.push(monster.id);
        }
    }

    // Swimming monster
    if (json.Bravery.Swimming !== undefined) {
        const monster = manager.monsterJournalList.find(
            (v) => parseName(v.name) === parseName(json.Bravery.Swimming)
        );
        if (monster !== undefined) braveryFilter.swimming = monster.id;
    }

    // Bex monster
    if (json.Bravery.Bex !== undefined) {
        const monster = manager.monsterJournalList.find(
            (v) => parseName(v.name) === parseName(json.Bravery.Bex)
        );
        if (monster !== undefined) braveryFilter.bex = monster.id;
    }

    // Cryomancer monster
    if (json.Bravery.Cryomancer !== undefined) {
        const monster = manager.monsterJournalList.find(
            (v) => parseName(v.name) === parseName(json.Bravery.Cryomancer)
        );
        if (monster !== undefined) braveryFilter.cryomancer = monster.id;
    }

    // Cryomancer required monster
    if (json.Bravery['Cryomancer Required'] !== undefined) {
        const monster = manager.monsterJournalList.find(
            (v) => parseName(v.name) === parseName(json.Bravery['Cryomancer Required'])
        );
        if (monster !== undefined) braveryFilter.cryomancerRequired = monster.id;
    }

    // End of time monsters
    if (json.Bravery['End of Time'] !== undefined) {
        braveryFilter.endOfTime = [];

        for (const monsterName of json.Bravery['End of Time']) {
            const monster = manager.monsterJournalList.find(
                (v) => parseName(v.name) === parseName(monsterName)
            );
            if (monster !== undefined) braveryFilter.endOfTime.push(monster.id);
        }
    }

    // Army monsters
    if (json.Bravery['Monster Army'] !== undefined) {
        braveryFilter.army = [];

        for (const monsterName of json.Bravery['Monster Army']) {
            const monster = manager.monsterJournalList.find(
                (v) => parseName(v.name) === parseName(monsterName)
            );
            if (monster !== undefined) braveryFilter.army.push(monster.id);
        }
    }

    // Bravery area mapping
    if (json.Bravery.Areas !== undefined) {
        braveryFilter.areas = new Map<number, number>();

        for (const areaName in json.Bravery.Areas) {
            const monsterName = json.Bravery.Areas[areaName];
            const monster = manager.monsterJournalList.find(
                (v) => parseName(v.name) === parseName(monsterName)
            );
            const area = manager.monsterAreas.find(
                (v) => parseName(v.name) === parseName(areaName)
            );

            if (area !== undefined && monster !== undefined)
                braveryFilter.areas.set(area.id, monster.id);
        }
    }

    return braveryFilter;
}

function parseRelicsFilter(json: any): RelicsFilter {
    const relicsFilter = new RelicsFilter();

    if (json.Relics === undefined) return relicsFilter;

    // Available relics
    if (json.Relics.Available !== undefined) {
        relicsFilter.available = [];

        for (const relicName of json.Relics.Available) {
            const relic = manager.relics.find((v) => parseName(v.name) === parseName(relicName));
            if (relic !== undefined) relicsFilter.available.push(relic.id);
        }
    }

    // Relics area mapping
    if (json.Bravery.Areas !== undefined) {
        relicsFilter.areas = new Map<number, number>();

        for (const areaName in json.Relics.Areas) {
            const relicName = json.Relics.Areas[areaName];
            const relic = manager.relics.find((v) => parseName(v.name) === parseName(relicName));
            const area = manager.monsterAreas.find(
                (v) => parseName(v.name) === parseName(areaName)
            );

            if (area !== undefined && relic !== undefined)
                relicsFilter.areas.set(area.id, relic.id);
        }
    }

    return relicsFilter;
}

function parseName(name: string): string {
    return name.toLowerCase().replaceAll(' ', '').replaceAll("'", '');
}

function formatName(name: string): string {
    return name.replaceAll(' ', '').replaceAll("'", '');
}
