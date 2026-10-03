import type { StaticImageData } from "next/image";
import berryJacket from "../../public/landing/berry-chore-jacket.webp";
import blackRollneck from "../../public/landing/black-rollneck.webp";
import bretonTop from "../../public/landing/breton-top.webp";
import chelseaBoots from "../../public/landing/chelsea-boots.webp";
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
import whiteTrainers from "../../public/landing/white-trainers.webp";
import type { CategoryGroup } from "@/features/wardrobe/domain/category-groups";

/*
 * The sample wardrobe every landing-page demo draws from, so the hero, catalogue, Outfit Desk and
 * review all describe one believable member. Categories and sections use the app's own
 * vocabulary; shoes sit in "other" because the catalogue has no footwear group.
 */

export const demoTags = ["Casual", "Smart", "Cosy", "Rain-ready", "Warm weather"] as const;
export type DemoTag = (typeof demoTags)[number];

export type DemoGarment = {
  id: string;
  name: string;
  category: string;
  colour: string;
  section: CategoryGroup;
  tags: readonly DemoTag[];
  image: StaticImageData;
  /** Shows behind the photo while it loads. */
  tint: string;
};

export const demoWardrobe = [
  {
    id: "off-white-tee",
    name: "Off-white crew tee",
    category: "T-shirt",
    colour: "Warm white",
    section: "tops",
    tags: ["Casual", "Warm weather"],
    image: offWhiteTee,
    tint: "bg-mist",
  },
  {
    id: "teal-camp-shirt",
    name: "Teal camp shirt",
    category: "Shirt",
    colour: "Deep teal",
    section: "tops",
    tags: ["Casual", "Warm weather"],
    image: tealShirt,
    tint: "bg-peach",
  },
  {
    id: "berry-chore-jacket",
    name: "Berry chore jacket",
    category: "Jacket",
    colour: "Berry red",
    section: "outerwear",
    tags: ["Casual"],
    image: berryJacket,
    tint: "bg-[#eadfce]",
  },
  {
    id: "stone-trousers",
    name: "Stone pleated trousers",
    category: "Trousers",
    colour: "Stone",
    section: "bottoms",
    tags: ["Casual", "Smart"],
    image: stoneTrousers,
    tint: "bg-peach",
  },
  {
    id: "citrus-knit",
    name: "Citrus knit",
    category: "Sweater",
    colour: "Citrus yellow",
    section: "tops",
    tags: ["Casual", "Cosy"],
    image: citrusKnit,
    tint: "bg-mist",
  },
  {
    id: "navy-overcoat",
    name: "Navy overcoat",
    category: "Coat",
    colour: "Navy",
    section: "outerwear",
    tags: ["Smart", "Cosy"],
    image: navyOvercoat,
    tint: "bg-mist",
  },
  {
    id: "khaki-mac",
    name: "Khaki mac",
    category: "Coat",
    colour: "Khaki",
    section: "outerwear",
    tags: ["Smart", "Rain-ready"],
    image: khakiMac,
    tint: "bg-[#eadfce]",
  },
  {
    id: "indigo-jeans",
    name: "Indigo jeans",
    category: "Jeans",
    colour: "Dark indigo",
    section: "bottoms",
    tags: ["Casual"],
    image: indigoJeans,
    tint: "bg-peach",
  },
  {
    id: "oxford-shirt",
    name: "White oxford shirt",
    category: "Shirt",
    colour: "White",
    section: "tops",
    tags: ["Smart"],
    image: oxfordShirt,
    tint: "bg-mist",
  },
  {
    id: "black-rollneck",
    name: "Black roll-neck",
    category: "Sweater",
    colour: "Black",
    section: "tops",
    tags: ["Smart", "Cosy"],
    image: blackRollneck,
    tint: "bg-[#eadfce]",
  },
  {
    id: "cream-cardigan",
    name: "Cream cable cardigan",
    category: "Cardigan",
    colour: "Cream",
    section: "tops",
    tags: ["Cosy"],
    image: creamCardigan,
    tint: "bg-mist",
  },
  {
    id: "breton-top",
    name: "Breton top",
    category: "Top",
    colour: "Navy and white",
    section: "tops",
    tags: ["Casual", "Warm weather"],
    image: bretonTop,
    tint: "bg-peach",
  },
  {
    id: "olive-shorts",
    name: "Olive chino shorts",
    category: "Shorts",
    colour: "Olive",
    section: "bottoms",
    tags: ["Casual", "Warm weather"],
    image: oliveShorts,
    tint: "bg-[#eadfce]",
  },
  {
    id: "grey-hoodie",
    name: "Grey marl hoodie",
    category: "Hoodie",
    colour: "Grey marl",
    section: "tops",
    tags: ["Casual", "Cosy"],
    image: greyHoodie,
    tint: "bg-peach",
  },
  {
    id: "rust-overshirt",
    name: "Rust cord overshirt",
    category: "Overshirt",
    colour: "Rust",
    section: "outerwear",
    tags: ["Casual", "Cosy"],
    image: rustOvershirt,
    tint: "bg-mist",
  },
  {
    id: "white-trainers",
    name: "White trainers",
    category: "Trainers",
    colour: "White",
    section: "other",
    tags: ["Casual", "Warm weather"],
    image: whiteTrainers,
    tint: "bg-mist",
  },
  {
    id: "chelsea-boots",
    name: "Suede Chelsea boots",
    category: "Boots",
    colour: "Tobacco brown",
    section: "other",
    tags: ["Smart", "Cosy"],
    image: chelseaBoots,
    tint: "bg-mist",
  },
] as const satisfies readonly DemoGarment[];

export type DemoGarmentId = (typeof demoWardrobe)[number]["id"];

const byId = new Map<string, DemoGarment>(demoWardrobe.map((garment) => [garment.id, garment]));

export function demoGarment(id: DemoGarmentId): DemoGarment {
  return byId.get(id)!;
}
