"use server";

import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/safe-logger";
import { revalidatePath } from "next/cache";

// Fetches all patients for the default organization (since auth is not fully hooked up yet)
export async function getPatients() {
    try {
        // For MVP, we'll just fetch all patients or find the default org
        const patients = await prisma.patient.findMany({
            orderBy: {
                createdAt: "desc",
            },
        });
        return { data: patients, error: null };
    } catch (error) {
        logServerError("Patient server action fetch failed", error);
        return { data: null, error: "Failed to fetch patients." };
    }
}

export async function createPatient(formData: FormData) {
    try {
        // Get the first organization as the default
        const org = await prisma.organization.findFirst();
        if (!org) throw new Error("No organization found");

        const firstName = formData.get("firstName") as string;
        const lastName = formData.get("lastName") as string;
        const email = formData.get("email") as string;
        const phone = formData.get("phone") as string;
        const dobString = formData.get("dateOfBirth") as string;

        const patient = await prisma.patient.create({
            data: {
                organizationId: org.id,
                firstName,
                lastName,
                email: email || null,
                phone: phone || null,
                dateOfBirth: dobString ? new Date(dobString) : null,
            },
        });

        revalidatePath("/patients");
        return { data: patient, error: null };
    } catch (error) {
        logServerError("Patient server action create failed", error);
        return { data: null, error: "Failed to create patient." };
    }
}
