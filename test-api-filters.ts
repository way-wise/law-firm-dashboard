/**
 * Test script to discover undocumented Docketwise API filter parameters
 * Run: npx tsx test-api-filters.ts
 */

import { getDocketwiseToken } from "./lib/docketwise";

const DOCKETWISE_API_URL = process.env.DOCKETWISE_API_URL!;

async function testApiFilters() {
  console.log("🧪 Testing Docketwise API undocumented filters...\n");
  
  const token = await getDocketwiseToken();
  if (!token) {
    console.error("❌ Failed to get token");
    return;
  }

  // Test different filter patterns
  const testCases = [
    {
      name: "No filters (baseline)",
      url: `${DOCKETWISE_API_URL}/matters?page=1&per_page=5`,
    },
    {
      name: "filter=active",
      url: `${DOCKETWISE_API_URL}/matters?filter=active&page=1&per_page=5`,
    },
    {
      name: "user_id (single user)",
      url: `${DOCKETWISE_API_URL}/matters?user_id=326481&page=1&per_page=5`,
    },
    {
      name: "user_ids[] array syntax",
      url: `${DOCKETWISE_API_URL}/matters?user_ids[]=326481&page=1&per_page=5`,
    },
    {
      name: "assignee_id",
      url: `${DOCKETWISE_API_URL}/matters?assignee_id=326481&page=1&per_page=5`,
    },
    {
      name: "attorney_id",
      url: `${DOCKETWISE_API_URL}/matters?attorney_id=326481&page=1&per_page=5`,
    },
    {
      name: "status filter",
      url: `${DOCKETWISE_API_URL}/matters?status=active&page=1&per_page=5`,
    },
  ];

  for (const testCase of testCases) {
    console.log(`\n📋 Testing: ${testCase.name}`);
    console.log(`   URL: ${testCase.url.replace(DOCKETWISE_API_URL, '')}`);
    
    try {
      const response = await fetch(testCase.url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.log(`   ❌ Status: ${response.status}`);
        continue;
      }

      const data = await response.json();
      const count = Array.isArray(data) ? data.length : 0;
      
      console.log(`   ✅ Status: 200`);
      console.log(`   📊 Results: ${count} matters`);
      
      // Check if filtering worked by examining first result
      if (count > 0 && data[0]) {
        const matter = data[0];
        console.log(`   🔍 Sample matter:`, {
          id: matter.id,
          title: matter.title?.substring(0, 30) + '...',
          attorney_id: matter.attorney_id,
          status: matter.status,
        });
      }
    } catch (error) {
      console.log(`   ❌ Error:`, error instanceof Error ? error.message : error);
    }
  }

  console.log("\n\n✅ Test complete!");
}

testApiFilters().catch(console.error);
