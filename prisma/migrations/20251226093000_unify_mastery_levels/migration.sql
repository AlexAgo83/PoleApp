-- Unify mastery levels to: NOVELTY/INITIATED/PASSED/FLUID_CHOREO
ALTER TYPE "MasteryLevel" ADD VALUE IF NOT EXISTS 'NOVELTY';
ALTER TYPE "MasteryLevel" ADD VALUE IF NOT EXISTS 'FLUID_CHOREO';
-- Existing values INITIATED, PASSED, FLUID, CHOREO remain; mapping will be handled in application logic or subsequent updates.
