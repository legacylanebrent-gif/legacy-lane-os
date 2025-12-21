Deno.serve(async (req) => {
  try {
    return Response.json({
      GOOGLE_MAPS_API_KEY: Deno.env.get("GOOGLE_MAPS_API_KEY")
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});