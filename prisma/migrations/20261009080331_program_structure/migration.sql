-- DropIndex
DROP INDEX "set_log_workoutId_exerciseId_setNumber_key";

-- AlterTable
ALTER TABLE "exercise" ADD COLUMN     "isUnilateral" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "program_day" DROP COLUMN "isBonus",
ADD COLUMN     "rotationSlot" INTEGER;

-- AlterTable
ALTER TABLE "program_exercise" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "supersetGroup" INTEGER,
ALTER COLUMN "repMin" DROP NOT NULL,
ALTER COLUMN "repMax" DROP NOT NULL;

-- AlterTable
ALTER TABLE "set_log" ADD COLUMN     "programExerciseId" TEXT;

-- CreateIndex
CREATE INDEX "set_log_exerciseId_idx" ON "set_log"("exerciseId");

-- CreateIndex
CREATE UNIQUE INDEX "set_log_workoutId_programExerciseId_setNumber_key" ON "set_log"("workoutId", "programExerciseId", "setNumber");

-- AddForeignKey
ALTER TABLE "set_log" ADD CONSTRAINT "set_log_programExerciseId_fkey" FOREIGN KEY ("programExerciseId") REFERENCES "program_exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

