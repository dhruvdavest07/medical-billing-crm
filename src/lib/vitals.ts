import { prisma } from "@/lib/prisma";

export type VitalSnapshot = {
  id: string;
  patientId: string;
  encounterId: string | null;
  weightKg: number | null;
  heightCm: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
  bmi: number | null;
  spO2: number | null;
  temperature: number | null;
  recordedAt: string;
};

export function serializeVital(vital: {
  id: string;
  patientId: string;
  encounterId: string | null;
  weightKg: number | null;
  heightCm: number | null;
  bloodPressureSystolic: number | null;
  bloodPressureDiastolic: number | null;
  heartRate: number | null;
  bmi: number | null;
  spO2: number | null;
  temperature: number | null;
  recordedAt: Date;
}): VitalSnapshot {
  return {
    id: vital.id,
    patientId: vital.patientId,
    encounterId: vital.encounterId,
    weightKg: vital.weightKg,
    heightCm: vital.heightCm,
    bloodPressureSystolic: vital.bloodPressureSystolic,
    bloodPressureDiastolic: vital.bloodPressureDiastolic,
    heartRate: vital.heartRate,
    bmi: vital.bmi,
    spO2: vital.spO2,
    temperature: vital.temperature,
    recordedAt: vital.recordedAt.toISOString(),
  };
}

export async function getLatestVitalSnapshot(patientId: string) {
  const vital = await prisma.vital.findFirst({
    where: { patientId },
    orderBy: { recordedAt: "desc" },
  });

  return vital ? serializeVital(vital) : null;
}
