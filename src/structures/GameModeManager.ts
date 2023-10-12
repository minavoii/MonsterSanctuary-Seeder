import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'fs';

import { UnyRandom } from 'uny-random';

import { BraveryMonsters } from './BraveryMonsters.js';
import { Game } from './Game.js';

import type {
    Monster,
    MonsterType,
    MapArea,
    AreaData,
    ExploreAbilities,
    Relic,
    ExploreAction,
} from './Interfaces.js';

export class GameModeManager {
    private random = new UnyRandom();
    private seed = 0;

    // Game modes
    private randomizerMode = false;
    private braveryMode = false;
    private relicMode = false;

    // Lists
    readonly monsterJournalList = this.getMonsterJournalList();
    readonly swimmingMonsterList = this.getSwimmingMonsterList(this.monsterJournalList);
    readonly areaData = this.getAreaData();
    readonly monsterAreas = this.getMonsterAreas();
    readonly monsterTypes = this.getMonsterTypes();
    readonly exploreActions = this.getExploreActions();
    readonly exploreAbilities = this.getExploreAbilities();
    readonly relics = this.getRelics();

    // Monsters
    private readonly tanukiMonster = this.monsterJournalList[50];
    private swimmingMonster: Monster | undefined;
    private cryomancerRequiredMonster: Monster | undefined;
    private cryomancerMonster: Monster | undefined;
    private bexMonster: Monster | undefined;
    private familiarIndex = 0;

    // Monster lists
    private monsterPool: Monster[] = [];
    private braveryMonsters = new Map<MapArea, Monster>();
    private monsterMapping = new Map<number, Monster>();
    private endOfTimeMonsters: Monster[] = [];
    private monsterArmyMonsters: Monster[] = [];
    private playerMonsters: Monster[] = [];

    // Abilities
    private readonly breakWallAbilities = this.exploreAbilities[0].exploreActions;
    private readonly mountAbilities = this.exploreAbilities[1].exploreActions;
    private readonly flyingAbilities = this.exploreAbilities[2].exploreActions;
    private readonly improvedFlyingAbilities = this.exploreAbilities[3].exploreActions;
    private readonly secretVisionAbilities = this.exploreAbilities[4].exploreActions;
    private readonly igniteAbilities = this.exploreAbilities[5].exploreActions;
    private readonly lightAbilities = this.exploreAbilities[6].exploreActions;
    private readonly crushAbilities = this.exploreAbilities[7].exploreActions;
    private readonly bigRockAbilities = this.exploreAbilities[8].exploreActions;
    private readonly grapplingAbilities = this.exploreAbilities[9].exploreActions;
    private readonly blobFormAbilities = this.exploreAbilities[10].exploreActions;
    private readonly levitateAbilities = this.exploreAbilities[11].exploreActions;

    // Areas
    private readonly mountainPath = this.monsterAreas[0];
    private readonly blueCave = this.monsterAreas[1];
    private readonly strongholdDungeon = this.monsterAreas[2];
    private readonly ancientWoods = this.monsterAreas[3];
    private readonly snowyPeaks = this.monsterAreas[4];
    private readonly sunPalace = this.monsterAreas[5];
    private readonly horizonBeach = this.monsterAreas[6];
    private readonly magmaChamber = this.monsterAreas[7];
    private readonly mysticalWorkshop = this.monsterAreas[8];
    private readonly forgottenWorld = this.monsterAreas[12];

    // Relics
    private relicEquipments = new Map<number, Relic>();
    private relicAreaChests: Array<Map<string, number>> = [];

    /**
     * Reset all mappings
     */
    private clear(): void {
        this.random = new UnyRandom();

        this.swimmingMonster = undefined;
        this.cryomancerRequiredMonster = undefined;
        this.cryomancerMonster = undefined;
        this.bexMonster = undefined;
        this.familiarIndex = 0;

        this.monsterPool = [];
        this.braveryMonsters.clear();
        this.monsterMapping.clear();
        this.endOfTimeMonsters = [];
        this.monsterArmyMonsters = [];
        this.playerMonsters = [];

        this.relicEquipments.clear();
        this.relicAreaChests = [];
    }

