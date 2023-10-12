import { existsSync, mkdirSync, writeFileSync } from 'fs';

import { GameModeManager } from './GameModeManager.js';

import type { BraveryMonsters } from './BraveryMonsters.js';
import type { Relic, Monster, MapArea } from './Interfaces.js';

export class Game {
    readonly seed: number;
    readonly isRandomizer: boolean;
    readonly isBravery: boolean;
    readonly isRelic: boolean;
    filterPath: string | undefined;

    // init those in their respective conditions in generateGame(), then use them as readonly
    readonly randomizerMonsterMapping: Map<number, Monster> | undefined;
    readonly braveryMonsters: BraveryMonsters | undefined;
    readonly relics: Map<number, Relic> | undefined;
    readonly relicAreaChests: Array<Map<string, number>> | undefined;

    constructor(
        seed: number,
        randomizerMode: boolean,
        braveryMode: boolean,
        relicMode: boolean,
        randomizerMonsterMapping: Map<number, Monster> | undefined,
        braveryMonsters: BraveryMonsters | undefined,
        relics: Map<number, Relic> | undefined,
        relicAreaChests: Array<Map<string, number>> | undefined,
        filterPath?: string
    ) {
        this.seed = seed;
        this.isRandomizer = randomizerMode;
        this.isBravery = braveryMode;
        this.isRelic = relicMode;

        this.randomizerMonsterMapping = randomizerMonsterMapping;
        this.braveryMonsters = braveryMonsters;
        this.relics = relics;
        this.relicAreaChests = relicAreaChests;

        this.filterPath = filterPath;
    }

    exportToText(): void {
        if (!existsSync('seeds')) mkdirSync('seeds');

        const manager = new GameModeManager();

        let data =
            `Seed: ${this.seed}\n` +
            `Game modes: ${[
                !this.isRandomizer || 'Randomizer',
                !this.isBravery || 'Bravery',
                !this.isRelic || 'Relic',
            ]
                .filter((v) => v.toString() !== 'true')
                .join(' | ')}\n` +
            `${this.filterPath !== undefined ? `Filter: ${this.filterPath}` : ''}\n` +
            '\n';

        // Bravery
        if (this.isBravery && this.braveryMonsters !== undefined) {
            data += 'Bravery monsters:\n';

            data +=
                `  Starters: ${this.braveryMonsters.startMonsters[0].name}` +
                ` - ${this.braveryMonsters.startMonsters[1].name}` +
                ` - ${this.braveryMonsters.startMonsters[2].name}\n\n`;

            for (const [area, monster] of this.braveryMonsters.areaMonsters) {
                data += `  ${area.name}  ->  ${monster.name}\n`;
            }

            data +=
                `\n  Cryomancer: ${this.braveryMonsters.cryomancerRequired.name} -> ${this.braveryMonsters.cryomancer.name}\n` +
                `  Bex: ${this.braveryMonsters.bex.name}\n` +
                `  Swimming Monster / Sun Tower: ${this.braveryMonsters.swimmingMonster.name}\n\n`;

            for (let i = 0; i < this.braveryMonsters.army.length; i++) {
                data += `  Trade #${i + 1}: ${this.braveryMonsters.army[i]?.name ?? '(none)'}\n`;
            }

            data += `  End of Time: ${this.braveryMonsters.endOfTime
                .map((v) => v.name)
                .join(' - ')}\n`;

            data += '\n';
        }

        // Randomizer
        if (this.isRandomizer && this.randomizerMonsterMapping !== undefined) {
            data += 'Randomizer mapping:\n';

            for (const mapArea of manager.monsterAreas) {
                data += `  ${mapArea.name}:\n`;

                for (const monsterId of mapArea.monsters) {
                    const monster = this.randomizerMonsterMapping.get(monsterId) as Monster;
                    data += `    [${manager.monsterJournalList[monsterId].name}]  -->  ${monster.name}\n`;
                }

                data += '\n';
            }
        }

        // Relics
        if (this.isRelic && this.relics !== undefined && this.relicAreaChests !== undefined) {
            data += 'Relics:\n';
            let i = 0;

            for (const [areaId, relic] of this.relics) {
                const area = manager.monsterAreas.find((v) => v.id === areaId) as MapArea;
                const areaChest: Record<string, number> = this.relicAreaChests[i++]
                    .entries()
                    .next().value;

                data += `  ${area.name}  ->  ${relic.name}    (${areaChest[0]} - chest ${areaChest[1]})\n`;
            }
        }

        if (this.filterPath !== undefined) {
            const filterDir =
                'seeds/' + this.filterPath.replace('./filters/', '').replace('.json', '') + '/';

            if (!existsSync(filterDir)) mkdirSync(filterDir);

            writeFileSync(`${filterDir}${this.seed}.txt`, data);
        } else {
            writeFileSync('seeds/' + this.seed.toString() + '.txt', data);
        }
    }
}
