import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

const US_STATES = [
  { name: "Alabama", code: "AL" },
  { name: "Alaska", code: "AK" },
  { name: "Arizona", code: "AZ" },
  { name: "Arkansas", code: "AR" },
  { name: "California", code: "CA" },
  { name: "Colorado", code: "CO" },
  { name: "Connecticut", code: "CT" },
  { name: "Delaware", code: "DE" },
  { name: "Florida", code: "FL" },
  { name: "Georgia", code: "GA" },
  { name: "Hawaii", code: "HI" },
  { name: "Idaho", code: "ID" },
  { name: "Illinois", code: "IL" },
  { name: "Indiana", code: "IN" },
  { name: "Iowa", code: "IA" },
  { name: "Kansas", code: "KS" },
  { name: "Kentucky", code: "KY" },
  { name: "Louisiana", code: "LA" },
  { name: "Maine", code: "ME" },
  { name: "Maryland", code: "MD" },
  { name: "Massachusetts", code: "MA" },
  { name: "Michigan", code: "MI" },
  { name: "Minnesota", code: "MN" },
  { name: "Mississippi", code: "MS" },
  { name: "Missouri", code: "MO" },
  { name: "Montana", code: "MT" },
  { name: "Nebraska", code: "NE" },
  { name: "Nevada", code: "NV" },
  { name: "New Hampshire", code: "NH" },
  { name: "New Jersey", code: "NJ" },
  { name: "New Mexico", code: "NM" },
  { name: "New York", code: "NY" },
  { name: "North Carolina", code: "NC" },
  { name: "North Dakota", code: "ND" },
  { name: "Ohio", code: "OH" },
  { name: "Oklahoma", code: "OK" },
  { name: "Oregon", code: "OR" },
  { name: "Pennsylvania", code: "PA" },
  { name: "Rhode Island", code: "RI" },
  { name: "South Carolina", code: "SC" },
  { name: "South Dakota", code: "SD" },
  { name: "Tennessee", code: "TN" },
  { name: "Texas", code: "TX" },
  { name: "Utah", code: "UT" },
  { name: "Vermont", code: "VT" },
  { name: "Virginia", code: "VA" },
  { name: "Washington", code: "WA" },
  { name: "Washington D.C.", code: "DC" },
  { name: "West Virginia", code: "WV" },
  { name: "Wisconsin", code: "WI" },
  { name: "Wyoming", code: "WY" }
];

async function scrapeCitiesForState(stateCode) {
  try {
    const response = await fetch(`https://www.estatesales.net/${stateCode}`);
    const html = await response.text();
    
    const cities = [];
    
    // Extract larger cities
    const largerCitiesMatch = html.match(/<h2>Larger Cities<\/h2>([\s\S]*?)<h2>/);
    if (largerCitiesMatch) {
      const cityLinks = largerCitiesMatch[1].match(/href="https:\/\/www\.estatesales\.net\/[A-Z-]+\/([^"]+)"/g);
      if (cityLinks) {
        cityLinks.forEach(link => {
          const cityMatch = link.match(/\/([^"\/]+)"/);
          if (cityMatch) {
            const citySlug = cityMatch[1];
            const cityName = citySlug.replace(/-/g, ' ');
            cities.push({ name: cityName, slug: citySlug, type: 'larger' });
          }
        });
      }
    }
    
    // Extract smaller cities
    const smallerCitiesMatch = html.match(/<h2>Smaller Cities<\/h2>([\s\S]*?)<h2>/);
    if (smallerCitiesMatch) {
      const cityLinks = smallerCitiesMatch[1].match(/href="https:\/\/www\.estatesales\.net\/[A-Z-]+\/([^"]+)"/g);
      if (cityLinks) {
        cityLinks.forEach(link => {
          const cityMatch = link.match(/\/([^"\/]+)"/);
          if (cityMatch) {
            const citySlug = cityMatch[1];
            const cityName = citySlug.replace(/-/g, ' ');
            cities.push({ name: cityName, slug: citySlug, type: 'smaller' });
          }
        });
      }
    }
    
    return cities;
  } catch (error) {
    console.error(`Error scraping cities for ${stateCode}:`, error);
    return [];
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { stateCode, scrapeAll } = await req.json();

    if (scrapeAll) {
      // Scrape all states (run in batches to avoid timeout)
      const allData = [];
      
      for (const state of US_STATES) {
        const cities = await scrapeCitiesForState(state.code);
        allData.push({
          ...state,
          cities: cities,
          cityCount: cities.length
        });
        
        // Add small delay to be respectful
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      return Response.json({ 
        success: true, 
        data: allData,
        totalStates: allData.length,
        totalCities: allData.reduce((sum, s) => sum + s.cityCount, 0)
      });
    } else if (stateCode) {
      // Scrape single state
      const state = US_STATES.find(s => s.code === stateCode);
      if (!state) {
        return Response.json({ error: 'Invalid state code' }, { status: 400 });
      }
      
      const cities = await scrapeCitiesForState(stateCode);
      
      return Response.json({ 
        success: true, 
        data: {
          ...state,
          cities: cities,
          cityCount: cities.length
        }
      });
    } else {
      return Response.json({ error: 'Missing stateCode or scrapeAll parameter' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});