import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { plantInfo } from "../src/content/plants";
import { speciesInfo } from "../src/content/species-info";
import {
  hasIndexedPhoto,
  indexedPhoto,
  licenseLink,
  samePhoto,
  smallerPhoto,
} from "../src/lib/photo-index";

const index = JSON.parse(
  readFileSync("public/data/atlas/photos.index.json", "utf8"),
) as Record<string, [string, string, string, number, number]>;
const free = /^(CC BY(-SA)? \d\.\d|CC0|Public domain)$/;

describe("the stored photo list", () => {
  it("only lists kinds the site knows, each with a credit and a free licence", () => {
    for (const [key, [path, artist, license, w, h]] of Object.entries(index)) {
      expect(key in speciesInfo || key in plantInfo, key).toBe(true);
      expect(path, key).toMatch(/^[0-9a-f]\/[0-9a-f]{2}\/[^/]+$/);
      expect(artist.trim().length, key).toBeGreaterThan(1);
      expect(license, key).toMatch(free);
      expect(w, key).toBe(250);
      expect(h, key).toBeGreaterThan(50);
    }
  });

  it("covers most of the animals and trees", () => {
    const animals = Object.keys(speciesInfo).filter(hasIndexedPhoto);
    const trees = Object.keys(plantInfo).filter(hasIndexedPhoto);
    expect(animals.length).toBeGreaterThanOrEqual(85);
    expect(trees.length).toBeGreaterThanOrEqual(70);
  });

  it("builds Commons thumbnail addresses at the sizes Wikimedia serves", () => {
    const photo = indexedPhoto("Duttaphrynus melanostictus", 500)!;
    expect(photo.src).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Duttaphrynus_melanostictus_at_Niaosong_Wetland_Park%2C_Kaohsiung_2022-01-23_%28cropped%29.jpg/500px-Duttaphrynus_melanostictus_at_Niaosong_Wetland_Park%2C_Kaohsiung_2022-01-23_%28cropped%29.jpg",
    );
    expect(photo.width).toBe(500);
    expect(photo.height).toBe(Math.round((213 * 500) / 250));
    expect(photo.page).toMatch(
      /^https:\/\/commons\.wikimedia\.org\/wiki\/File:Duttaphrynus_melanostictus/,
    );
    expect(photo.name).toBe(
      "Duttaphrynus melanostictus at Niaosong Wetland Park, Kaohsiung 2022-01-23 (cropped)",
    );
    expect(photo.artist).toBe("LiCheng Shih");
    expect(photo.licenseUrl).toBe(
      "https://creativecommons.org/licenses/by/2.0/",
    );
  });

  it("returns nothing for a kind without a free photo", () => {
    expect(indexedPhoto("Geothelphusa olea")).toBeNull();
    expect(indexedPhoto("小葉欖仁")).toBeNull();
    expect(indexedPhoto(null)).toBeNull();
    expect(indexedPhoto("constructor")).toBeNull();
  });

  it("links the licence text where there is a standard page", () => {
    expect(licenseLink("CC BY-SA 4.0")).toBe(
      "https://creativecommons.org/licenses/by-sa/4.0/",
    );
    expect(licenseLink("CC0")).toBe(
      "https://creativecommons.org/publicdomain/zero/1.0/",
    );
    expect(licenseLink("Public domain")).toBeNull();
  });

  it("shrinks a thumbnail address and matches one file under two spellings", () => {
    const big = indexedPhoto("榕樹", 960)!.src;
    expect(smallerPhoto(big)).toContain("/250px-Ficus_microcarpa");
    expect(
      samePhoto(
        "Ficus microcarpa - La Gomera 01",
        "Ficus_microcarpa_-_La_Gomera_01",
      ),
    ).toBe(true);
    expect(samePhoto("Ficus microcarpa", "Bischofia javanica")).toBe(false);
  });
});
