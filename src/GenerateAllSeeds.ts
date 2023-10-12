import { readFileSync, writeFileSync } from 'fs';

import Database from 'better-sqlite3';

import { GameModeManager } from './structures/GameModeManager.js';

import type { Game } from './structures/Game.js';
import type { MapArea, AreaData, Relic } from './structures/Interfaces.js';

const STEP = 1000;
const UNRANDOMIZED_MONSTERS = [0, 1, 2, 3, 110];
const TABLES = [
    'MonsterType',
    'ExploreAction',
    'Relic',
    'Monster',
    'Area',
    'AreaData',
    'RandomizerMapping',
    'BraveryMapping',
    'RelicsMapping',
    'Game',
];

const manager = new GameModeManager();
const db = new Database('seeds.db');

db.pragma('journal_mode = WAL');

export function generateAllSeeds(): void {
    writeFileSync('./seeds/bad_seeds.txt', '');

    createTables();
    clearTables();
    populateTables();

    const insertGame = db.prepare(
        'INSERT INTO Game (Seed, IsRandomizer, IsBravery, RandomizerMappingId, BraveryMappingId, RelicsMappingId) ' +
            'VALUES (@seed, @isRandomizer, @isBravery, @randomizerMappingId, @braveryMappingId, @relicsMappingId)'
    );

    const insertRandomizer = db.prepare(getRandomizerStatement());
    const insertBravery = db.prepare(getBraveryStatement());
    const insertRelics = db.prepare(getRelicsStatement());

    // Generate and insert 1000 by 1000
    for (let seed = 0; seed < 1000000; seed += STEP) {
        const gameList = getNextGames(seed);
        console.log(gameList[0].seed, '->', gameList[gameList.length - 1].seed);

        // We want the Randomizer + Bravery rows to have both mapping IDs
        let lastRandomizerRowId: number | bigint = 0;

        const insertMany = db.transaction((gameList: Game[]) => {
            for (const game of gameList) {
                let randomizerMappingId: number | bigint | undefined;
                let braveryMappingId: number | bigint | undefined;

                // Randomizer mapping is the same with or without Bravery mode
                if (game.isRandomizer) {
                    if (!game.isBravery) {
                        randomizerMappingId = insertRandomizer.run(
                            formatRandomizerMapping(game)
                        ).lastInsertRowid;
                        lastRandomizerRowId = randomizerMappingId;
                    } else randomizerMappingId = lastRandomizerRowId;
                }

                // Bravery mapping is different if Randomizer mode is enabled
                if (game.isBravery)
                    braveryMappingId = insertBravery.run(
                        formatBraveryMapping(game)
                    ).lastInsertRowid;

                // relics are generated at the end, so they'll always be different
                const relicsMappingId = insertRelics.run(formatRelicsMapping(game)).lastInsertRowid;
                insertGame.run(
                    formatGameData(game, randomizerMappingId, braveryMappingId, relicsMappingId)
                );
            }
        });

        insertMany(gameList);
    }
}

function createTables(): void {
    db.transaction(() => {
        for (const table of TABLES) {
            const statement = readFileSync(`./data/tables/${table}.sql`).toString();
            db.prepare(statement).run();
        }
    }).default();
}

function clearTables(): void {
    db.transaction(() => {
        for (const table of TABLES.slice().reverse()) {
            db.prepare(`DELETE FROM ${table}`).run();
        }
    }).default();
}

function populateTables(): void {
    populateTableMonsterType();
    populateTableExploreAction();
    populateTableRelic();
    populateTableMonster();
    populateTableArea();
    populateTableAreaData();
}

function populateTableMonsterType(): void {
    const statement = 'INSERT INTO MonsterType (Id, Name) VALUES (@id, @name)';

    db.transaction(() => {
        for (const monsterType of manager.monsterTypes) {
            db.prepare(statement).run(monsterType);
        }
    }).default();
}

function populateTableExploreAction(): void {
    const statement = 'INSERT INTO ExploreAction (Id, Name) VALUES (@id, @name)';

    db.transaction(() => {
        for (const exploreAction of manager.exploreActions) {
            db.prepare(statement).run(exploreAction);
        }
    }).default();
}