    /**
     * Generate a new game
     */
    generateGame(
        randomizerMode: boolean,
        braveryMode: boolean,
        relicMode: boolean,
        seed?: number
    ): Game | undefined {
        this.seed = seed ?? Math.floor(Math.random() * 1000000);
        this.randomizerMode = randomizerMode;
        this.braveryMode = braveryMode;
        this.relicMode = relicMode;

        // Resets RNG
        this.monsterMapping = new Map<number, Monster>();
        this.braveryMonsters = new Map<MapArea, Monster>();
        this.relicEquipments = new Map<number, Relic>();

        this.clear();
        this.random.initState(this.seed);

        let allBraveryMonsters;

        if (randomizerMode) {
            let tries = 0;

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            while (!this.determineRandomMapping()) ++tries;
        }

        if (braveryMode) {
            this.cryomancerMonster = undefined;
            this.swimmingMonster =
                this.swimmingMonsterList[this.random.range(0, this.swimmingMonsterList.length)];
            this.bexMonster = this.determineRandomMonster(true, false, false);
            this.determineBraveryStartMonsters();

            let tries = 0;

            while (!this.determineBraveryMonsters()) {
                ++tries;
                if (tries % 100 === 0) this.determineBraveryStartMonsters();

                // Some seeds cannot generate, and will freeze the game upon creation
                // The algorithm is not able to generate randomizer and/or bravery monsters
                //   and will try forever
                if (tries > 10000) {
                    const gameModes = [
                        !this.randomizerMode || 'Randomizer',
                        !this.braveryMode || 'Bravery',
                        !this.relicMode || 'Relic',
                    ]
                        .filter((v) => v.toString() !== 'true')
                        .join(' | ');

                    console.error('Bad seed found:', this.seed, '- Game modes:', gameModes);

                    if (!existsSync('./seeds/bad_seeds.txt'))
                        writeFileSync('./seeds/bad_seeds.txt', '');

                    appendFileSync(
                        './seeds/bad_seeds.txt',
                        'Seed: ' + this.seed.toString() + ' - Game modes: ' + gameModes + '\n'
                    );
                    return;
                }
            }

            this.cryomancerMonster = this.determineRandomMonster(true, false, true);
            this.cryomancerRequiredMonster = this.determineCryomancerRequiredMonster();
            this.determineBraveryMonsterArmy();

            for (let index = 0; index < 3; ++index) {
                this.endOfTimeMonsters.push(this.determineRandomMonster(true, true, true));
            }

            // BraveryShiftOffset: unused here but required for RNG
            this.random.range(0, 1000);

            allBraveryMonsters = new BraveryMonsters(
                this.tanukiMonster,
                this.swimmingMonster,
                this.bexMonster,
                this.cryomancerMonster,
                this.cryomancerRequiredMonster,
                this.endOfTimeMonsters,
                this.monsterArmyMonsters,
                this.braveryMonsters,
                this.playerMonsters
            );
        }

        if (relicMode) {
            this.relicAreaChests = [];

            for (const monsterArea of this.monsterAreas) {
                const randomRelic = this.getRandomRelic(this.relics, monsterArea);

                this.relicEquipments.set(monsterArea.id, randomRelic);
                this.relicAreaChests.push(this.getRandomChestInArea(monsterArea));
            }
        }

        return new Game(
            this.seed,
            this.randomizerMode,
            this.braveryMode,
            this.relicMode,
            this.monsterMapping,
            this.braveryMode ? allBraveryMonsters : undefined,
            this.relicEquipments,
            this.relicAreaChests
        );
    }

    /**
     *   -------------------------
     *  | RANDOMIZER MODE METHODS |
     *   -------------------------
     */

    /**
     * Create a monster mapping for the randomizer mode
     */
    private determineRandomMapping(): boolean {
        this.monsterPool = [];
        this.monsterMapping.clear();

        for (let index = 4; index < 110; ++index) {
            this.monsterPool.push(this.monsterJournalList[index]);
        }

        // Swimming monster
        const swimmingMonster =
            this.swimmingMonsterList[this.random.range(0, this.swimmingMonsterList.length)];
        const koi = this.monsterJournalList[49];
        this.monsterPool.splice(this.monsterPool.indexOf(swimmingMonster), 1);
        this.monsterMapping.set(koi.id, swimmingMonster);

        // All other monsters
        for (let index = 4; index < 110; ++index) {
            if (index !== 49) {
                const monster = this.monsterJournalList[index];
                const randomizerMonster = this.determineRandomizerMonster(
                    !this.containsMonsterInAreas(monster, this.blueCave, this.mountainPath) &&
                        monster.name !== 'Tanuki',
                    !this.containsMonsterInAreas(
                        monster,
                        this.blueCave,
                        this.mountainPath,
                        this.ancientWoods,
                        this.strongholdDungeon,
                        this.snowyPeaks,
                        this.sunPalace,
                        this.magmaChamber,
                        this.mysticalWorkshop
                    ) && monster.name !== 'Tanuki'
                );
                this.monsterPool.splice(this.monsterPool.indexOf(randomizerMonster), 1);
                this.monsterMapping.set(monster.id, randomizerMonster);
            }
        }

        if (
            !this.hasRandomizerMonstersAbility(
                'Mount',
                this.mountainPath,
                this.blueCave,
                this.strongholdDungeon,
                this.ancientWoods,
                this.snowyPeaks,
                this.sunPalace
            )
        ) {
            return false;
        }

        if (
            !this.hasRandomizerMonstersAbility(
                'MountOrFlying',
                this.mountainPath,
                this.blueCave,
                this.strongholdDungeon,
                this.ancientWoods
            )
        ) {
            return false;
        }

        return (
            this.hasRandomizerMonstersAbility(
                'ImprovedFlying',
                this.strongholdDungeon,
                this.ancientWoods,
                this.snowyPeaks,
                this.sunPalace,
                this.magmaChamber,
                this.horizonBeach
            ) && this.hasRandomizerSecretVision()
        );
    }

