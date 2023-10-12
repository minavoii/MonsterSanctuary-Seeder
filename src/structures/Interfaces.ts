export interface Monster {
    id: number;
    name: string;
    exploreAction: number;
    monsterTypes: number[];
}

export interface MonsterType {
    id: number;
    name: string;
}

export interface ExploreAction {
    id: number;
    name: string;
}

export interface ExploreAbilities {
    name: string;
    exploreActions: number[];
}

export interface MapArea {
    id: number;
    name: string;
    monsters: number[];
    randomizerCheckList: number[];
    areaData: number[];
}

export interface AreaData {
    areaId: number;
    sceneId: number;
    sceneName: string;
    chests: number[];
}

export interface Relic {
    id: number;
    name: string;
    monsterTypeRestriction: number;
}
