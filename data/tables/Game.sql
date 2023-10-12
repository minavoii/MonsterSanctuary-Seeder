CREATE TABLE IF NOT EXISTS "Game" (
    "Seed" INTEGER NOT NULL,
    "IsRandomizer" INTEGER NOT NULL,
    "IsBravery" INTEGER NOT NULL,
	"RandomizerMappingId" INTEGER,
	"BraveryMappingId" INTEGER,
    "RelicsMappingId" INTEGER NOT NULL,
	FOREIGN KEY("RandomizerMappingId") REFERENCES "RandomizerMapping"("Id"),
	FOREIGN KEY("BraveryMappingId") REFERENCES "BraveryMapping"("Id"),
	FOREIGN KEY("RelicsMappingId") REFERENCES "RelicsMapping"("Id")
);