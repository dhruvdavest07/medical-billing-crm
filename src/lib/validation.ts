import { z } from "zod";

const ORDER_STATUS_ENUM = z.enum([
  "new", "in_progress", "submitted", "pending", "paid", "denied", "appeal", "completed",
]);

export const CreateOrderSchema = z.strictObject({
  patientId: z.string().min(1),
  facilityId: z.string().optional(),
  status: ORDER_STATUS_ENUM.default("new"),
  priority: z.number().int().min(0).max(100).default(0),
  serviceStartDate: z.coerce.date().optional(),
  serviceEndDate: z.coerce.date().optional(),
  claimNumber: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
}).refine(
  (data) => {
    if (data.serviceStartDate && data.serviceEndDate) {
      return data.serviceStartDate <= data.serviceEndDate;
    }
    return true;
  },
  { message: "Service start date must be before or equal to service end date" },
);

export const UpdateOrderSchema = z.strictObject({
  status: ORDER_STATUS_ENUM.optional(),
  priority: z.number().int().min(0).max(100).optional(),
  assignedToId: z.string().optional(),
  facilityId: z.string().nullable().optional(),
  claimNumber: z.string().max(100).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  serviceStartDate: z.coerce.date().nullable().optional(),
  serviceEndDate: z.coerce.date().nullable().optional(),
}).partial();

export const CreateCommentSchema = z.strictObject({
  text: z.string().trim().min(1, "Comment text is required").max(5000, "Comment must be at most 5000 characters"),
  orderId: z.string().optional(),
});

export const CreateFacilitySchema = z.strictObject({
  name: z.string().min(1, "Facility name is required").max(200),
  email: z.string().email().max(255).optional().or(z.literal("")),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  zip: z.string().max(20).optional(),
  instructions: z.string().max(10000).optional(),
  thirdPartyProcessor: z.string().max(200).optional(),
  thirdPartyDetails: z.string().max(1000).optional(),
});

export const UpdateFacilitySchema = CreateFacilitySchema.partial();

export const SearchSchema = z.string().trim().max(100).optional();

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;
export type UpdateOrderInput = z.infer<typeof UpdateOrderSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type CreateFacilityInput = z.infer<typeof CreateFacilitySchema>;
export type UpdateFacilityInput = z.infer<typeof UpdateFacilitySchema>;
