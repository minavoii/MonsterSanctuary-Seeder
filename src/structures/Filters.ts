export class FilterList {
    randomizer: RandomizerFilter | undefined;
    bravery: BraveryFilter | undefined;
    relics: RelicsFilter | undefined;
    path: string | undefined;
}

export class RandomizerFilter {
    monsters: Map<number, number> | undefined;
    areas: Map<number, number[]> | undefined;
}

export class BraveryFilter {
    available: number[] | undefined;
    familiar: number | undefined;
    start: number[] | undefined;
    swimming: number | undefined;
    bex: number | undefined;
    cryomancer: number | undefined;
    cryomancerRequired: number | undefined;
    endOfTime: number[] | undefined;
    army: number[] | undefined;
    areas: Map<number, number> | undefined;
}

export class RelicsFilter {
    available: number[] | undefined;
    areas: Map<number, number> | undefined;
}
