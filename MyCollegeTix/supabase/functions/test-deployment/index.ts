// Simple test function to verify GitHub integration is working
import { serve } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { method, url } = req;
  const timestamp = new Date().toISOString();

  // Handle CORS
  if (method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "apikey, X-Client-Info, Content-Type, Authorization, Accept, Accept-Language, X-Authorization",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE",
      },
    });
  }

  // Simple test response
  const response = {
    message: "🎉 GitHub integration is working!",
    timestamp,
    method,
    url,
    deployment_test: "SUCCESS",
    random_number: Math.floor(Math.random() * 1000),
  };

  return new Response(JSON.stringify(response, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "apikey, X-Client-Info, Content-Type, Authorization, Accept, Accept-Language, X-Authorization",
    },
    status: 200,
  });
});
