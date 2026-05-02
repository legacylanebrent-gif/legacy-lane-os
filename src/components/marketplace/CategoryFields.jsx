import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

// Per-category smart field definitions
const CATEGORY_FIELDS = {
  art: [
    { key: 'artist_name', label: 'Artist Name', type: 'text' },
    { key: 'medium', label: 'Medium', type: 'select', options: ['Oil on Canvas', 'Watercolor', 'Acrylic', 'Pastel', 'Charcoal', 'Mixed Media', 'Digital', 'Other'] },
    { key: 'dimensions', label: 'Dimensions (e.g. 24" x 36")', type: 'text' },
    { key: 'year_created', label: 'Year Created', type: 'text' },
    { key: 'is_signed', label: 'Signed by Artist', type: 'checkbox' },
    { key: 'is_framed', label: 'Includes Frame', type: 'checkbox' },
    { key: 'has_coa', label: 'Certificate of Authenticity (COA)', type: 'checkbox' },
    { key: 'provenance', label: 'Provenance / History', type: 'text' },
    { key: 'edition', label: 'Edition (e.g. 12/50)', type: 'text' },
    { key: 'appraisal_value', label: 'Appraisal Value ($)', type: 'text' },
    { key: 'appraiser_name', label: 'Appraiser Name', type: 'text' },
  ],
  artwork_prints_posters: [
    { key: 'artist_name', label: 'Artist Name', type: 'text' },
    { key: 'print_type', label: 'Print Type', type: 'select', options: ['Lithograph', 'Serigraph', 'Giclee', 'Offset Print', 'Poster', 'Other'] },
    { key: 'dimensions', label: 'Dimensions (e.g. 18" x 24")', type: 'text' },
    { key: 'is_signed', label: 'Signed', type: 'checkbox' },
    { key: 'is_framed', label: 'Framed', type: 'checkbox' },
    { key: 'edition', label: 'Edition Number (e.g. 45/200)', type: 'text' },
    { key: 'has_coa', label: 'Certificate of Authenticity', type: 'checkbox' },
    { key: 'appraisal_value', label: 'Appraisal Value ($)', type: 'text' },
  ],
  antiques: [
    { key: 'era', label: 'Era / Period', type: 'select', options: ['Pre-1800s', 'Victorian (1837–1901)', 'Edwardian (1901–1910)', 'Art Nouveau (1890–1910)', 'Art Deco (1920s–1940s)', '1940s–1960s', '1960s–1980s', 'Unknown'] },
    { key: 'maker', label: 'Maker / Manufacturer', type: 'text' },
    { key: 'origin_country', label: 'Country of Origin', type: 'text' },
    { key: 'material', label: 'Material', type: 'text' },
    { key: 'is_authenticated', label: 'Authenticated / Appraised', type: 'checkbox' },
    { key: 'provenance', label: 'Provenance', type: 'text' },
    { key: 'appraisal_value', label: 'Appraisal Value ($)', type: 'text' },
    { key: 'appraiser_name', label: 'Appraiser Name', type: 'text' },
  ],
  furniture: [
    { key: 'material', label: 'Material', type: 'select', options: ['Solid Wood', 'Veneer', 'MDF', 'Metal', 'Glass', 'Wicker', 'Mixed', 'Other'] },
    { key: 'style', label: 'Style', type: 'select', options: ['Traditional', 'Modern', 'Mid-Century Modern', 'Rustic', 'Farmhouse', 'Industrial', 'Coastal', 'Other'] },
    { key: 'dimensions', label: 'Dimensions (W x D x H)', type: 'text' },
    { key: 'color', label: 'Color / Finish', type: 'text' },
    { key: 'assembly_required', label: 'Assembly Required', type: 'checkbox' },
    { key: 'upholstery_condition', label: 'Upholstery Condition', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Needs Reupholstering', 'N/A'] },
  ],
  clothing_accessories: [
    { key: 'size', label: 'Size', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Plus Size', 'One Size', 'Other'] },
    { key: 'gender', label: 'Gender', type: 'select', options: ["Women's", "Men's", 'Unisex', 'Girls', 'Boys'] },
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'material', label: 'Material / Fabric', type: 'text' },
    { key: 'color', label: 'Color', type: 'text' },
    { key: 'style', label: 'Style / Type', type: 'text' },
    { key: 'is_vintage', label: 'Vintage / Designer', type: 'checkbox' },
    { key: 'dry_clean_only', label: 'Dry Clean Only', type: 'checkbox' },
  ],
  collectibles: [
    { key: 'brand_manufacturer', label: 'Brand / Manufacturer', type: 'text' },
    { key: 'model_edition', label: 'Model / Edition', type: 'text' },
    { key: 'year', label: 'Year', type: 'text' },
    { key: 'series', label: 'Series / Set', type: 'text' },
    { key: 'is_complete_set', label: 'Complete Set', type: 'checkbox' },
    { key: 'has_original_packaging', label: 'Original Packaging / Box', type: 'checkbox' },
    { key: 'is_authenticated', label: 'Authenticated / Graded', type: 'checkbox' },
    { key: 'grade', label: 'Grade / Condition Rating', type: 'text' },
    { key: 'appraisal_value', label: 'Appraisal Value ($)', type: 'text' },
  ],
  coins_currency: [
    { key: 'coin_type', label: 'Coin / Currency Type', type: 'text' },
    { key: 'year_minted', label: 'Year Minted', type: 'text' },
    { key: 'country', label: 'Country of Origin', type: 'text' },
    { key: 'denomination', label: 'Denomination', type: 'text' },
    { key: 'grade', label: 'Grade (e.g. MS65, VF)', type: 'text' },
    { key: 'is_graded', label: 'Professionally Graded (PCGS/NGC)', type: 'checkbox' },
    { key: 'is_proof', label: 'Proof / Uncirculated', type: 'checkbox' },
    { key: 'metal_content', label: 'Metal Content (Gold/Silver/etc)', type: 'text' },
    { key: 'appraisal_value', label: 'Appraisal Value ($)', type: 'text' },
  ],
  electronics: [
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'model_number', label: 'Model Number', type: 'text' },
    { key: 'year', label: 'Year / Age', type: 'text' },
    { key: 'is_tested', label: 'Tested & Working', type: 'checkbox' },
    { key: 'includes_accessories', label: 'Includes Original Accessories', type: 'checkbox' },
    { key: 'includes_manual', label: 'Includes Manual', type: 'checkbox' },
    { key: 'power_type', label: 'Power Type', type: 'select', options: ['110V', '220V', 'Battery', 'USB', 'Solar', 'Other'] },
  ],
  musical_instruments: [
    { key: 'instrument_type', label: 'Instrument Type', type: 'text' },
    { key: 'brand', label: 'Brand / Make', type: 'text' },
    { key: 'model', label: 'Model', type: 'text' },
    { key: 'year', label: 'Year Made', type: 'text' },
    { key: 'is_playable', label: 'Playable / In Tune', type: 'checkbox' },
    { key: 'includes_case', label: 'Includes Case', type: 'checkbox' },
    { key: 'includes_accessories', label: 'Includes Accessories (bow, picks, etc.)', type: 'checkbox' },
    { key: 'has_been_serviced', label: 'Recently Serviced', type: 'checkbox' },
    { key: 'appraisal_value', label: 'Appraisal Value ($)', type: 'text' },
  ],
  vehicles: [
    { key: 'make_model', label: 'Make & Model', type: 'text' },
    { key: 'year', label: 'Year', type: 'text' },
    { key: 'mileage', label: 'Mileage', type: 'text' },
    { key: 'color', label: 'Color', type: 'text' },
    { key: 'vin', label: 'VIN Number', type: 'text' },
    { key: 'fuel_type', label: 'Fuel Type', type: 'select', options: ['Gasoline', 'Diesel', 'Electric', 'Hybrid', 'Other'] },
    { key: 'title_status', label: 'Title Status', type: 'select', options: ['Clean', 'Salvage', 'Rebuilt', 'No Title', 'Other'] },
    { key: 'runs_drives', label: 'Runs & Drives', type: 'checkbox' },
    { key: 'appraisal_value', label: 'Appraisal Value ($)', type: 'text' },
  ],
  books_media: [
    { key: 'author', label: 'Author / Artist', type: 'text' },
    { key: 'media_type', label: 'Type', type: 'select', options: ['Book', 'Magazine', 'Vinyl Record', 'CD', 'DVD', 'Blu-ray', 'VHS', 'Other'] },
    { key: 'genre', label: 'Genre', type: 'text' },
    { key: 'year_published', label: 'Year Published / Released', type: 'text' },
    { key: 'is_first_edition', label: 'First Edition', type: 'checkbox' },
    { key: 'is_signed', label: 'Signed by Author / Artist', type: 'checkbox' },
    { key: 'isbn', label: 'ISBN (books)', type: 'text' },
    { key: 'appraisal_value', label: 'Appraisal Value ($)', type: 'text' },
  ],
  rugs_textiles: [
    { key: 'rug_type', label: 'Type', type: 'select', options: ['Area Rug', 'Runner', 'Tapestry', 'Quilt', 'Blanket', 'Tablecloth', 'Other'] },
    { key: 'material', label: 'Material', type: 'select', options: ['Wool', 'Silk', 'Cotton', 'Synthetic', 'Persian/Oriental', 'Mixed', 'Other'] },
    { key: 'dimensions', label: 'Dimensions', type: 'text' },
    { key: 'color_pattern', label: 'Color / Pattern', type: 'text' },
    { key: 'is_handmade', label: 'Handmade', type: 'checkbox' },
    { key: 'country_of_origin', label: 'Country of Origin', type: 'text' },
    { key: 'appraisal_value', label: 'Appraisal Value ($)', type: 'text' },
  ],
  china_porcelain: [
    { key: 'brand_maker', label: 'Brand / Maker (e.g. Wedgwood, Lenox)', type: 'text' },
    { key: 'pattern_name', label: 'Pattern Name', type: 'text' },
    { key: 'piece_type', label: 'Piece Type', type: 'text' },
    { key: 'num_pieces', label: 'Number of Pieces', type: 'text' },
    { key: 'is_complete_set', label: 'Complete Set', type: 'checkbox' },
    { key: 'has_chips_cracks', label: 'Has Chips or Cracks', type: 'checkbox' },
    { key: 'country_of_origin', label: 'Country of Origin', type: 'text' },
    { key: 'appraisal_value', label: 'Appraisal Value ($)', type: 'text' },
  ],
  glassware_crystal: [
    { key: 'brand_maker', label: 'Brand / Maker (e.g. Waterford, Baccarat)', type: 'text' },
    { key: 'type', label: 'Type', type: 'select', options: ['Crystal', 'Glass', 'Lead Crystal', 'Art Glass', 'Depression Glass', 'Milk Glass', 'Other'] },
    { key: 'color', label: 'Color', type: 'text' },
    { key: 'num_pieces', label: 'Number of Pieces', type: 'text' },
    { key: 'has_chips_cracks', label: 'Has Chips or Cracks', type: 'checkbox' },
    { key: 'is_set', label: 'Part of a Set', type: 'checkbox' },
    { key: 'appraisal_value', label: 'Appraisal Value ($)', type: 'text' },
  ],
  clocks_watches: [
    { key: 'brand', label: 'Brand / Maker', type: 'text' },
    { key: 'type', label: 'Type', type: 'select', options: ['Wall Clock', 'Mantle Clock', 'Grandfather Clock', 'Cuckoo Clock', 'Wristwatch', 'Pocket Watch', 'Other'] },
    { key: 'movement', label: 'Movement', type: 'select', options: ['Mechanical', 'Quartz', 'Automatic', 'Wind-Up', 'Electric', 'Battery', 'Unknown'] },
    { key: 'is_working', label: 'Working Condition', type: 'checkbox' },
    { key: 'year_era', label: 'Year / Era', type: 'text' },
    { key: 'has_key', label: 'Includes Key / Winding Tool', type: 'checkbox' },
    { key: 'appraisal_value', label: 'Appraisal Value ($)', type: 'text' },
  ],
  tools_hardware: [
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'tool_type', label: 'Tool Type', type: 'text' },
    { key: 'power_type', label: 'Power Type', type: 'select', options: ['Manual', 'Electric (Corded)', 'Battery (Cordless)', 'Pneumatic', 'Gas-Powered'] },
    { key: 'is_tested', label: 'Tested & Working', type: 'checkbox' },
    { key: 'includes_accessories', label: 'Includes Accessories / Bits', type: 'checkbox' },
    { key: 'includes_battery_charger', label: 'Includes Battery & Charger', type: 'checkbox' },
  ],
  sporting_goods: [
    { key: 'sport', label: 'Sport / Activity', type: 'text' },
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'size', label: 'Size (if applicable)', type: 'text' },
    { key: 'is_complete_set', label: 'Complete Set', type: 'checkbox' },
    { key: 'includes_accessories', label: 'Includes Accessories', type: 'checkbox' },
  ],
  toys_games: [
    { key: 'brand_manufacturer', label: 'Brand / Manufacturer', type: 'text' },
    { key: 'age_range', label: 'Age Range', type: 'text' },
    { key: 'is_complete', label: 'Complete (all pieces present)', type: 'checkbox' },
    { key: 'has_original_box', label: 'Has Original Box', type: 'checkbox' },
    { key: 'is_vintage', label: 'Vintage / Collectible', type: 'checkbox' },
    { key: 'year', label: 'Year / Era', type: 'text' },
  ],
  kitchen_dining: [
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'material', label: 'Material', type: 'select', options: ['Cast Iron', 'Stainless Steel', 'Copper', 'Ceramic', 'Glass', 'Aluminum', 'Other'] },
    { key: 'num_pieces', label: 'Number of Pieces', type: 'text' },
    { key: 'is_set', label: 'Part of a Set', type: 'checkbox' },
    { key: 'is_tested', label: 'Tested / Working (appliances)', type: 'checkbox' },
  ],
  home_decor: [
    { key: 'style', label: 'Style', type: 'select', options: ['Traditional', 'Modern', 'Farmhouse', 'Boho', 'Mid-Century', 'Coastal', 'Eclectic', 'Other'] },
    { key: 'material', label: 'Material', type: 'text' },
    { key: 'color', label: 'Color', type: 'text' },
    { key: 'dimensions', label: 'Dimensions', type: 'text' },
  ],
  lighting_lamps: [
    { key: 'lamp_type', label: 'Type', type: 'select', options: ['Table Lamp', 'Floor Lamp', 'Chandelier', 'Sconce', 'Pendant', 'Ceiling Fan', 'Other'] },
    { key: 'material', label: 'Material / Style', type: 'text' },
    { key: 'is_working', label: 'Working Condition', type: 'checkbox' },
    { key: 'includes_shade', label: 'Includes Shade', type: 'checkbox' },
    { key: 'dimensions_height', label: 'Height', type: 'text' },
  ],
  garden_outdoor: [
    { key: 'item_type', label: 'Item Type', type: 'text' },
    { key: 'material', label: 'Material', type: 'select', options: ['Cast Iron', 'Wrought Iron', 'Ceramic', 'Stone', 'Concrete', 'Wood', 'Plastic', 'Other'] },
    { key: 'dimensions', label: 'Dimensions / Weight', type: 'text' },
    { key: 'is_weathered', label: 'Weather-Worn / Patina', type: 'checkbox' },
  ],
  medical_mobility: [
    { key: 'item_type', label: 'Item Type', type: 'text' },
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'is_tested', label: 'Tested & Working', type: 'checkbox' },
    { key: 'size_weight_limit', label: 'Size / Weight Limit', type: 'text' },
  ],
  craft_sewing: [
    { key: 'craft_type', label: 'Craft Type', type: 'text' },
    { key: 'brand', label: 'Brand (if applicable)', type: 'text' },
    { key: 'is_complete_kit', label: 'Complete Kit / Lot', type: 'checkbox' },
    { key: 'material', label: 'Material / Fiber', type: 'text' },
  ],
  office_business: [
    { key: 'item_type', label: 'Item Type', type: 'text' },
    { key: 'brand', label: 'Brand', type: 'text' },
    { key: 'is_tested', label: 'Tested & Working', type: 'checkbox' },
    { key: 'dimensions', label: 'Dimensions', type: 'text' },
  ],
  holiday_seasonal: [
    { key: 'holiday', label: 'Holiday / Season', type: 'select', options: ['Christmas', 'Halloween', 'Easter', 'Thanksgiving', 'Fourth of July', 'Hanukkah', 'General Fall', 'General Spring', 'Other'] },
    { key: 'num_pieces', label: 'Number of Pieces', type: 'text' },
    { key: 'is_vintage', label: 'Vintage / Antique', type: 'checkbox' },
    { key: 'has_box', label: 'Original Box Included', type: 'checkbox' },
  ],
};

