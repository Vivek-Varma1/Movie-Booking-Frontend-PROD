import { beforeEach, describe, expect, it, vi } from "vitest";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/services/http", () => ({ http: { get } }));

import { getCities } from "@/services/cities";

describe("city catalog service", () => {
  beforeEach(() => get.mockReset());

  it("loads the backend city IDs and names from /cities", async () => {
    const cities = [{ cityId: 12, name: "North Bay" }, { cityId: 41, name: "Harbor City" }];
    get.mockResolvedValue({ data: cities });
    await expect(getCities()).resolves.toEqual(cities);
    expect(get).toHaveBeenCalledWith("/cities");
  });
});
