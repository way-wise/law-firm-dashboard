import { authorized } from "@/lib/orpc";
import { getDocketwiseToken } from "@/lib/docketwise";
import * as z from "zod";

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;

// Test endpoint to proxy Docketwise /users API
export const testUsersProxy = authorized
  .route({
    method: "GET",
    path: "/tests/users",
    summary: "Test Docketwise /users API",
    description: "Proxy endpoint to test Docketwise users/team members API. Use this to get attorney IDs.",
    tags: ["Tests"],
  })
  .input(
    z.object({
      page: z.coerce.number().optional().default(1).describe("Page number"),
      per_page: z.coerce.number().optional().default(50).describe("Results per page"),
    })
  )
  .output(z.any())
  .handler(async ({ input }) => {
    const token = await getDocketwiseToken();
    
    if (!token) {
      throw new Error("Failed to get Docketwise token");
    }

    const queryParams = new URLSearchParams();
    if (input.page) queryParams.append("page", input.page.toString());
    if (input.per_page) queryParams.append("per_page", input.per_page.toString());

    const url = `${DOCKETWISE_API_URL}/users?${queryParams.toString()}`;
    
    console.log(`[TEST-USERS-PROXY] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Docketwise API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      url: url.replace(token, "***TOKEN***"),
      count: Array.isArray(data) ? data.length : 0,
      data: data,
    };
  });

// Test endpoint to proxy Docketwise /matters API with query params
export const testMattersProxy = authorized
  .route({
    method: "GET",
    path: "/tests/matters",
    summary: "Test Docketwise /matters API with custom query params",
    description: "Proxy endpoint to test undocumented Docketwise API filters. Add query params to test.",
    tags: ["Tests"],
  })
  .input(
    z.object({
      // Basic filters
      filter: z.string().optional().describe("General filter (e.g., 'active')"),
      
      // Assignee-related filters - coerce string inputs to numbers for Swagger UI compatibility
      assignee_id: z.coerce.number().optional().describe("Assignee ID filter"),
      attorney_id: z.coerce.number().optional().describe("Attorney ID filter"),
      attorneys: z.union([z.coerce.number(), z.array(z.coerce.number())]).optional().describe("Attorney ID(s) - single number or array (attorneys[])"),
      assignee: z.string().optional().describe("Assignee name filter (test string directly)"),
      
      // Client filter
      client_id: z.coerce.number().optional().describe("Client ID filter"),
      
      // Pagination
      page: z.coerce.number().optional().default(1).describe("Page number"),
      per_page: z.coerce.number().optional().default(10).describe("Results per page (max 200)"),
    })
  )
  .output(z.any())
  .handler(async ({ input }) => {
    const token = await getDocketwiseToken();
    
    if (!token) {
      throw new Error("Failed to get Docketwise token");
    }

    // Build query string from input
    const queryParams = new URLSearchParams();
    
    // Basic filter
    if (input.filter) queryParams.append("filter", input.filter);
    
    // Assignee-related filters
    if (input.assignee_id) queryParams.append("assignee_id", input.assignee_id.toString());
    if (input.attorney_id) queryParams.append("attorney_id", input.attorney_id.toString());
    if (input.assignee) queryParams.append("assignee", input.assignee);
    
    // Attorneys array
    if (input.attorneys !== undefined) {
      const attorneyIds: number[] = Array.isArray(input.attorneys) ? input.attorneys : [input.attorneys];
      attorneyIds.forEach((id: number) => {
        queryParams.append("attorneys[]", id.toString());
      });
    }
    
    // Client filter
    if (input.client_id) queryParams.append("client_id", input.client_id.toString());
    
    // Pagination
    if (input.page) queryParams.append("page", input.page.toString());
    if (input.per_page) queryParams.append("per_page", input.per_page.toString());

    const url = `${DOCKETWISE_API_URL}/matters?${queryParams.toString()}`;
    
    console.log(`[TEST-PROXY] Fetching: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Docketwise API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Return data with metadata
    return {
      success: true,
      url: url.replace(token, "***TOKEN***"),
      count: Array.isArray(data) ? data.length : 0,
      data: data,
    };
  });
