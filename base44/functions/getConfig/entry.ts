Deno.serve((req) => {
  try {
    const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    return new Response(
      JSON.stringify({ GOOGLE_MAPS_API_KEY: apiKey }),
      { 
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
});