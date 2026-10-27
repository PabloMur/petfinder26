"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";

const ONBOARDED_KEY = "pet-finder:onboarded";

const FEATURES = [
  {
    icon: "map",
    title: "Mapa en vivo",
    description: "Mirá mascotas perdidas y encontradas cerca tuyo, actualizadas en el momento.",
  },
  {
    icon: "add_circle",
    title: "Publicá un reporte",
    description: "Subí fotos y datos en segundos si perdiste o encontraste una mascota.",
  },
  {
    icon: "notifications",
    title: "Alertas y coincidencias",
    description: "Te avisamos apenas aparece un posible avistaje cerca tuyo.",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<"bienvenida" | "ubicacion">("bienvenida");

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
    <div className="flex min-h-dvh flex-col justify-between px-6 py-8 lg:grid lg:grid-cols-[minmax(0,460px)_1fr] lg:items-stretch lg:justify-normal lg:gap-0 lg:px-0 lg:py-0">
      <div className="flex flex-1 flex-col justify-between lg:justify-center lg:gap-10 lg:px-16 lg:py-12">
        <div className="flex flex-col gap-6 lg:gap-8">
          <div className="flex items-center gap-2.5">
            <div className="h-[30px] w-[30px] rotate-45 rounded-[50%_50%_50%_6px] bg-primary" />
            <span className="text-[23px] font-bold tracking-tight">Pet Finder</span>
          </div>

          <div className="flex h-[250px] items-center justify-center rounded-3xl bg-[repeating-linear-gradient(135deg,#F2ECE3_0_9px,#EBE2D6_9px_18px)] lg:hidden">
            <Icon name="pets" size={40} className="text-ink-faint" />
          </div>

          {step === "bienvenida" ? (
            <div className="flex flex-col gap-3">
              <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-pretty lg:text-[42px]">
                Reencontrá mascotas perdidas en tu barrio
              </h1>
              <p className="text-[15px] leading-relaxed text-ink-soft lg:max-w-[380px] lg:text-[16px]">
                Pet Finder conecta a vecinos para encontrar mascotas perdidas más rápido: mirá el mapa, publicá un
                reporte o avisá si viste una.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <h1 className="text-[30px] font-semibold leading-tight tracking-tight text-pretty lg:text-[42px]">
                Tu barrio busca con vos
              </h1>
              <p className="text-[15px] leading-relaxed text-ink-soft lg:max-w-[380px] lg:text-[16px]">
                Necesitamos tu ubicación para mostrarte mascotas perdidas cerca y avisarte cuando aparezca una.
              </p>
            </div>
          )}
        </div>

        {step === "bienvenida" ? (
          <div className="flex flex-col gap-3 lg:max-w-[380px]">
            <div className="flex flex-col gap-2.5">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex items-center gap-3 rounded-2xl bg-surface-muted p-3.5">
                  <Icon name={feature.icon} size={22} className="text-primary" />
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">{feature.title}</span>
                    <span className="text-[12.5px] text-ink-soft">{feature.description}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => setStep("ubicacion")}
              className="h-14 w-full rounded-[18px] bg-primary text-[16px] font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Comenzar
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 lg:max-w-[380px]">
            <div className="flex items-center gap-3 rounded-2xl bg-surface-muted p-3.5">
              <Icon name="my_location" size={22} className="text-primary" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold">Ubicación mientras usás la app</span>
                <span className="text-[12.5px] text-ink-soft">Nunca publicamos tu dirección exacta</span>
              </div>
            </div>
            <button
              onClick={allowLocation}
              className="h-14 w-full rounded-[18px] bg-primary text-[16px] font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              Permitir ubicación
            </button>
            <button onClick={finish} className="h-12 w-full text-[15px] font-medium text-ink-muted">
              Elegir zona a mano
            </button>
          </div>
        )}
      </div>

      <div className="hidden lg:flex lg:h-dvh lg:items-center lg:justify-center lg:bg-[repeating-linear-gradient(135deg,#F2ECE3_0_14px,#EBE2D6_14px_28px)]">
        <Icon name="pets" size={140} className="text-ink-faint/60" />
      </div>
    </div>
  );
}
