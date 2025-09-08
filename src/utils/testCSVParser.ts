// Test function to validate CSV parsing fixes
export const testCSVParsing = () => {
  console.log('Testing CSV parsing fixes...');
  
  // Test cases with problematic lines from the CSV
  const testCases = [
    // Normal line
    '0,0,"Normal Card",001,123,Amber,Common,"$1.00","$2.00"',
    // Line with empty foil price (the problem case)
    '0,0,"Jafar - High Sultan of Lorcana",P2,033,Amethyst Steel,Enchanted,,',
    // Line with empty regular price
    '0,0,"Another Card",001,124,Ruby,Rare,,"$3.00"',
    // Line with both prices empty
    '0,0,"Empty Prices",001,125,Emerald,Uncommon,,'
  ];

  // Simple CSV parser (copy of the fixed logic)
  const parseCSVLine = (line: string, separator: string): string[] => {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote (two quotes in a row)
          current += '"';
          i += 2;
        } else {
          // Start or end of quoted field
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === separator && !inQuotes) {
        // Field separator outside of quotes
        values.push(current.trim());
        current = '';
        i++;
      } else {
        // Regular character
        current += char;
        i++;
      }
    }
    
    // Add the last field
    values.push(current.trim());
    
    // Handle trailing commas - if line ends with separator, add empty field
    if (line.endsWith(separator) && !inQuotes) {
      values.push('');
    }
    
    return values;
  };

  testCases.forEach((testLine, index) => {
    console.log(`\n--- Test Case ${index + 1} ---`);
    console.log(`Input: "${testLine}"`);
    
    const result = parseCSVLine(testLine, ',');
    console.log(`Output: ${result.length} fields:`, result);
    
    // Expected: 9 fields for proper CSV
    if (result.length === 9) {
      console.log('✓ Correct number of fields');
    } else {
      console.log(`⚠️  Expected 9 fields, got ${result.length}`);
    }
  });
  
  console.log('\nCSV parsing test complete!');
};