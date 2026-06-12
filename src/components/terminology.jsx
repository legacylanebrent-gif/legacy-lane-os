// Centralized terminology management
// Change terms here and they'll update throughout the app

const TERMINOLOGY = {
  // Estate Sale Company Owners
  Estate Sale Company Owner: 'company',
  operators: 'companies',
  Estate Sale Company Owner: 'Company',
  operators: 'Companies',
  'Estate Sale Company Owner': 'estate sale company',
  'Estate Sale Company Owner': 'Estate Sale Company',
  'estate_sale_operator': 'estate_sale_company',
  'Estate Operators': 'Estate Sale Co\'s',
  
  // Add more term mappings here as needed
  // Example:
  // 'old term': 'new term',
};

/**
 * Get the proper terminology for a term
 * @param {string} term - The original term
 * @returns {string} - The mapped term or original if no mapping exists
 */
export const t = (term) => {
  return TERMINOLOGY[term] || term;
};

/**
 * Replace terminology in a string intelligently
 * @param {string} text - The text to process
 * @returns {string} - Text with replaced terminology
 */
export const translateText = (text) => {
  if (!text) return text;
  
  let result = text;
  Object.keys(TERMINOLOGY).forEach(key => {
    const regex = new RegExp(`\\b${key}\\b`, 'g');
    result = result.replace(regex, TERMINOLOGY[key]);
  });
  
  return result;
};

export default TERMINOLOGY;