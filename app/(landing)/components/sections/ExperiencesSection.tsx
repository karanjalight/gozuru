"use client";

import { button } from "framer-motion/client";
import { ArrowBigDown, ArrowRight } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

type WhenFilter =
  | "all"
  | "tomorrow"
  | "this-week"
  | "dinners"
  | "cooking-classes"
  | "food-tours";

const experiences = [
  {
    title: "Enjoy an Authentic Italian Dinner",
    location: "Paris, France",
    tag: "Dinner",
    when: "tomorrow" as WhenFilter,
    type: "dinners" as WhenFilter,
    rating: 5.0,
    reviews: 51,
    price: "€72",
    image:
      "https://images.pexels.com/photos/104084/pexels-photo-104084.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    title: "Italian Dinner in the Heart of Paris",
    location: "Paris, France",
    tag: "Dinner",
    when: "this-week" as WhenFilter,
    type: "dinners" as WhenFilter,
    rating: 4.9,
    reviews: 39,
    price: "€65",
    image:
      "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    title: "French Macaron Workshop with a Local Chef",
    location: "Paris, France",
    tag: "Cooking class",
    when: "tomorrow" as WhenFilter,
    type: "cooking-classes" as WhenFilter,
    rating: 4.9,
    reviews: 399,
    price: "€166",
    image:
      "https://images.pexels.com/photos/4109992/pexels-photo-4109992.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
  {
    title: "Picnic Experience in a Hidden Park",
    location: "Paris, France",
    tag: "Picnic",
    when: "this-week" as WhenFilter,
    type: "food-tours" as WhenFilter,
    rating: 4.9,
    reviews: 44,
    price: "€111",
    image:
      "https://images.pexels.com/photos/4109992/pexels-photo-4109992.jpeg?auto=compress&cs=tinysrgb&w=1200",
  },
] as const;

export function ExperiencesGrid() {
  const [activeFilter, setActiveFilter] = useState<WhenFilter>("tomorrow");

  const filteredExperiences = experiences.filter((exp) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "tomorrow" || activeFilter === "this-week") {
      return exp.when === activeFilter;
    }
    return exp.type === activeFilter;
  });

  return (
    <section
      id="experiences"
      className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 lg:px-6 lg:py-14 text-zinc-900  transition-colors"
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-500">
              Discover nearby
            </p>
            <h2 className="mt-1 flex gap-2 text-2xl  text-gray-400 font-semibold tracking-tight sm:text-4xl">
              popular in:{" "}
              <span className="text-orange-500 flex items-center gap-1">
                Paris
                <span className="ml-1 align-middle text-xs">
                  <ArrowBigDown className="w-4 h-4" />
                </span>
              </span>
            </h2>
          </div>
          <div className="flex flex-col items-end  gap-2">
            <div>
              <button className="text-xs text-right flex lg:mb-2 font-medium text-orange-500 hover:text-orange-600">
                View all
                <span className="ml-1 align-middle text-xs">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            </div>
            {/* filter toggles */}
            <div className="flex w-full  flex-wrap gap-6 text-sm text-zinc-500 dark:text-zinc-400">
              {(
                [
                  { id: "all", label: "All experiences" },
                  { id: "tomorrow", label: "tomorrow" },
                  { id: "this-week", label: "this week" },
                  { id: "dinners", label: "dinners" },
                  { id: "cooking-classes", label: "cooking classes" },
                  { id: "food-tours", label: "food tours" },
                ] as { id: WhenFilter; label: string }[]
              ).map((filter) => {
                const isActive = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => setActiveFilter(filter.id)}
                    className={`pb-1 text-sm font-semibold capitalize transition-colors sm:text-md ${
                      isActive
                        ? "border-b-2 border-orange-500 text-orange-500"
                        : "border-b-2 border-transparent hover:text-orange-500"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {filteredExperiences.map((exp) => (
          <article
            key={exp.title}
            className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm transition hover:-translate-y-1.5 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="relative h-80 w-full">
              <Image
                src={exp.image}
                alt={exp.title}
                fill
                className="object-cover"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-3  left-3 right-3 flex items-end justify-between gap-3 text-xs text-white">
                <div className="space-y-1  w-full">
                  <span className="inline-flex items-center rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                    {exp.tag}
                  </span>
                  <h3 className="line-clamp-2 text-sm font-semibold">
                    {exp.title}
                  </h3>
                  <p className="text-lg  uppercase  ">{exp.location}</p>

                  <div className="flex items-center justify-between gap-4 text-[15px] sm:text-md">
                    <div className="flex items-center gap-1 ">
                      <span className="text-[13px] text-amber-400">★</span>
                      <span className="font-semibold">
                        {exp.rating.toFixed(1)}
                      </span>
                      <span className="text-zinc-700">
                        ({exp.reviews.toLocaleString()})
                      </span>
                    </div>
                    <div className="text-right text-zinc-700 dark:text-zinc-700">
                      <span className="text-sm font-semibold ">
                        {exp.price}
                      </span>
                      <span className="ml-1 text-[11px] text-black 500 dark:text-zinc-400">
                        /guest
                      </span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      className="inline-flex w-full items-center justify-center rounded-full bg-zinc-900 px-4 py-4 text-[15px] font-semibold  tracking-wide text-white shadow-sm transition hover:bg-zinc-800 dark:bg-orange-500 dark:hover:bg-orange-600"
                    >
                      View details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
