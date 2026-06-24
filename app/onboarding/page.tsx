
"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import type { Transition } from "framer-motion";

const onboardingItems = [
  {
    id: 1,
    title: "Tired of the same old struggle with food?",
    description:
      "Waiting long for riders and cold food is exhausting. You deserve better.",
    image: "/onboarding-imgs/img-one.png",
  },
  {
    id: 2,
    title: "We created a simpler and better way for you.",
    description:
      "Order combos or meals, save addresses, track rider live, fast, reliable delivery",
    image: "/onboarding-imgs/img-two.png",
  },
  {
    id: 3,
    title: "Enjoy hot, fresh meals stress-free",
    description:
      "Join thousands in Osun who switched to easier, enjoyable food delivery.",
    image: "/onboarding-imgs/img-three.png",
  },
  {
    id: 4,
    title: "Ready to eat better stress-free?",
    description:
      "Join thousands in Osun who switched to easier, enjoyable food delivery.",
    image: "/onboarding-imgs/img-four.png",
  },
];

export default function Onboarding() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const isLast = index === onboardingItems.length - 1;

  function handleNext() {
    if (isLast) {
      router.push("/signup");
    } else {
      setIndex((i) => Math.min(i + 1, onboardingItems.length - 1));
    }
  }

  function handleSkip() {
    router.push("/signup");
  }

  const transition: Transition = { duration: 0.5, ease: [0.22, 1, 0.36, 1] };

  return (
    <div className="">
      <div className="h-[50vh] flex items-center justify-center bg-white">
        <AnimatePresence mode="wait">
          <motion.div
            key={onboardingItems[index].id}
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -12 }}
            transition={transition}
            className="flex items-center justify-center w-full h-full"
          >
            <div className="flex justify-center">
              <img
                src={onboardingItems[index].image}
                alt={onboardingItems[index].title}
                className="w-full"
              />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`text-${onboardingItems[index].id}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={transition}
          >
            <h2 className="font-bold text-[32px]">
              {onboardingItems[index].title}
            </h2>
            <p className="text-[20px] text-[#A4A4A4] mt-3">
              {onboardingItems[index].description}
            </p>

            <div className="grid grid-cols-4 mt-10 gap-6">
              {onboardingItems.map((_, i) => (
                <div
                  key={i}
                  className={`col-span-1 h-[5px] rounded-md ${
                    i <= index ? "bg-[#DFB400]" : "bg-[#E8E8E8]"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-between space-x-6 mt-10">
          {!isLast && (
            <button
              onClick={handleSkip}
              className="border border-[#E9EAEB] w-[20%] p-4 rounded-lg text-center text-[#A4A4A4]"
            >
              Skip
            </button>
          )}

          <button
            onClick={handleNext}
            className={`${
              isLast ? "bg-[#DFB400] p-4 rounded-lg text-center text-white font-semibold w-full" : "bg-[#DFB400] p-4 rounded-lg text-center text-white font-semibold w-[80%]"
            }`}
          >
            {isLast ? "Get Started" : "Continue"}
          </button>
        </div>

        {isLast && (
          <div className="text-center mt-6">
            <button
              onClick={() => router.push("/login")}
              className="text-sm text-gray-600"
            >
              Already have an account? <span className="font-medium">Login</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
