import type { StaticImageData } from "next/image";
import berryJacket from "../../public/landing/berry-chore-jacket.webp";
import blackRollneck from "../../public/landing/black-rollneck.webp";
import bretonTop from "../../public/landing/breton-top.webp";
import citrusKnit from "../../public/landing/citrus-knit.webp";
import creamCardigan from "../../public/landing/cream-cardigan.webp";
import greyHoodie from "../../public/landing/grey-hoodie.webp";
import indigoJeans from "../../public/landing/indigo-jeans.webp";
import khakiMac from "../../public/landing/khaki-mac.webp";
import navyOvercoat from "../../public/landing/navy-overcoat.webp";
import offWhiteTee from "../../public/landing/off-white-tee.webp";
import oliveShorts from "../../public/landing/olive-shorts.webp";
import oxfordShirt from "../../public/landing/oxford-shirt.webp";
import rustOvershirt from "../../public/landing/rust-overshirt.webp";
import stoneTrousers from "../../public/landing/stone-trousers.webp";
import tealShirt from "../../public/landing/teal-camp-shirt.webp";
import {
  categoryGroupForCategory,
  type CategoryGroup,
  type detailedCategoryOptions,
} from "@/features/wardrobe/domain/category-groups";

/*
 * The sample wardrobe every landing-page demo draws from, so the hero, catalogue, Outfit Desk and
 * review all describe one believable member. Every value is one the app could really hold:
 * categories come from the controlled list, each section is derived from its category, and the
 * style tags are aesthetic descriptors that pass the garment-analysis prompt's rules (formality
 * and seasons have their own fields, so they never appear as tags).
 */

type DemoTag = "Cosy" | "Minimal" | "Preppy" | "Retro" | "Workwear";

type DemoCategory = (typeof detailedCategoryOptions)[number][0];

export type DemoGarment = {
  id: string;
  name: string;
  category: DemoCategory;
  colour: string;
  section: CategoryGroup;
  tags: readonly DemoTag[];
  image: StaticImageData;
  /** Shows behind the photo while it loads. */
  tint: string;
};

const garments = [
  {
    id: "off-white-tee",
    name: "Off-white crew tee",
    category: "T-shirt",
    colour: "Warm white",
    tags: ["Minimal"],
    image: offWhiteTee,
    tint: "bg-mist",
  },
  {
    id: "teal-camp-shirt",
    name: "Teal camp shirt",
    category: "Shirt",
    colour: "Deep teal",
    tags: ["Retro"],
    image: tealShirt,
    tint: "bg-peach",
  },
  {
    id: "berry-chore-jacket",
    name: "Berry chore jacket",
    category: "Jacket",
    colour: "Berry red",
    tags: ["Workwear"],
    image: berryJacket,
    tint: "bg-[#eadfce]",
  },
  {
    id: "stone-trousers",
    name: "Stone pleated trousers",
    category: "Trousers",
    colour: "Stone",
    tags: ["Minimal"],
    image: stoneTrousers,
    tint: "bg-peach",
  },
  {
    id: "citrus-knit",
    name: "Citrus knit",
    category: "Sweater",
    colour: "Citrus yellow",
    tags: ["Cosy", "Retro"],
    image: citrusKnit,
    tint: "bg-mist",
  },
  {
    id: "navy-overcoat",
    name: "Navy overcoat",
    category: "Coat",
    colour: "Navy",
    tags: ["Minimal"],
    image: navyOvercoat,
    tint: "bg-mist",
  },
  {
    id: "khaki-mac",
    name: "Khaki mac",
    category: "Coat",
    colour: "Khaki",
    tags: ["Preppy"],
    image: khakiMac,
    tint: "bg-[#eadfce]",
  },
  {
    id: "indigo-jeans",
    name: "Indigo jeans",
    category: "Jeans",
    colour: "Dark indigo",
    tags: ["Workwear"],
    image: indigoJeans,
    tint: "bg-peach",
  },
  {
    id: "oxford-shirt",
    name: "White oxford shirt",
    category: "Shirt",
    colour: "White",
    tags: ["Preppy"],
    image: oxfordShirt,
    tint: "bg-mist",
  },
  {
    id: "black-rollneck",
    name: "Black roll-neck",
    category: "Sweater",
    colour: "Black",
    tags: ["Cosy", "Minimal"],
    image: blackRollneck,
    tint: "bg-[#eadfce]",
  },
  {
    id: "cream-cardigan",
    name: "Cream cable cardigan",
    category: "Cardigan",
    colour: "Cream",
    tags: ["Cosy", "Preppy"],
    image: creamCardigan,
    tint: "bg-mist",
  },
  {
    id: "breton-top",
    name: "Breton top",
    category: "Top",
    colour: "Navy and white",
    tags: ["Preppy"],
    image: bretonTop,
    tint: "bg-peach",
  },
  {
    id: "olive-shorts",
    name: "Olive chino shorts",
    category: "Shorts",
    colour: "Olive",
    tags: ["Workwear"],
    image: oliveShorts,
    tint: "bg-[#eadfce]",
  },
  {
    id: "grey-hoodie",
    name: "Grey marl hoodie",
    category: "Hoodie",
    colour: "Grey marl",
    tags: ["Cosy"],
    image: greyHoodie,
    tint: "bg-peach",
  },
  {
    id: "rust-overshirt",
    name: "Rust cord overshirt",
    category: "Overshirt",
    colour: "Rust",
    tags: ["Retro", "Workwear"],
    image: rustOvershirt,
    tint: "bg-mist",
  },
] as const satisfies readonly Omit<DemoGarment, "section">[];

export type DemoGarmentId = (typeof garments)[number]["id"];

export const demoWardrobe: readonly DemoGarment[] = garments.map((garment) => ({
  ...garment,
  section: categoryGroupForCategory(garment.category),
}));

const byId = new Map(demoWardrobe.map((garment) => [garment.id, garment]));

export function demoGarment(id: DemoGarmentId): DemoGarment {
  return byId.get(id)!;
}
