import { describe, expect, it } from "vitest";

import { buildPresetFilters } from "./filterUtils";

describe("buildPresetFilters", () => {
  it("builds where clause with basic params and student purchase filters", () => {
    const purchased = new Set(["p1", "p2"]);
    const { where, activeFilters, queryParams } = buildPresetFilters({
      params: {
        q: "flow",
        discipline: "pole,exotic",
        price: "premium",
        media: "image",
        purchase: "bought",
      },
      schoolId: "school-1",
      isStudent: true,
      isTeacherOrAdmin: false,
      userId: "u1",
      purchasedPresetIds: purchased,
    });

    expect(where.schoolId).toBe("school-1");
    expect(where.premiumRequired).toBe(true);
    expect(where.imagePublicId).toEqual({ not: null });
    expect(where.id).toEqual({ in: ["p1", "p2"] });
    expect(activeFilters).toBe(5);
    expect(queryParams.get("q")).toBe("flow");
    expect(queryParams.get("discipline")).toBe("pole,exotic");
    expect(queryParams.get("media")).toBe("image");
  });

  it("handles owner filter for teachers/admins and notBought purchase filter", () => {
    const purchased = new Set(["p1"]);
    const { where } = buildPresetFilters({
      params: {
        owner: "me",
        purchase: "notBought",
      },
      schoolId: null,
      isStudent: true,
      isTeacherOrAdmin: true,
      userId: "teacher-1",
      purchasedPresetIds: purchased,
    });

    expect(where.createdByUserId).toBe("teacher-1");
    expect(where.id).toEqual({ notIn: ["p1"] });
  });
});
