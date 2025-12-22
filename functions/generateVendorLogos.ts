import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const vendorLogoPrompts = [
  { company: "Premier Appraisal Services", prompt: "Professional modern logo for 'Premier Appraisal Services', clean minimalist design, appraiser theme with magnifying glass icon, blue and gold color scheme, white background, simple geometric shapes" },
  { company: "Heritage Auction House", prompt: "Professional modern logo for 'Heritage Auction House', elegant sophisticated design, auction gavel icon, deep red and gold colors, white background, classic and timeless" },
  { company: "Elite Carpet & Upholstery Care", prompt: "Professional modern logo for 'Elite Carpet & Upholstery Care', clean service design, carpet cleaning theme, fresh blue and green colors, white background, clean lines" },
  { company: "Quick Cashier Solutions", prompt: "Professional modern logo for 'Quick Cashier Solutions', tech-focused design, payment terminal icon, modern blue and gray colors, white background, tech style" },
  { company: "ProClean Estate Services", prompt: "Professional modern logo for 'ProClean Estate Services', clean service design, cleaning sparkle icon, bright blue and white colors, white background, fresh and modern" },
  { company: "GreenPath Donation Services", prompt: "Professional modern logo for 'GreenPath Donation Services', eco-friendly charity theme, heart and leaf icon, green and warm colors, white background, friendly design" },
  { company: "SecureShred Document Destruction", prompt: "Professional modern logo for 'SecureShred Document Destruction', secure professional design, shredder icon, dark blue and gray colors, white background, secure and trustworthy" },
  { company: "WasteMaster Dumpster Services", prompt: "Professional modern logo for 'WasteMaster Dumpster Services', industrial service design, dumpster container icon, orange and black colors, white background, bold and strong" },
  { company: "BrightSpark Electrical Solutions", prompt: "Professional modern logo for 'BrightSpark Electrical Solutions', electrical theme with lightning bolt icon, bright yellow and blue colors, white background, energetic design" },
  { company: "ClearView Estate Photography", prompt: "Professional modern logo for 'ClearView Estate Photography', photography theme with camera lens icon, elegant purple and teal colors, white background, artistic style" },
  { company: "Precision Floor Solutions", prompt: "Professional modern logo for 'Precision Floor Solutions', flooring theme with geometric tile pattern, brown and gray colors, white background, precise and clean" },
  { company: "QuickFix Handyman Services", prompt: "Professional modern logo for 'QuickFix Handyman Services', handyman theme with wrench and hammer icon, red and orange colors, white background, reliable and friendly" },
  { company: "ClimateRight HVAC", prompt: "Professional modern logo for 'ClimateRight HVAC', HVAC theme with temperature control icon, blue and red colors representing hot and cold, white background, technical design" },
  { company: "TrueValue Home Inspections", prompt: "Professional modern logo for 'TrueValue Home Inspections', inspection theme with magnifying glass and house icon, navy blue and gold colors, white background, professional and trustworthy" },
  { company: "GreenScape Landscaping", prompt: "Professional modern logo for 'GreenScape Landscaping', landscaping theme with tree and grass icon, various shades of green, white background, natural and organic" },
  { company: "SecureKey Locksmith Services", prompt: "Professional modern logo for 'SecureKey Locksmith Services', locksmith theme with key and lock icon, gold and black colors, white background, secure and reliable" },
  { company: "ClickBoost Marketing Agency", prompt: "Professional modern logo for 'ClickBoost Marketing Agency', digital marketing theme with cursor or graph icon, bright orange and blue colors, white background, modern and dynamic" },
  { company: "All-Star Moving Company", prompt: "Professional modern logo for 'All-Star Moving Company', moving theme with truck and star icon, blue and yellow colors, white background, strong and reliable" },
  { company: "PerfectCoat Painting", prompt: "Professional modern logo for 'PerfectCoat Painting', painting theme with paint brush and color palette, vibrant multicolors, white background, creative and colorful" },
  { company: "BugBusters Pest Control", prompt: "Professional modern logo for 'BugBusters Pest Control', pest control theme with shield and bug icon, green and black colors, white background, protective design" },
  { company: "DripFix Plumbing Services", prompt: "Professional modern logo for 'DripFix Plumbing Services', plumbing theme with water drop and wrench icon, blue and silver colors, white background, clean and professional" },
  { company: "EcoWise Recycling Solutions", prompt: "Professional modern logo for 'EcoWise Recycling Solutions', recycling theme with circular arrows icon, green and blue eco colors, white background, sustainable design" },
  { company: "TopShelf Estate Sales & Liquidation", prompt: "Professional modern logo for 'TopShelf Estate Sales & Liquidation', estate sale theme with tag and gavel icon, burgundy and gold colors, white background, premium and elegant" },
  { company: "SwiftShip Shipping Services", prompt: "Professional modern logo for 'SwiftShip Shipping Services', shipping theme with box and fast arrow icon, blue and orange colors, white background, speed and reliability" },
  { company: "SnowPro Removal Services", prompt: "Professional modern logo for 'SnowPro Removal Services', snow removal theme with snowflake and shovel icon, icy blue and white colors, white background, winter theme" },
  { company: "Eagle Eye Security Systems", prompt: "Professional modern logo for 'Eagle Eye Security Systems', security theme with eagle eye and camera icon, dark blue and red colors, white background, vigilant and protective" },
  { company: "SearchFirst SEO Agency", prompt: "Professional modern logo for 'SearchFirst SEO Agency', SEO theme with magnifying glass and upward arrow icon, blue and green colors, white background, digital and modern" },
  { company: "ProSign Signage Solutions", prompt: "Professional modern logo for 'ProSign Signage Solutions', signage theme with sign post icon, red and black colors, white background, bold and visible" },
  { company: "StageRight Home Staging", prompt: "Professional modern logo for 'StageRight Home Staging', home staging theme with elegant furniture silhouette, soft pastels and gold, white background, sophisticated and elegant" },
  { company: "SafeStore Storage Solutions", prompt: "Professional modern logo for 'SafeStore Storage Solutions', storage theme with lock and building icon, blue and gray colors, white background, secure and reliable" },
  { company: "TaxWise CPA Services", prompt: "Professional modern logo for 'TaxWise CPA Services', accounting theme with calculator and document icon, professional navy and green, white background, trustworthy financial design" },
  { company: "SwiftLoad Truck Rental", prompt: "Professional modern logo for 'SwiftLoad Truck Rental', truck rental theme with truck icon, orange and black colors, white background, strong and reliable" },
  { company: "ClickPro Web Design Studio", prompt: "Professional modern logo for 'ClickPro Web Design Studio', web design theme with cursor and browser window icon, modern purple and cyan, white background, creative tech design" },
  { company: "WillWrite Estate Attorneys", prompt: "Professional modern logo for 'WillWrite Estate Attorneys', legal theme with scales of justice and pen icon, classic navy and gold, white background, professional legal design" },
  { company: "ClearOut Cleanout Services", prompt: "Professional modern logo for 'ClearOut Cleanout Services', cleanout theme with trash bin and broom icon, fresh green and gray, white background, clean and efficient" },
  { company: "BuildRight General Contracting", prompt: "Professional modern logo for 'BuildRight General Contracting', construction theme with hammer and house icon, orange and navy, white background, strong construction design" },
  { company: "GutterGuard Services", prompt: "Professional modern logo for 'GutterGuard Services', gutter theme with roof and water drop icon, blue and silver, white background, protective design" },
  { company: "WindowBrite Cleaning", prompt: "Professional modern logo for 'WindowBrite Cleaning', window cleaning theme with sparkle and squeegee icon, sky blue and yellow, white background, bright and clean" },
  { company: "YardWorks Yard Cleanup", prompt: "Professional modern logo for 'YardWorks Yard Cleanup', yard work theme with rake and leaf icon, earth green and brown, white background, outdoor service design" },
  { company: "ElderCare Support Services", prompt: "Professional modern logo for 'ElderCare Support Services', senior care theme with helping hands and heart icon, warm purple and gold, white background, caring and compassionate" },
  { company: "HandyHelp Personal Assistant Services", prompt: "Professional modern logo for 'HandyHelp Personal Assistant Services', assistant theme with clipboard and checkmark icon, friendly orange and blue, white background, helpful design" },
  { company: "PowerWash Pros", prompt: "Professional modern logo for 'PowerWash Pros', pressure washing theme with water spray icon, bold blue and white, white background, powerful and clean" },
  { company: "RoofPro Roofing Solutions", prompt: "Professional modern logo for 'RoofPro Roofing Solutions', roofing theme with house roof and shield icon, red and gray, white background, protective and strong" }
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];
    
    // Get all vendors
    const vendors = await base44.asServiceRole.entities.Vendor.list();
    
    // Generate logos for each vendor
    for (const vendorData of vendorLogoPrompts) {
      try {
        // Find matching vendor
        const vendor = vendors.find(v => v.company_name === vendorData.company);
        if (!vendor) {
          results.push({ company: vendorData.company, status: 'not_found' });
          continue;
        }

        // Generate logo
        const { url } = await base44.asServiceRole.integrations.Core.GenerateImage({
          prompt: vendorData.prompt
        });

        // Update vendor with logo
        await base44.asServiceRole.entities.Vendor.update(vendor.id, {
          company_logo_url: url
        });

        results.push({ 
          company: vendorData.company, 
          status: 'success',
          logo_url: url
        });
      } catch (error) {
        results.push({ 
          company: vendorData.company, 
          status: 'error',
          error: error.message 
        });
      }
    }

    return Response.json({ 
      success: true,
      total: results.length,
      successful: results.filter(r => r.status === 'success').length,
      results 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});