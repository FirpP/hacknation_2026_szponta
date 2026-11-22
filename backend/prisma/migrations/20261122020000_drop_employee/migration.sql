-- Radar jest publiczny i tylko do odczytu: usunięcie konta pracownika z templatki
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "Employee";
PRAGMA foreign_keys=on;
