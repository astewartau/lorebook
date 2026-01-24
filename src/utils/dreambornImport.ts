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
  console.log('Starting CSV parse...');
  console.log('Content length:', csvContent.length);
  console.log('First 500 chars:', csvContent.substring(0, 500));
  
  // Handle different line endings (Windows \r\n, Unix \n, Mac \r)
  const lines = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n').filter(line => line.trim().length > 0);
  
  console.log('Total lines found:', lines.length);
  console.log('First line (headers):', lines[0]);
  console.log('Second line (first data):', lines[1] || 'NO SECOND LINE');
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  // Try both tab and comma as separators
  let separator = '\t';
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
  
  console.log('Using separator:', separator === '\t' ? 'TAB' : 'COMMA');
  
  const headers = lines[0].split(separator).map(h => h.trim().replace(/"/g, ''));
  console.log('Headers found:', headers);
  
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
  
  console.log('Header mapping:', headerMap);
  
  const requiredFields = ['Set Number', 'Card Number', 'Variant', 'Count', 'Name'];
  const missingFields = requiredFields.filter(field => headerMap[field] === undefined);
  if (missingFields.length > 0) {
    throw new Error(`Missing required columns: ${missingFields.join(', ')}. Found headers: ${headers.join(', ')}`);
  }

  const rows: DreambornCSVRow[] = [];
  let totalProcessed = 0;
  let cardsWithQuantity = 0;
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    try {
      // Proper CSV parsing that handles quoted fields
      const values = parseCSVLine(line, separator);
      totalProcessed++;
      
      if (totalProcessed <= 5 || i === 128 || i === 129) { // Log problem rows specifically
        console.log(`Row ${i + 1} (line ${i}) values (${values.length} fields):`, values);
      }
      
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
      const variant = (row.Variant || 'normal').toString().trim().toLowerCase();

      const count = parseInt(countStr) || 0;

      if (totalProcessed <= 5 || i === 128 || i === 129) {
        console.log(`Row ${i + 1} - Variant: '${variant}', Count: '${countStr}' -> ${count}`);
        console.log(`Row ${i + 1} parsed:`, row);
      }

      if (count > 0) {
        cardsWithQuantity++;
        rows.push(row as DreambornCSVRow);

        if (cardsWithQuantity <= 5 || cardsWithQuantity === 129) {
          console.log(`Found card with quantity: ${row.Name}, Variant: ${variant}, Count: ${count}`);
        }
      }
    } catch (error) {
      console.error(`Error processing row ${i + 1}:`, error);
      console.error(`Row content: "${line}"`);
      throw new Error(`Failed to process row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log(`Processed ${totalProcessed} total rows, found ${cardsWithQuantity} cards with quantities > 0`);
  console.log(`Final rows to return: ${rows.length}`);

  return rows;
};

export const matchCardToDatabase = (csvRow: DreambornCSVRow, allCards: LorcanaCard[]): LorcanaCard | null => {
  const { Name: csvName, 'Set Number': csvSet, 'Card Number': csvCardNumber, Rarity: csvRarity } = csvRow;
  
  // Parse card number
  const cardNumber = parseInt(csvCardNumber?.toString().trim() || '0');
  
  if (!csvSet || (cardNumber < 0 || isNaN(cardNumber))) {
    console.warn(`Invalid set or card number: Set="${csvSet}", Card Number="${csvCardNumber}" for card: ${csvName}`);
    return null;
  }
  
  const setStr = csvSet.toString().trim();
  
  console.log(`Matching: ${csvName} - CSV Set: ${setStr}, Card Number: ${cardNumber}, Rarity: ${csvRarity}`);

  // Debug: Show first few cards that might match
  const debugMatches = allCards.filter(card =>
    card.fullName.toLowerCase().includes(csvName.toLowerCase().substring(0, 10))
  ).slice(0, 3);
  if (debugMatches.length > 0) {
    console.log(`  Debug - Similar cards found:`, debugMatches.map(c => ({
      name: c.fullName,
      set: c.setCode,
      number: c.number,
      promo: c.promoGrouping
    })));
  }
  
  let matches: LorcanaCard[] = [];
  
  // Handle promo sets (P1, P2, C1, D23, etc.)
  if (setStr.match(/^(P[12]|C1|D23)$/)) {
    const promoGroup = setStr;
    console.log(`Looking for promo card with promoGrouping: ${promoGroup} and number: ${cardNumber}`);
    
    // Find cards with matching promoGrouping and card number
    matches = allCards.filter(card => {
      return card.promoGrouping === promoGroup && card.number === cardNumber;
    });
    
  } else {
    // Handle regular sets (001, 002, 008, etc.)
    const setNumber = parseInt(setStr);
    const setCode = isNaN(setNumber) ? setStr : setNumber.toString();
    
    console.log(`Looking for regular card in set: ${setCode}, number: ${cardNumber}`);
    
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
          console.warn(`  -> Using enchanted name match: ${enchantedMatch.setCode}/${enchantedMatch.number}`);
          matches = [enchantedMatch];
        }
      } else if (csvRarity === 'Promo') {
        const promoMatch = nameMatches.find(c => c.promoGrouping);
        if (promoMatch) {
          console.warn(`  -> Using promo name match: ${promoMatch.setCode}/${promoMatch.number}`);
          matches = [promoMatch];
        }
      } else {
        // For regular cards, prefer non-promo, non-enchanted versions
        const regularMatch = nameMatches.find(c => !c.promoGrouping && c.rarity !== 'Enchanted');
        if (regularMatch) {
          console.warn(`  -> Using regular name match: ${regularMatch.setCode}/${regularMatch.number}`);
          matches = [regularMatch];
        } else {
          console.warn(`  -> Using first name match: ${nameMatches[0].setCode}/${nameMatches[0].number}`);
          matches = [nameMatches[0]];
        }
      }
    } else {
      console.warn(`  -> No name match found either`);
      return null;
    }
  }

  if (matches.length > 1) {
    console.warn(`Multiple matches found for Set ${setStr} Card ${cardNumber}, using first match`);
  }

  const matchedCard = matches[0];
  console.log(`✓ Matched: ${csvName} (${setStr}/${cardNumber}) -> Card ID ${matchedCard.id}`);
  return matchedCard;
};

export interface ImportResult {
  importedCards: ImportedCard[];
  failedCards: { name: string; set: string; cardNumber: string; rarity: string }[];
}

export const importDreambornCollection = (csvContent: string, allCards: LorcanaCard[]): ImportResult => {
  try {
    console.log('=== STARTING DREAMBORN IMPORT ===');
    const csvRows = parseDreambornCSV(csvContent);
    console.log(`CSV parsing complete. Found ${csvRows.length} rows with quantities.`);

    // Group cards by their identity to combine normal and foil variants
    const cardQuantityMap = new Map<string, { card: LorcanaCard; normalQuantity: number; foilQuantity: number }>();
    const failedCards: { name: string; set: string; cardNumber: string; rarity: string }[] = [];
    let matchedCards = 0;
    let unmatchedCards = 0;

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];

      if (i < 5) {
        console.log(`Processing row ${i + 1}:`, {
          name: row.Name,
          variant: row.Variant,
          count: row.Count,
          rarity: row.Rarity
        });
      }

      const card = matchCardToDatabase(row, allCards);
      if (!card) {
        unmatchedCards++;
        failedCards.push({
          name: row.Name || 'Unknown',
          set: row['Set Number'] || 'Unknown',
          cardNumber: row['Card Number'] || 'Unknown',
          rarity: row.Rarity || 'Unknown'
        });
        if (unmatchedCards <= 5) {
          console.log(`Could not match card: ${row.Name}`);
        }
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

      matchedCards++;

      if (matchedCards <= 5) {
        console.log(`Matched card: ${row.Name} -> ${card.fullName}, Variant: ${variant}, Count: ${count}`);
      }
    }

    const importedCards: ImportedCard[] = Array.from(cardQuantityMap.values());
    
    console.log(`=== IMPORT SUMMARY ===`);
    console.log(`Total CSV rows with quantities: ${csvRows.length}`);
    console.log(`Successfully matched: ${matchedCards}`);
    console.log(`Could not match: ${unmatchedCards}`);
    console.log(`Final imported cards: ${importedCards.length}`);

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