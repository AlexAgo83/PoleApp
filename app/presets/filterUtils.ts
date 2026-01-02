import { Prisma } from "@prisma/client";

type FilterParams = {
  params: Record<string, string | string[] | undefined>;
  schoolId?: string | null;
  isStudent: boolean;
  isTeacherOrAdmin: boolean;
  userId?: string | null;
  purchasedPresetIds: Set<string>;
};

type ParsedFilters = {
  q: string;
  disciplineFilters: string[];
  priceFilter: string;
  ownerFilter: string;
  purchaseFilter: string;
  mediaFilter: string;
  rawPage: number;
  where: Prisma.PresetWhereInput;
  activeFilters: number;
  queryParams: URLSearchParams;
};

const parseMulti = (value?: string | string[]) =>
  typeof value === "string"
    ? value
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : Array.isArray(value)
      ? value.flatMap((v) => v.split(",").map((w) => w.trim()).filter(Boolean))
      : [];

export function buildPresetFilters({
  params,
  schoolId,
  isStudent,
  isTeacherOrAdmin,
  userId,
  purchasedPresetIds,
}: FilterParams): ParsedFilters {
  const q = params.q?.toString().trim() || "";
  const disciplineFilters = parseMulti(params.discipline);
  const priceFilter = params.price?.toString() || "";
  const ownerFilter = params.owner?.toString() || "";
  const purchaseFilter = params.purchase?.toString() || "";
  const mediaFilter = params.media?.toString() || "";
  const rawPage = Number(params.page ?? "1");

  const where: Prisma.PresetWhereInput = {
    ...(schoolId ? { schoolId } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(disciplineFilters.length
      ? {
          OR: [
            { disciplineId: { in: disciplineFilters } },
            { discipline: { in: disciplineFilters, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  if (priceFilter === "premium") {
    where.premiumRequired = true;
  } else if (priceFilter === "credits") {
    where.priceCredits = { gt: 0 };
  } else if (priceFilter === "free") {
    where.premiumRequired = false;
    where.priceCredits = 0;
  }
  if (ownerFilter === "me") {
    if (isTeacherOrAdmin && userId) {
      where.createdByUserId = userId;
    } else if (isStudent) {
      where.id = { in: purchasedPresetIds.size ? Array.from(purchasedPresetIds) : ["__none__"] };
    }
  }
  if (mediaFilter === "image") {
    where.imagePublicId = { not: null };
  } else if (mediaFilter === "video") {
    where.videoPublicId = { not: null };
  }
  if (purchaseFilter === "bought" && isStudent) {
    where.id = { in: purchasedPresetIds.size ? Array.from(purchasedPresetIds) : ["__none__"] };
  } else if (purchaseFilter === "notBought" && isStudent && purchasedPresetIds.size > 0) {
    where.id = { notIn: Array.from(purchasedPresetIds) };
  }

  const activeFilters = [
    q && q.length > 0,
    disciplineFilters.length > 0,
    priceFilter,
    ownerFilter,
    purchaseFilter,
    mediaFilter,
  ].filter(Boolean).length;

  const queryParams = new URLSearchParams();
  if (q) queryParams.set("q", q);
  if (disciplineFilters.length) queryParams.set("discipline", disciplineFilters.join(","));
  if (priceFilter) queryParams.set("price", priceFilter);
  if (ownerFilter) queryParams.set("owner", ownerFilter);
  if (purchaseFilter) queryParams.set("purchase", purchaseFilter);
  if (mediaFilter) queryParams.set("media", mediaFilter);

  return {
    q,
    disciplineFilters,
    priceFilter,
    ownerFilter,
    purchaseFilter,
    mediaFilter,
    rawPage,
    where,
    activeFilters,
    queryParams,
  };
}
