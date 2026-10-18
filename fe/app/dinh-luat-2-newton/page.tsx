"use client";

import { GenericDetailView } from "../mo-phong-vat-ly/page";
import { dinhLuat2Newton } from "@/components/simulations/presets/dinh-luat-2-newton";

export default function NewtonSecondLawPage() {
  return <GenericDetailView preset={dinhLuat2Newton} />;
}
