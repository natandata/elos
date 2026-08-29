"use client";

import { REPLAY_TOUR_EVENT } from "@/components/onboarding/OnboardingTour";

export function ReplayTourButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(REPLAY_TOUR_EVENT))}
      className="btn btn-ghost w-full !py-2 !text-sm"
    >
      Rever tutorial
    </button>
  );
}