export default function CategoryFields({ category, specs, onChange }) {
  const fields = CATEGORY_FIELDS[category];
  if (!fields || fields.length === 0) return null;

  const updateSpec = (key, value) => {
    onChange({ ...specs, [key]: value });
  };

  return (
    <div className="border border-orange-100 rounded-lg p-4 bg-orange-50/40 space-y-4">
      <p className="text-sm font-semibold text-orange-700 uppercase tracking-wide">
        {category?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Details
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(field => (
          <div key={field.key} className={field.type === 'checkbox' ? 'flex items-center gap-2 col-span-1' : 'col-span-1'}>
            {field.type === 'text' && (
              <>
                <Label className="text-xs text-slate-600">{field.label}</Label>
                <Input
                  value={specs?.[field.key] || ''}
                  onChange={(e) => updateSpec(field.key, e.target.value)}
                  placeholder={field.label}
                  className="h-8 text-sm"
                />
              </>
            )}
            {field.type === 'select' && (
              <>
                <Label className="text-xs text-slate-600">{field.label}</Label>
                <Select value={specs?.[field.key] || ''} onValueChange={(val) => updateSpec(field.key, val)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={`Select ${field.label}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {field.options.map(opt => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
            {field.type === 'checkbox' && (
              <>
                <Checkbox
                  id={field.key}
                  checked={!!specs?.[field.key]}
                  onCheckedChange={(checked) => updateSpec(field.key, checked)}
                />
                <Label htmlFor={field.key} className="text-sm cursor-pointer">{field.label}</Label>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}