import { LorcanaCard } from '../types';

export interface DreambornCSVRow {
  'Set Number': string;
  'Card Number': string;
  Variant: string;
  Count: string;
  Name: string;
  Color: string;
  Rarity: string;
}

export interface ImportedCard {
  card: LorcanaCard;
  normalQuantity: number;
  foilQuantity: number;
}

// Proper CSV line parser that handles quoted fields with commas
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

export const parseDreambornCSV = (csvContent: string): DreambornCSVRow[] => {
  
  // Handle different line endings (Windows \r\n, Unix \n, Mac \r)
  const lines = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter(line => line.trim().length > 0);
  
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  // Try both tab and comma as separators
  let separator: string;
  if (lines[0].includes('\t') && lines[0].split('\t').length >= 9) {
    separator = '\t';
  } else if (lines[0].includes(',') && lines[0].split(',').length >= 9) {
    separator = ',';
  } else {
    // Fallback: use whichever gives more columns
    const tabCount = lines[0].split('\t').length;
    const commaCount = lines[0].split(',').length;
    separator = tabCount > commaCount ? '\t' : ',';
  }
  
  
  const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
  
  // More flexible header matching
  const headerMap: Record<string, number> = {};
  headers.forEach((header, index) => {
    const cleanHeader = header.toLowerCase().trim();
    if (cleanHeader.includes('set') && cleanHeader.includes('number')) {
      headerMap['Set Number'] = index;
    } else if (cleanHeader.includes('card') && cleanHeader.includes('number')) {
      headerMap['Card Number'] = index;
    } else if (cleanHeader.includes('variant')) {
      headerMap['Variant'] = index;
    } else if (cleanHeader.includes('count')) {
      headerMap['Count'] = index;
    } else if (cleanHeader.includes('name') && !cleanHeader.includes('set')) {
      headerMap['Name'] = index;
    } else if (cleanHeader.includes('color')) {
      headerMap['Color'] = index;
    } else if (cleanHeader.includes('rarity')) {
      headerMap['Rarity'] = index;
    }
  });
  
  
  const requiredFields = ['Set Number', 'Card Number', 'Variant', 'Count', 'Name'];
  const missingFields = requiredFields.filter(field => headerMap[field] === undefined);
  if (missingFields.length > 0) {
    throw new Error(`Missing required columns: ${missingFields.join(', ')}. Found headers: ${headers.join(', ')}`);
  }

  const rows: DreambornCSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      // Proper CSV parsing that handles quoted fields
      const values = parseCSVLine(line, separator);
      
      // Validate expected number of fields
      if (values.length < Math.max(...Object.values(headerMap)) + 1) {
        console.warn(`Row ${i + 1} has ${values.length} fields but expected at least ${Math.max(...Object.values(headerMap)) + 1} based on headers`);
      }
    
      // Build row object using header mapping
      const row: any = {};
      Object.entries(headerMap).forEach(([fieldName, columnIndex]) => {
        row[fieldName] = values[columnIndex] || '';
      });

      // Parse quantity and variant from the new format
      const countStr = (row.Count || '0').toString().trim();
      const count = parseInt(countStr) || 0;
      if (count > 0) rows.push(row as DreambornCSVRow);
    } catch (error) {
      throw new Error(`Failed to process row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`, { cause: error });
    }
  }
  

  return rows;
};