    /**
     * Determine a random possible monster given ability criteras
     * @param {boolean} allowImprovedFlying
     * @param {boolean} allowSwimming
     */
    private determineRandomizerMonster(
        allowImprovedFlying: boolean,
        allowSwimming: boolean
    ): Monster {
        let monster;

        do {
            monster = this.monsterPool[this.random.range(0, this.monsterPool.length)];
        } while (
            // eslint-disable-next-line no-unmodified-loop-condition
            (!allowImprovedFlying &&
                this.improvedFlyingAbilities?.includes(monster.exploreAction)) ||
            // eslint-disable-next-line no-unmodified-loop-condition
            (!allowSwimming && this.swimmingMonsterList.includes(monster))
        );

        return monster;
    }

    /**
     * Get the monster which was swapped with the given monster in randomizer mode
     * @param {Monster} monster
     */
    private getReplacementMonster(monster: Monster): Monster {
        return this.randomizerMode && this.monsterMapping.has(monster.id)
            ? (this.monsterMapping.get(monster.id) as Monster)
            : monster;
    }

    /**
     * Check if the monster can be found in any of the given areas
     * @param monster
     * @param areas
     */
    private containsMonsterInAreas(monster: Monster, ...areas: MapArea[]): boolean {
        for (const area of areas) {
            for (const monsterId of area.monsters) {
                if (monster.id === monsterId) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if the randomized mapping has a required ability in any of the given areas
     * @param ability
     * @param areas
     */
    private hasRandomizerMonstersAbility(
        ability: 'Mount' | 'MountOrFlying' | 'ImprovedFlying' | 'SecretVision',
        ...areas: MapArea[]
    ): boolean {
        for (const area of areas) {
            if (this.hasMonsterInAreaAbility(area, ability, false)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if the randomized mapping has the Secret Vision ability, outside the Forgotten World area
     */
    private hasRandomizerSecretVision(): boolean {
        for (const monsterArea of this.monsterAreas) {
            if (
                monsterArea !== this.forgottenWorld &&
                this.hasMonsterInAreaAbility(monsterArea, 'SecretVision', true)
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check if any monster in a givea area has a required ability
     * @param area
     * @param ability
     * @param fullMonsterList
     */
    private hasMonsterInAreaAbility(
        area: MapArea,
        ability: 'Mount' | 'MountOrFlying' | 'ImprovedFlying' | 'SecretVision',
        fullMonsterList: boolean
    ): boolean {
        const monsterList = fullMonsterList ? area.monsters : area.randomizerCheckList;

        switch (ability) {
            case 'Mount': {
                for (const monsterId of monsterList) {
                    if (this.hasRandomizerMonsterMountAbility(this.monsterJournalList[monsterId])) {
                        return true;
                    }
                }

                break;
            }

            case 'MountOrFlying': {
                for (const monsterId of monsterList) {
                    if (
                        this.hasRandomizerMonsterMountOrFlyingAbility(
                            this.monsterJournalList[monsterId]
                        )
                    ) {
                        return true;
                    }
                }

                break;
            }

            case 'ImprovedFlying': {
                for (const monsterId of monsterList) {
                    if (
                        this.hasRandomizerMonsterImprovedFlyingAbility(
                            this.monsterJournalList[monsterId]
                        )
                    ) {
                        return true;
                    }
                }

                break;
            }

            case 'SecretVision': {
                for (const monsterId of monsterList) {
                    if (
                        this.hasRandomizerMonsterSecretVisionAbility(
                            this.monsterJournalList[monsterId]
                        )
                    ) {
                        return true;
                    }
                }

                break;
            }

            default: {
                return false;
            }
        }

        return false;
    }

    /**
     * Check if a given monster from the randomized mapping has the 'Mount' ability
     * @param monster
     */
    private hasRandomizerMonsterMountAbility(monster: Monster): boolean {
        return this.mountAbilities.includes(this.getReplacementMonster(monster).exploreAction);
    }

    /**
     * Check if a given monster from the randomized mapping has either the 'Mount' or 'Flying' ability
     * @param monster
     */
    private hasRandomizerMonsterMountOrFlyingAbility(monster: Monster): boolean {
        return (
            this.mountAbilities.includes(this.getReplacementMonster(monster).exploreAction) ||
            this.flyingAbilities.includes(this.getReplacementMonster(monster).exploreAction)
        );
    }

    /**
     * Check if a given monster from the randomized mapping has the 'Improved Flying' ability
     * @param monster
     */
    private hasRandomizerMonsterImprovedFlyingAbility(monster: Monster): boolean {
        return this.improvedFlyingAbilities.includes(
            this.getReplacementMonster(monster).exploreAction
        );
    }

    /**
     * Check if a given monster from the randomized mapping has the 'Secret Vision' ability
     * @param monster
     */
    private hasRandomizerMonsterSecretVisionAbility(monster: Monster): boolean {
        return this.secretVisionAbilities.includes(
            this.getReplacementMonster(monster).exploreAction
        );
    }

    /**
     *   ----------------------
     *  | BRAVERY MODE METHODS |
     *   ----------------------
     */

    /**
     * Determine which monster needs to be traded to the Cryomancer
     */
    private determineCryomancerRequiredMonster(): Monster {
        let bestMonster: Monster | undefined;
        let bestRating = -1;

        for (const [, braveryMonster] of this.braveryMonsters) {
            const check = this.checkCryomancerRequiredMonster(
                braveryMonster,
                bestMonster,
                bestRating
            );
            if (check != null) {
                [bestMonster, bestRating] = check;
            }
        }

        for (let index = 1; index < 3; ++index) {
            const check = this.checkCryomancerRequiredMonster(
                this.playerMonsters[index],
                bestMonster,
                bestRating
            );
            if (check != null) {
                [bestMonster, bestRating] = check;
            }
        }

        const check = this.checkCryomancerRequiredMonster(
            this.bexMonster as Monster,
            bestMonster,
            bestRating
        );
        if (check != null) {
            [bestMonster, bestRating] = check;
        }

        return bestMonster as Monster;
    }

    /**
     * Compares which monster should need to be traded to the Cryomancer
     * @param monster
     * @param bestMonster
     * @param bestRating
     */
    private checkCryomancerRequiredMonster(
        monster: Monster,
        bestMonster: Monster | undefined,
        bestRating: number
    ): [Monster, number] | undefined {
        if (
            (this.hasMonsterBreakWallAbility(monster, undefined) &&
                !this.hasBreakWallMonster(monster)) ||
            (this.hasImprovedFlyingAbility(monster, undefined) &&
                !this.hasBreakWallMonster(monster)) ||
            (this.hasSecretVisionAbility(monster, undefined) &&
                !this.hasSecretVisionMonster(monster)) ||
            (this.hasMonsterMountAbility(monster, undefined) && !this.hasMountMonster(monster))
        ) {
            return;
        }

        const rating = this.random.rangeFloat(0, 1);

        if (rating <= bestRating) {
            return;
        }

        bestMonster = monster;
        bestRating = rating;

        return [bestMonster, bestRating];
    }

    /**
     * Determine a random possible monster given ability criteras
     * @param {boolean} canHaveImprovedFlying
     * @param {boolean} canHaveSwimming
     * @param {boolean} canBeFamiliar
     */
    private determineRandomMonster(
        canHaveImprovedFlying: boolean,
        canHaveSwimming: boolean,
        canBeFamiliar: boolean
    ): Monster {
        const monster =
            this.monsterJournalList[
                this.random.range(canBeFamiliar ? 0 : 4, this.monsterJournalList.length - 1)
            ];

        return (!canHaveImprovedFlying && this.hasImprovedFlyingAbility(monster, undefined)) ||
            (!canHaveSwimming && this.swimmingMonsterList.includes(monster)) ||
            this.wasMonsterAlreadyDetermined(monster)
            ? this.determineRandomMonster(canHaveImprovedFlying, canHaveSwimming, canBeFamiliar)
            : monster;
    }

    /**
     *
     * @param {Monster} monster
     */
    private wasMonsterAlreadyDetermined(monster: Monster): boolean {
        if (monster === this.monsterJournalList[this.familiarIndex]) {
            return true;
        }

        for (let index = 1; index < 3; ++index) {
            if (
                this.playerMonsters.length > index &&
                this.playerMonsters[index].id === monster.id
            ) {
                return true;
            }
        }

        if (
            monster === this.swimmingMonster ||
            monster === this.cryomancerMonster ||
            monster === this.bexMonster
        ) {
            return true;
        }

        for (const [, braveryMonster] of this.braveryMonsters) {
            if (braveryMonster === monster) {
                return true;
            }
        }

        for (const endOfTimeMonster of this.endOfTimeMonsters) {
            if (endOfTimeMonster === monster) {
                return true;
            }
        }

        for (const monsterArmyMonster of this.monsterArmyMonsters) {
            if (monsterArmyMonster === monster) {
                return true;
            }
        }

        return false;
    }

    /**
     * Give the player a random spectral familiar and 2 random monsters to start with
     */
    private determineBraveryStartMonsters(): void {
        this.playerMonsters = [];

        this.familiarIndex = this.random.range(0, 4);
        this.playerMonsters.push(this.monsterJournalList[this.familiarIndex]);

        for (let index = 0; index < 2; ++index) {
            const monster = this.determineRandomMonster(false, false, false);
            this.playerMonsters.push(monster);

            // AddMonsterByPrefab() makes a call to UnityEngine.Object.Instantiate
            //   which calls Object.Internal_CloneSingle
            //   and may generate another number with UnityEngine.Random.Range(int, int)
            // This is highly likely due to the flying animation frames, and is always consistent
            switch (monster.name) {
                case 'Amberlagna':
                case 'Vaero':
                case 'Nightwing':
                case 'Frosty':
                case 'Mad Eye':
                case 'Toxiquus':
                case 'Magmamoth':
                case 'Glowfly':
                case 'Raduga':
                case 'Kanko':
                case 'Glowdra':
                case 'Draconov':
                case 'Thanatos':
                case 'Vertraag':
                case 'Ascendant':
                    this.random.skip(1);
                    break;
                default:
                    break;
            }
        }
    }

    /**
     * Determine each area's monster for Bravery mode
     */
    private determineBraveryMonsters(): boolean {
        this.braveryMonsters.clear();

        for (const monsterArea of this.monsterAreas) {
            let braveryMonster;
            let number1 = -1;

            for (const monsterId of monsterArea.monsters) {
                const replacementMonster = this.getReplacementMonster(
                    this.monsterJournalList[monsterId]
                );

                if (!this.wasMonsterAlreadyDetermined(replacementMonster)) {
                    const number2 = this.random.rangeFloat(0, 1);

                    if (number2 > number1) {
                        braveryMonster = replacementMonster;
                        number1 = number2;
                    }
                }
            }

            if (
                (braveryMonster === undefined ||
                    (!this.wasMonsterAlreadyDetermined(this.tanukiMonster) &&
                        this.random.rangeFloat(0, 1) < 0.100_000_001_490_116_12)) && // 1f
                (braveryMonster === undefined || this.random.rangeFloat(0, 1) > number1)
            ) {
                braveryMonster = this.tanukiMonster;
            }

            this.braveryMonsters.set(monsterArea, braveryMonster);
        }

        return (
            this.hasBreakWallMonster() &&
            this.hasMountMonster() &&
            this.hasMountOrFlyingMonster() &&
            this.hasImprovedFlyingMonster() &&
            this.hasSecretVisionMonster()
        );
    }

    /**
     * Determine monsters for the monster army in Bravery mode
     */
    private determineBraveryMonsterArmy(): void {
        this.determineBraveryMonsterArmyMonster(this.igniteAbilities);
        this.determineBraveryMonsterArmyMonster(this.lightAbilities);
        this.determineBraveryMonsterArmyMonster(this.crushAbilities);
        this.determineBraveryMonsterArmyMonster(this.bigRockAbilities);
        this.determineBraveryMonsterArmyMonster(this.grapplingAbilities);
        this.determineBraveryMonsterArmyMonster(this.blobFormAbilities);
        this.determineBraveryMonsterArmyMonster(this.levitateAbilities);
    }

    /**
     * Determine a monster for the monster army with one of the specified abilities
     * @param abilityList
     */
    private determineBraveryMonsterArmyMonster(abilityList: number[]): void {
        if (this.hasEndgameAbilityMonster(abilityList)) {
            this.monsterArmyMonsters.push(this.determineRandomMonster(true, false, true));
        } else {
            let monster = null;
            let number1 = -1;

            for (let index = 4; index < 110; ++index) {
                const monster2 = this.monsterJournalList[index];

                if (
                    abilityList.includes(monster2.exploreAction) &&
                    !this.wasMonsterAlreadyDetermined(monster2)
                ) {
                    const number2 = this.random.rangeFloat(0, 1);

                    if (number2 > number1) {
                        monster = monster2;
                        number1 = number2;
                    }
                }
            }

            if (monster != null) {
                this.monsterArmyMonsters.push(monster);
            } else {
                console.error(
                    '[' + this.seed.toString() + ']',
                    'Could not determine Bravery Monster Army Monster!'
                );
            }
        }
    }

    /**
     * Check if the player has a monster with the "Break Wall" ability
     * @param excludeMonster
     */
    private hasBreakWallMonster(excludeMonster?: Monster | undefined): boolean {
        for (let index = 1; index < 3; ++index) {
            if (this.hasMonsterBreakWallAbility(this.playerMonsters[index], excludeMonster)) {
                return true;
            }
        }

        return (
            this.hasMonsterBreakWallAbility(
                this.monsterJournalList[this.familiarIndex],
                excludeMonster
            ) ||
            this.hasMonsterBreakWallAbility(
                this.braveryMonsters.get(this.blueCave) as Monster,
                excludeMonster
            ) ||
            this.hasMonsterBreakWallAbility(
                this.braveryMonsters.get(this.mountainPath) as Monster,
                excludeMonster
            )
        );
    }

    /**
     * Check if the player has a monster with the "Mount" ability
     * @param excludeMonster
     */
    private hasMountMonster(excludeMonster?: Monster | undefined): boolean {
        for (let index = 1; index < 3; ++index) {
            if (this.hasMonsterMountAbility(this.playerMonsters[index], excludeMonster)) {
                return true;
            }
        }

        return (
            this.hasMonsterMountAbility(
                this.braveryMonsters.get(this.blueCave) as Monster,
                excludeMonster
            ) ||
            this.hasMonsterMountAbility(
                this.braveryMonsters.get(this.mountainPath) as Monster,
                excludeMonster
            ) ||
            this.hasMonsterMountAbility(
                this.braveryMonsters.get(this.strongholdDungeon) as Monster,
                excludeMonster
            ) ||
            this.hasMonsterMountAbility(
                this.braveryMonsters.get(this.ancientWoods) as Monster,
                excludeMonster
            ) ||
            this.hasMonsterMountAbility(
                this.braveryMonsters.get(this.snowyPeaks) as Monster,
                excludeMonster
            ) ||
            this.hasMonsterMountAbility(
                this.braveryMonsters.get(this.sunPalace) as Monster,
                excludeMonster
            )
        );
    }

    /**
     * Check if the player has a monster with the "Mount" or "Flying" ability
     * @param excludeMonster
     */
    private hasMountOrFlyingMonster(excludeMonster?: Monster | undefined): boolean {
        for (let index = 1; index < 3; ++index) {
            if (this.hasMonsterMountOrFlyingAbility(this.playerMonsters[index], excludeMonster)) {
                return true;
            }
        }

        return (
            this.hasMonsterMountOrFlyingAbility(
                this.monsterJournalList[this.familiarIndex],
                excludeMonster
            ) ||
            this.hasMonsterMountOrFlyingAbility(
                this.braveryMonsters.get(this.blueCave) as Monster,
                excludeMonster
            ) ||
            this.hasMonsterMountOrFlyingAbility(
                this.braveryMonsters.get(this.mountainPath) as Monster,
                excludeMonster
            ) ||
            this.hasMonsterMountOrFlyingAbility(
                this.braveryMonsters.get(this.strongholdDungeon) as Monster,
                excludeMonster
            ) ||
            this.hasMonsterMountOrFlyingAbility(
                this.braveryMonsters.get(this.ancientWoods) as Monster,
                excludeMonster
            )
        );
    }

    /**
     * Check if the player has a monster with the "Improved Flying" ability
     * @param excludeMonster
     */
    private hasImprovedFlyingMonster(excludeMonster?: Monster | undefined): boolean {
        return (
            this.hasImprovedFlyingAbility(
                this.braveryMonsters.get(this.strongholdDungeon) as Monster,
                excludeMonster
            ) ||
            this.hasImprovedFlyingAbility(
                this.braveryMonsters.get(this.ancientWoods) as Monster,
                excludeMonster
            ) ||
            this.hasImprovedFlyingAbility(
                this.braveryMonsters.get(this.snowyPeaks) as Monster,
                excludeMonster
            ) ||
            this.hasImprovedFlyingAbility(
                this.braveryMonsters.get(this.sunPalace) as Monster,
                excludeMonster
            ) ||
            this.hasImprovedFlyingAbility(
                this.braveryMonsters.get(this.horizonBeach) as Monster,
                excludeMonster
            ) ||
            this.hasImprovedFlyingAbility(
                this.braveryMonsters.get(this.magmaChamber) as Monster,
                excludeMonster
            )
        );
    }

    /**
     * Check if the player has a monster with the "Secret Vision" ability
     * @param excludeMonster
     */
    private hasSecretVisionMonster(excludeMonster?: Monster | undefined): boolean {
        for (let index = 1; index < 3; ++index) {
            if (this.hasSecretVisionAbility(this.playerMonsters[index], excludeMonster)) {
                return true;
            }
        }

        for (const [area, braveryMonster] of this.braveryMonsters) {
            if (
                area !== this.forgottenWorld &&
                this.hasSecretVisionAbility(braveryMonster, excludeMonster)
            ) {
                return true;
            }
        }

        return this.hasSecretVisionAbility(this.bexMonster as Monster, excludeMonster);
    }

    /**
     * Check if the player can have a monster with the specified ability in the endgame
     * @param abilityList
     */
    private hasEndgameAbilityMonster(abilityList: number[]): boolean {
        for (let index = 1; index < 3; ++index) {
            if (
                this.hasMonsterAbilityFromList(this.playerMonsters[index], abilityList) &&
                this.playerMonsters[index] !== this.cryomancerRequiredMonster
            ) {
                return true;
            }
        }

        for (const [area, braveryMonster] of this.braveryMonsters) {
            if (
                area !== this.forgottenWorld &&
                this.hasMonsterAbilityFromList(braveryMonster, abilityList) &&
                braveryMonster !== this.cryomancerRequiredMonster
            ) {
                return true;
            }
        }

        return (
            this.hasMonsterAbilityFromList(this.bexMonster as Monster, abilityList) &&
            this.bexMonster !== this.cryomancerRequiredMonster
        );
    }

    /**
     * Check if the monster has the "Break Wall" ability
     * @param monster
     * @param excludeMonster
     */
    private hasMonsterBreakWallAbility(
        monster: Monster,
        excludeMonster: Monster | undefined
    ): boolean {
        return (
            monster !== excludeMonster && this.breakWallAbilities.includes(monster.exploreAction)
        );
    }

    /**
     * Check if the monster has the "Mount" ability
     * @param monster
     * @param excludeMonster
     */
    private hasMonsterMountAbility(monster: Monster, excludeMonster: Monster | undefined): boolean {
        return monster !== excludeMonster && this.mountAbilities.includes(monster.exploreAction);
    }

    /**
     * Check if the monster has the "Mount" or "Flying" ability
     * @param monster
     * @param excludeMonster
     */
    private hasMonsterMountOrFlyingAbility(
        monster: Monster,
        excludeMonster: Monster | undefined
    ): boolean {
        if (monster === excludeMonster) {
            return false;
        }

        return (
            this.mountAbilities.includes(monster.exploreAction) ||
            this.flyingAbilities.includes(monster.exploreAction)
        );
    }

    /**
     * Check if the monster has the "Improved Flying" ability
     * @param monster
     * @param excludeMonster
     */
    private hasImprovedFlyingAbility(
        monster: Monster,
        excludeMonster: Monster | undefined
    ): boolean {
        return (
            monster !== excludeMonster &&
            this.improvedFlyingAbilities.includes(monster.exploreAction)
        );
    }

    /**
     * Check if the monster has the "Secret Vision" ability
     * @param monster
     * @param excludeMonster
     */
    private hasSecretVisionAbility(monster: Monster, excludeMonster: Monster | undefined): boolean {
        return (
            monster !== excludeMonster && this.secretVisionAbilities.includes(monster.exploreAction)
        );
    }

    /**
     * Check if the monster has one of the specified abilities
     * @param monster
     * @param abilityList
     */
    private hasMonsterAbilityFromList(monster: Monster, abilityList: number[]): boolean {
        return abilityList.includes(monster.exploreAction);
    }

    /**
     *   ---------------------
     *  | RELICS MODE METHODS |
     *   ---------------------
     */

    /**
     * Get a random relic, and if Bravery mode is enabled, filters out monster type restricted relics
     *   unless the player can obtain at least one monster of that type. (e.g if the player
     *   cannot get a "Goblin" type monster, prevents "Goblin" specific relics from spawning)
     * @param relics
     * @param mapArea
     */
    private getRandomRelic(relics: Relic[], mapArea: MapArea): Relic {
        const mynum = this.random.range(0, relics.length);
        const relic = relics[mynum];

        for (const [, relicEquipment] of this.relicEquipments) {
            if (relicEquipment === relic) {
                return this.getRandomRelic(relics, mapArea);
            }
        }

        if (
            this.braveryMode &&
            this.monsterTypes[relic.monsterTypeRestriction] !== this.monsterTypes[0]
        ) {
            const monsterTypeList = [];

            for (const [area, braveryMonster] of this.braveryMonsters) {
                if (area === mapArea) {
                    for (const monsterType of braveryMonster.monsterTypes) {
                        monsterTypeList.push(monsterType);
                    }
                }
            }

            for (const monster of this.playerMonsters) {
                for (const monsterType of monster.monsterTypes) {
                    monsterTypeList.push(this.monsterTypes[monsterType]);
                }
            }

            if (!monsterTypeList.includes(relic.monsterTypeRestriction)) {
                return this.getRandomRelic(relics, mapArea);
            }
        }

        return relic;
    }

    /**
     * Get a random chest in the specified area
     * @param mapArea
     */
    private getRandomChestInArea(mapArea: MapArea): Map<string, number> {
        const all = mapArea.areaData;

        const areaDataId = all[this.random.range(0, all.length)];
        const areaData = this.areaData.find((v) => v.sceneId === areaDataId) as AreaData;
        const sceneName = areaData.sceneName;
        const chestId = areaData.chests[this.random.range(0, areaData.chests.length)];

        /* console.log(
            'Relic Mode - Chest chosen for Relic in Area',
            mapArea.name,
            ': Chest ID',
            chestId,
            '; Scene',
            sceneName,
            '.\n'
        ); */

        const areaChest = new Map<string, number>();
        areaChest.set(sceneName, chestId);

        return areaChest;
    }

    /**
     *   ----------------------
     *  | DATA READING METHODS |
     *   ----------------------
     */

    /**
     * Read and return all monster data
     */
    private getMonsterJournalList(): Monster[] {
        const read = readFileSync('./data/json/MonsterJournalList.json').toString();
        return JSON.parse(read) as Monster[];
    }

    /**
     * Read and return all monsters with the swimming ability
     * @param monsterJournalList
     */
    private getSwimmingMonsterList(monsterJournalList: Monster[]): Monster[] {
        const read = readFileSync('./data/json/SwimmingMonsterList.json').toString();
        const json = JSON.parse(read) as number[];
        const swimmingMonsters: Monster[] = [];

        for (const id of json) {
            if (id !== -1 && id < monsterJournalList.length) {
                swimmingMonsters.push(monsterJournalList[id]);
            }
        }

        return swimmingMonsters;
    }

    /**
     * Read and return all area data
     */
    private getAreaData(): AreaData[] {
        const read = readFileSync('./data/json/AreaData.json').toString();
        return JSON.parse(read) as AreaData[];
    }

    /**
     * Read and return all monster areas
     */
    private getMonsterAreas(): MapArea[] {
        const read = readFileSync('./data/json/MonsterAreas.json').toString();
        return JSON.parse(read) as MapArea[];
    }

    /**
     * Read and return all explore actions
     */
    private getExploreActions(): ExploreAction[] {
        const read = readFileSync('./data/json/ExploreActions.json').toString();
        return JSON.parse(read) as ExploreAction[];
    }

    /**
     * Read and return all explore abilities
     */
    private getExploreAbilities(): ExploreAbilities[] {
        const read = readFileSync('./data/json/ExploreAbilities.json').toString();
        return JSON.parse(read) as ExploreAbilities[];
    }

    /**
     * Read and return all monster types
     */
    private getMonsterTypes(): MonsterType[] {
        const read = readFileSync('./data/json/MonsterTypes.json').toString();
        return JSON.parse(read) as MonsterType[];
    }

    /**
     * Read and return all relics
     */
    private getRelics(): Relic[] {
        const read = readFileSync('./data/json/Relics.json').toString();
        return JSON.parse(read) as Relic[];
    }
}
