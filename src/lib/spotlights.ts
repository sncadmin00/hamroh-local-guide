import guide1 from "@/assets/guide-1.jpg";
import guide2 from "@/assets/guide-2.jpg";
import heroSamarkand from "@/assets/hero-samarkand.jpg";
import heroBukhara from "@/assets/hero-bukhara.jpg";

export type Spotlight = {
  id: string;
  labelKey: string;
  titleKey: string;
  descKey: string;
  image: string;
  href: string;
};

export const spotlights: Spotlight[] = [
  {
    id: "aral-nukus",
    labelKey: "spot.newGuide.label",
    titleKey: "spot.aral.title",
    descKey: "spot.aral.desc",
    image: heroBukhara,
    href: "/guides",
  },
  {
    id: "samarkand-photo",
    labelKey: "spot.newRoute.label",
    titleKey: "spot.samarkand.title",
    descKey: "spot.samarkand.desc",
    image: heroSamarkand,
    href: "/guides",
  },
  {
    id: "guide-aziz",
    labelKey: "spot.newGuide.label",
    titleKey: "spot.aziz.title",
    descKey: "spot.aziz.desc",
    image: guide1,
    href: "/guides",
  },
  {
    id: "crafts-bazaar",
    labelKey: "spot.news.label",
    titleKey: "spot.crafts.title",
    descKey: "spot.crafts.desc",
    image: guide2,
    href: "/guides",
  },
];