function populateTableRelic(): void {
    const statement =
        'INSERT INTO Relic (Id, Name, MonsterTypeRestriction) ' +
        'VALUES (@id, @name, @monsterTypeRestriction)';

    db.transaction(() => {
        for (const relic of manager.relics) {
            db.prepare(statement).run(relic);
        }
    }).default();
}

function populateTableMonster(): void {
    const statement =
        'INSERT INTO Monster (Id, Name, ExploreAction, MonsterTypes) ' +
        'VALUES (@id, @name, @exploreAction, @monsterTypes)';

    db.transaction(() => {
        for (const monster of manager.monsterJournalList) {
            db.prepare(statement).run({
                id: monster.id,
                name: monster.name,
                exploreAction: monster.exploreAction,
                monsterTypes: JSON.stringify(monster.monsterTypes),
            });
        }
    }).default();
}

function populateTableArea(): void {
    const statement =
        'INSERT INTO Area (Id, Name, Monsters, RandomizerCheckList) ' +
        'VALUES (@id, @name, @monsters, @randomizerCheckList)';

    db.transaction(() => {
        // Area
        for (const area of manager.monsterAreas) {
            db.prepare(statement).run({
                id: area.id,
                name: area.name,
                monsters: JSON.stringify(area.monsters),
                randomizerCheckList: JSON.stringify(area.randomizerCheckList),
            });
        }
    }).default();
}

function populateTableAreaData(): void {
    const statement =
        'INSERT INTO AreaData (AreaId, SceneId, SceneName, ChestList) ' +
        'VALUES (@areaId, @sceneId, @sceneName, @chests)';

    db.transaction(() => {
        for (const areaData of manager.areaData) {
            db.prepare(statement).run({
                areaId: areaData.areaId,
                sceneId: areaData.sceneId,
                sceneName: areaData.sceneName,
                chests: JSON.stringify(areaData.chests),
            });
        }
    }).default();
}

function getRandomizerStatement(): string {
    let statement = 'INSERT INTO RandomizerMapping (';

    for (const monster of manager.monsterJournalList) {
        if (!UNRANDOMIZED_MONSTERS.includes(monster.id))
            statement += `${monster.name.replaceAll(' ', '').replaceAll("'", '')},`;
    }

    // Trailing comma
    statement = statement.substring(0, statement.length - 1);
    statement += ') VALUES (';

    for (const monster of manager.monsterJournalList) {
        if (!UNRANDOMIZED_MONSTERS.includes(monster.id))
            statement += `@${monster.name.replaceAll(' ', '').replaceAll("'", '')},`;
    }

    // Trailing comma
    statement = statement.substring(0, statement.length - 1);
    statement += ')';

    return statement;
}

function getBraveryStatement(): string {
    let statement =
        'INSERT INTO BraveryMapping (Familiar, Start1, Start2, Swimming, Bex, Cryomancer, CryomancerRequired, ' +
        'EndOfTime1, EndOfTime2, EndOfTime3, Army1, Army2, Army3, Army4, Army5, Army6, Army7, ';

    for (const area of manager.monsterAreas) {
        statement += `${area.name.replaceAll(' ', '')},`;
    }

    // Trailing comma
    statement = statement.substring(0, statement.length - 1);
    statement +=
        ') VALUES (@familiar, @start1, @start2, @swimming, @bex, @cryomancer, @cryomancerRequired, ' +
        '@endOfTime1, @endOfTime2, @endOfTime3, @army1, @army2, @army3, @army4, @army5, @army6, @army7, ';

    for (const area of manager.monsterAreas) {
        statement += `@${area.name.replaceAll(' ', '')},`;
    }

    // Trailing comma
    statement = statement.substring(0, statement.length - 1);
    statement += ')';

    return statement;
}

function getRelicsStatement(): string {
    let statement = 'INSERT INTO RelicsMapping (';

    for (const area of manager.monsterAreas) {
        const areaName = area.name.replaceAll(' ', '');

        statement += `${areaName}Relic,`;
        statement += `${areaName}Scene,`;
        statement += `${areaName}Chest,`;
    }

    // Trailing comma
    statement = statement.substring(0, statement.length - 1);
    statement += ') VALUES (';

    for (const area of manager.monsterAreas) {
        const areaName = area.name.replaceAll(' ', '');

        statement += `@${areaName}Relic,`;
        statement += `@${areaName}Scene,`;
        statement += `@${areaName}Chest,`;
    }

    // Trailing comma
    statement = statement.substring(0, statement.length - 1);
    statement += ')';

    return statement;
}

