import { getRedis } from "@/lib/redis";

async function clearMattersCache() {
  console.log("Clearing matters cache...");
  
  const redis = getRedis();
  
  // Clear all matters list cache entries
  const keys = await redis.keys("matters:list:*");
  
  if (keys.length > 0) {
    console.log(`Found ${keys.length} cache keys to delete`);
    await redis.del(...keys);
    console.log("✅ Cache cleared successfully");
  } else {
    console.log("No cache keys found");
  }
  
  process.exit(0);
}

clearMattersCache().catch((error) => {
  console.error("Error clearing cache:", error);
  process.exit(1);
});
