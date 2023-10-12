import type { Monster, MapArea } from './Interfaces.js';

export class BraveryMonsters {
    swimmingMonster: Monster;
    bex: Monster;
    cryomancer: Monster;
    cryomancerRequired: Monster;
    endOfTime: Monster[];
    army: Monster[];
    areaMonsters: Map<MapArea, Monster>;
    startMonsters: Monster[];

    constructor(
        tanuki: Monster,
        swimmingMonster: Monster,
        bex: Monster,
        cryomancer: Monster,
        cryomancerRequired: Monster,
        endOfTime: Monster[],
        army: Monster[],
        areaMonsters: Map<MapArea, Monster>,
        startMonsters: Monster[]
    ) {
        this.swimmingMonster = swimmingMonster;
        this.bex = bex;
        this.cryomancer = cryomancer;
        this.cryomancerRequired = cryomancerRequired;
        this.endOfTime = endOfTime;
        this.army = army;
        this.areaMonsters = areaMonsters;
        this.startMonsters = startMonsters;
    }
}
