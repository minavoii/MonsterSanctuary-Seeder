CREATE TABLE IF NOT EXISTS "Relic" (
    "Id" INTEGER NOT NULL,
    "Name" TEXT NOT NULL,
    "MonsterTypeRestriction" INTEGER NOT NULL,
    FOREIGN KEY("MonsterTypeRestriction") REFERENCES "MonsterType"("Id"),
    PRIMARY KEY("Id")
);