function formatRandomizerMapping(game: Game): object {
    const obj: any = {};

    if (game.randomizerMonsterMapping !== undefined) {
        for (const [monsterId, replacement] of game.randomizerMonsterMapping) {
            const monster = manager.monsterJournalList[monsterId];
            obj[monster.name.replaceAll(' ', '').replaceAll("'", '')] = replacement.id;
        }
    } else {
        for (const monster of manager.monsterJournalList) {
            if (!UNRANDOMIZED_MONSTERS.includes(monster.id))
                obj[monster.name.replaceAll(' ', '').replaceAll("'", '')] = undefined;
        }
    }

    return obj;
}

function formatBraveryMapping(game: Game): object {
    const obj: any = {};

    if (game.braveryMonsters !== undefined) {
        obj.familiar = game.braveryMonsters.startMonsters[0].id;
        obj.start1 = game.braveryMonsters.startMonsters[1].id;
        obj.start2 = game.braveryMonsters.startMonsters[2].id;
        obj.swimming = game.braveryMonsters.swimmingMonster.id;
        obj.bex = game.braveryMonsters.bex.id;
        obj.cryomancer = game.braveryMonsters.cryomancer.id;
        obj.cryomancerRequired = game.braveryMonsters.cryomancerRequired.id;
        obj.endOfTime1 = game.braveryMonsters.endOfTime[0].id;
        obj.endOfTime2 = game.braveryMonsters.endOfTime[1].id;
        obj.endOfTime3 = game.braveryMonsters.endOfTime[2].id;
        obj.army1 = game.braveryMonsters.army[0]?.id;
        obj.army2 = game.braveryMonsters.army[1]?.id;
        obj.army3 = game.braveryMonsters.army[2]?.id;
        obj.army4 = game.braveryMonsters.army[3]?.id;
        obj.army5 = game.braveryMonsters.army[4]?.id;
        obj.army6 = game.braveryMonsters.army[5]?.id;
        obj.army7 = game.braveryMonsters.army[6]?.id;

        for (const [area, monster] of game.braveryMonsters.areaMonsters) {
            obj[area.name.replaceAll(' ', '')] = monster.id;
        }
    }

    return obj;
}

function formatRelicsMapping(game: Game): object {
    const obj: any = {};

    if (game.relics !== undefined && game.relicAreaChests !== undefined) {
        for (const areaChest of game.relicAreaChests) {
            const [sceneName, chestId] = areaChest.entries().next().value;
            const areaData = manager.areaData.find((v) => v.sceneName === sceneName) as AreaData;
            const area = manager.monsterAreas.find((v) =>
                v.areaData.includes(areaData.sceneId)
            ) as MapArea;
            const relic = game.relics.get(area.id) as Relic;

            const areaName = area.name.replaceAll(' ', '');

            obj[`${areaName}Relic`] = relic.id;
            obj[`${areaName}Scene`] = areaData.sceneId;
            obj[`${areaName}Chest`] = chestId;
        }
    }

    return obj;
}

function formatGameData(
    game: Game,
    randomizerMappingId: number | bigint | undefined,
    braveryMappingId: number | bigint | undefined,
    relicsMappingId: number | bigint | undefined
): object {
    const obj: any = {
        seed: game.seed,
        isRandomizer: game.isRandomizer ? 1 : 0,
        isBravery: game.isBravery ? 1 : 0,
        randomizerMappingId,
        braveryMappingId,
        relicsMappingId,
    };

    return obj;
}

function getNextGames(seed: number): Game[] {
    const gameList = [];

    for (let i = 0; i < STEP; i++, seed++) {
        // Without relics
        const gameRandom = manager.generateGame(true, false, true, seed);
        const gameBravery = manager.generateGame(false, true, true, seed);
        const gameBoth = manager.generateGame(true, true, true, seed);

        if (gameRandom !== undefined) gameList.push(gameRandom);
        if (gameBravery !== undefined) gameList.push(gameBravery);
        if (gameBoth !== undefined) gameList.push(gameBoth);
    }

    return gameList;
}
