"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

const ONBOARDED_KEY = "pet-finder:onboarded";

export default function OnboardingPage() {
  const router = useRouter();

  // A repeat visitor briefly sees this screen before the redirect lands —
  // an acceptable trade-off for not needing a second render pass (and the
  // state-in-effect churn that would come with one) just to hide it.
  useEffect(() => {
    if (localStorage.getItem(ONBOARDED_KEY)) {
      router.replace("/mapa");
    }
  }, [router]);

  function finish() {
    localStorage.setItem(ONBOARDED_KEY, "1");
    router.push("/mapa");
  }

  function allowLocation() {
    // Fire-and-forget: this just surfaces the permission prompt now: Mapa
    // fetches the actual position itself when its own "locate me" runs.
    navigator.geolocation?.getCurrentPosition(
      () => {},
      () => {},
    );
    finish();
  }

  return (
    <div className="flex min-h-dvh flex-col justify-between px-6 py-8">
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <div className="h-[30px] w-[30px] rotate-45 rounded-[50%_50%_50%_6px] bg-primary" />
          <span className="text-[23px] font-bold tracking-tight">Pet Finder</span>
        </div>

        <div className="flex h-[250px] items-center justify-center rounded-3xl bg-[repeating-linear-gradient(135deg,#F2ECE3_0_9px,#EBE2D6_9px_18px)]">
          <Icon name="pets" size={40} className="text-ink-faint" />
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-pretty">
            Tu barrio busca con vos
          </h1>
          <p className="text-[15px] leading-relaxed text-ink-soft">
            Necesitamos tu ubicación para mostrarte mascotas perdidas cerca y avisarte cuando aparezca una.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-2xl bg-surface-muted p-3.5">
          <Icon name="my_location" size={22} className="text-primary" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Ubicación mientras usás la app</span>
            <span className="text-[12.5px] text-ink-soft">Nunca publicamos tu dirección exacta</span>
          </div>
        </div>
        <button
          onClick={allowLocation}
          className="h-14 w-full rounded-[18px] bg-primary text-[16px] font-semibold text-white"
        >
          Permitir ubicación
        </button>
        <button onClick={finish} className="h-12 w-full text-[15px] font-medium text-ink-muted">
          Elegir zona a mano
        </button>
      </div>
    </div>
  );
}
