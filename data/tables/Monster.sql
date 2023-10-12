CREATE TABLE IF NOT EXISTS "Monster" (
    "Id" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "ExploreAction" INTEGER NOT NULL,
    "MonsterTypes" TEXT NOT NULL,
    FOREIGN KEY("ExploreAction") REFERENCES "ExploreAction"("Id"),
    PRIMARY KEY("Id")
);