export const matchCardToDatabase = (csvRow: DreambornCSVRow, allCards: LorcanaCard[]): LorcanaCard | null => {
  const { Name: csvName, 'Set Number': csvSet, 'Card Number': csvCardNumber, Rarity: csvRarity } = csvRow;

  const cardNumberStr = csvCardNumber?.toString().trim() || '0';
  const setStr = csvSet?.toString().trim() || '';

  // Check if card number contains a promo group (e.g., "8/P2", "14/C1")
  const promoMatch = cardNumberStr.match(/^(\d+)\/(P[123]|C[12]|D23)$/);

  let cardNumber: number;
  let promoGroup: string | null = null;

  if (promoMatch) {
    // Promo card with format "number/promoGroup"
    cardNumber = parseInt(promoMatch[1]);
    promoGroup = promoMatch[2];
  } else {
    // Regular card number
    cardNumber = parseInt(cardNumberStr);
  }

  if (!setStr || cardNumber < 0 || isNaN(cardNumber)) {
    console.warn(`Invalid set or card number: Set="${csvSet}", Card Number="${csvCardNumber}" for card: ${csvName}`);
    return null;
  }

  let matches: LorcanaCard[];

  // Handle promo cards (detected from card number like "8/P2" or set like "P1")
  if (promoGroup || setStr.match(/^(P[123]|C[12]|D23)$/)) {
    const effectivePromoGroup = promoGroup || setStr;

    // Find cards with matching promoGrouping and card number
    matches = allCards.filter(card => {
      return card.promoGrouping === effectivePromoGroup && card.number === cardNumber;
    });

  } else {
    // Handle regular sets (001, 002, 008, etc.)
    const setNumber = parseInt(setStr);
    const setCode = isNaN(setNumber) ? setStr : setNumber.toString();

    matches = allCards.filter(card => {
      return card.setCode === setCode &&
             card.number === cardNumber &&
             !card.promoGrouping; // Exclude promo cards from regular matching
    });
  }

  // If no exact match found, try fallback to name matching
  if (matches.length === 0) {
    console.warn(`Could not find match for Set ${setStr} Card ${cardNumber}: ${csvName} (Rarity: ${csvRarity})`);
    
    // Enhanced name normalization for better matching
    const normalizeCardName = (name: string): string => {
      return name.trim()
        .toLowerCase()
        .replace(/['']/g, "'") // Normalize apostrophes
        .replace(/[-–—]/g, "-") // Normalize dashes
        .replace(/\s+/g, " ") // Normalize whitespace
        .replace(/[!?.,]/g, ""); // Remove punctuation for fuzzy matching
    };

    const normalizedCsvName = normalizeCardName(csvName);

    // Fallback to name matching with enhanced fuzzy matching
    const nameMatches = allCards.filter(c => {
      const normalizedDbName = normalizeCardName(c.fullName);

      // Direct normalized match
      if (normalizedDbName === normalizedCsvName) return true;

      // Try with original punctuation preserved (just case and whitespace normalization)
      const csvNameWithPunct = csvName.trim().toLowerCase().replace(/\s+/g, " ");
      const dbNameWithPunct = c.fullName.trim().toLowerCase().replace(/\s+/g, " ");
      if (dbNameWithPunct === csvNameWithPunct) return true;

      // Special cases for common variations
      if (normalizedCsvName === "wake up" && normalizedDbName.startsWith("wake up")) return true;

      // Handle "The" vs "the" differences specifically
      const csvWithoutArticles = normalizedCsvName.replace(/\b(the|a|an)\b/g, "").replace(/\s+/g, " ").trim();
      const dbWithoutArticles = normalizedDbName.replace(/\b(the|a|an)\b/g, "").replace(/\s+/g, " ").trim();
      if (csvWithoutArticles === dbWithoutArticles) return true;

      return false;
    });
    
    if (nameMatches.length > 0) {
      // For name matches, try to pick the right variant based on rarity
      if (csvRarity === 'Enchanted') {
        const enchantedMatch = nameMatches.find(c => c.rarity === 'Enchanted');
        if (enchantedMatch) {
          matches = [enchantedMatch];
        }
      } else if (csvRarity === 'Promo') {
        const promoMatch = nameMatches.find(c => c.promoGrouping);
        if (promoMatch) {
          matches = [promoMatch];
        }
      } else {
        // For regular cards, prefer non-promo, non-enchanted versions
        const regularMatch = nameMatches.find(c => !c.promoGrouping && c.rarity !== 'Enchanted');
        if (regularMatch) {
          matches = [regularMatch];
        } else {
          matches = [nameMatches[0]];
        }
      }
    } else {
      return null;
    }
  }

  if (matches.length > 1) {
    console.warn(`Multiple matches found for Set ${setStr} Card ${cardNumber}, using first match`);
  }

  const matchedCard = matches[0];
  return matchedCard;
};

export interface ImportResult {
  importedCards: ImportedCard[];
  failedCards: { name: string; set: string; cardNumber: string; rarity: string }[];
}

export const importDreambornCollection = (csvContent: string, allCards: LorcanaCard[]): ImportResult => {
  try {
    const csvRows = parseDreambornCSV(csvContent);

    // Group cards by their identity to combine normal and foil variants
    const cardQuantityMap = new Map<string, { card: LorcanaCard; normalQuantity: number; foilQuantity: number }>();
    const failedCards: { name: string; set: string; cardNumber: string; rarity: string }[] = [];

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];

      const card = matchCardToDatabase(row, allCards);
      if (!card) {
        failedCards.push({
          name: row.Name || 'Unknown',
          set: row['Set Number'] || 'Unknown',
          cardNumber: row['Card Number'] || 'Unknown',
          rarity: row.Rarity || 'Unknown'
        });
        continue;
      }

      // Create unique key for this card
      const cardKey = `${card.id}`;
      const count = parseInt(row.Count || '0') || 0;
      const variant = (row.Variant || 'normal').toString().trim().toLowerCase();

      if (!cardQuantityMap.has(cardKey)) {
        cardQuantityMap.set(cardKey, {
          card,
          normalQuantity: 0,
          foilQuantity: 0
        });
      }

      const cardEntry = cardQuantityMap.get(cardKey)!;
      if (variant === 'foil') {
        cardEntry.foilQuantity += count;
      } else {
        cardEntry.normalQuantity += count;
      }

    }

    const importedCards: ImportedCard[] = Array.from(cardQuantityMap.values());

    return { importedCards, failedCards };
  } catch (error) {
    console.error('Error importing Dreamborn collection:', error);
    throw error;
  }
};

export const generateImportSummary = (importedCards: ImportedCard[], failedCards: { name: string; set: string; cardNumber: string; rarity: string }[] = []): string => {
  const totalNormal = importedCards.reduce((sum, card) => sum + card.normalQuantity, 0);
  const totalFoil = importedCards.reduce((sum, card) => sum + card.foilQuantity, 0);
  const totalCards = totalNormal + totalFoil;
  
  const uniqueCards = importedCards.length;
  const enchantedCount = importedCards.filter(card => card.card.rarity === 'Enchanted').length;
  
  let summary = `Successfully imported ${totalCards} cards (${uniqueCards} unique, ${totalNormal} normal, ${totalFoil} foil, ${enchantedCount} enchanted)`;
  
  if (failedCards.length > 0) {
    summary += `\n\n⚠️ ${failedCards.length} cards could not be matched:`;
    failedCards.forEach(card => {
      summary += `\n• ${card.name} (Set: ${card.set}, Card: ${card.cardNumber}, ${card.rarity})`;
    });
    summary += `\n\nThese cards were not imported. Please check the card names, sets, and numbers in your CSV.`;
  }

  return summary;
};