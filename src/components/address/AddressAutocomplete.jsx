import React, { useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function AddressAutocomplete({ 
  value, 
  onChange, 
  placeholder = "123 Main Street",
  className = "",
  onAddressSelect = null
}) {
  const inputRef = useRef(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [predictions, setPredictions] = useState([]);
  const autocompleteService = useRef(null);
  const placesService = useRef(null);

  useEffect(() => {
    if (window.google && window.google.maps) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService();
      placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'));
    }
  }, []);

  const handleInputChange = async (e) => {
    const val = e.target.value;
    onChange(val);

    if (!val || val.length < 3) {
      setShowSuggestions(false);
      return;
    }

    if (!autocompleteService.current) return;

    try {
      const result = await autocompleteService.current.getPlacePredictions({
        input: val,
        componentRestrictions: { country: 'us' },
        types: ['address']
      });

      if (result && result.predictions && result.predictions.length > 0) {
        setPredictions(result.predictions);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  const handleSuggestionClick = async (placeId, description) => {
    onChange(description);
    setShowSuggestions(false);

    if (placesService.current && onAddressSelect) {
      placesService.current.getDetails({ placeId }, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place) {
          const addressComponents = place.address_components || [];
          const addressData = {
            street: description.split(',')[0].trim(),
            city: addressComponents.find(c => c.types.includes('locality'))?.long_name || '',
            state: addressComponents.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '',
            zip: addressComponents.find(c => c.types.includes('postal_code'))?.long_name || ''
          };
          onAddressSelect(addressData);
        }
      });
    }
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleInputChange}
        onFocus={() => value && value.length > 0 && setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        className={className}
      />
      {showSuggestions && value.length > 0 && predictions.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-md shadow-lg mt-1 z-50 max-h-64 overflow-y-auto">
          {predictions.map((prediction, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(prediction.place_id, prediction.description)}
              className="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm border-b last:border-b-0"
            >
              <div className="font-medium text-slate-900">{prediction.description.split(',')[0]}</div>
              <div className="text-xs text-slate-500">{prediction.description.split(',').slice(1).join(',').trim()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}