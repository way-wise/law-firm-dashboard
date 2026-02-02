import { authorized } from "@/lib/orpc";
import prisma from "@/lib/prisma";
import * as z from "zod";

const matterStatusSchema = z.object({
  id: z.string(),
  docketwiseId: z.number(),
  name: z.string(),
  duration: z.number().nullable(),
  sort: z.number().nullable(),
  matterTypeId: z.string().nullable(),
});

// Get all matter statuses
export const getMatterStatuses = authorized
  .route({
    method: "GET",
    path: "/matter-statuses",
    summary: "Get all matter statuses from Docketwise",
    tags: ["Matter Statuses"],
  })
  .output(z.array(matterStatusSchema))
  .handler(async () => {
    const statuses = await prisma.matterStatuses.findMany({
      orderBy: [
        { matterTypeId: "asc" },
        { sort: "asc" },
        { name: "asc" },
      ],
    });

    return statuses.map((status) => ({
      id: status.id,
      docketwiseId: status.docketwiseId,
      name: status.name,
      duration: status.duration,
      sort: status.sort,
      matterTypeId: status.matterTypeId,
    }));
  });
