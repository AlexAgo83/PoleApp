import { describe, expect, it } from "vitest";

import { __testing } from "../courseGenerator";

describe("course generator scoring", () => {
  it("prioritises discovery, revision then safe with reasons", () => {
    const suggestions = __testing.selectTopSuggestions(
      [
        {
          positionId: "a",
          name: "Inédit",
          type: "TRICK",
          recentOccurrences: 0,
          unsafeForStudents: [],
          perStudentStatus: ["NOT_STARTED", "NOT_STARTED", "IN_PROGRESS", "NOT_STARTED"],
        },
        {
          positionId: "b",
          name: "Révision",
          type: "SPIN",
          recentOccurrences: 0,
          unsafeForStudents: [],
          perStudentStatus: ["IN_PROGRESS", "IN_PROGRESS", "PASSED", "IN_PROGRESS"],
        },
        {
          positionId: "c",
          name: "Safe",
          type: "WARMUP",
          recentOccurrences: 0,
          unsafeForStudents: [],
          perStudentStatus: ["PASSED", "MASTERED", "PASSED", "MASTERED"],
        },
      ],
      3
    );

    expect(suggestions).toHaveLength(3);
    expect(suggestions[0]).toMatchObject({ positionId: "a", tag: "DISCOVERY" });
    expect(suggestions[1]).toMatchObject({ positionId: "b", tag: "REVISION" });
    expect(suggestions[2]).toMatchObject({ positionId: "c", tag: "SAFE" });
    expect(suggestions[0].reason).toContain("n'ont jamais tenté");
    expect(suggestions[2].reason).toContain("maîtrisent");
  });

  it("penalises positions seen recently", () => {
    const suggestions = __testing.selectTopSuggestions(
      [
        {
          positionId: "fresh",
          name: "Nouvelle",
          type: "TRICK",
          recentOccurrences: 0,
          unsafeForStudents: [],
          perStudentStatus: ["NOT_STARTED", "NOT_STARTED"],
        },
        {
          positionId: "repeated",
          name: "Déjà vue",
          type: "TRICK",
          recentOccurrences: 3,
          unsafeForStudents: [],
          perStudentStatus: ["NOT_STARTED", "NOT_STARTED"],
        },
      ],
      1
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].positionId).toBe("fresh");
  });
});
