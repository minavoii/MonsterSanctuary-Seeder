CREATE TABLE IF NOT EXISTS "AreaData" (
    "AreaId" INTEGER NOT NULL,
    "SceneId" INTEGER NOT NULL,
    "SceneName" TEXT NOT NULL,
    "ChestList" TEXT,
    FOREIGN KEY("AreaId") REFERENCES "Area"("Id"),
    PRIMARY KEY("SceneId")
);