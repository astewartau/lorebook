import { allCards } from '../data/allCards';
import { LorcanaCard } from '../types';

export interface DreambornCSVRow {
  Normal: string;
  Foil: string;
  Name: string;
  Set: string;
  'Card Number': string;
  Color: string;
  Rarity: string;
  Price: string;
  'Foil Price': string;
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
    if (cleanHeader.includes('normal') || cleanHeader === 'normal') {
      headerMap['Normal'] = index;
    } else if (cleanHeader.includes('foil') && !cleanHeader.includes('price')) {
      headerMap['Foil'] = index;
    } else if (cleanHeader.includes('name') && !cleanHeader.includes('set')) {
      headerMap['Name'] = index;
    } else if (cleanHeader.includes('set')) {
      headerMap['Set'] = index;
    } else if (cleanHeader.includes('card') && cleanHeader.includes('number')) {
      headerMap['Card Number'] = index;
    } else if (cleanHeader.includes('color')) {
      headerMap['Color'] = index;
    } else if (cleanHeader.includes('rarity')) {
      headerMap['Rarity'] = index;
    } else if (cleanHeader.includes('price') && !cleanHeader.includes('foil')) {
      headerMap['Price'] = index;
    } else if (cleanHeader.includes('foil') && cleanHeader.includes('price')) {
      headerMap['Foil Price'] = index;
    }
  });
  
  console.log('Header mapping:', headerMap);
  
  const requiredFields = ['Normal', 'Foil', 'Name'];
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

      // Parse quantities with better error handling
      const normalQtyStr = (row.Normal || '0').toString().trim();
      const foilQtyStr = (row.Foil || '0').toString().trim();
      
      const normalQty = parseInt(normalQtyStr) || 0;
      const foilQty = parseInt(foilQtyStr) || 0;
      
      if (totalProcessed <= 5 || i === 128 || i === 129) {
        console.log(`Row ${i + 1} quantities - Normal: '${normalQtyStr}' -> ${normalQty}, Foil: '${foilQtyStr}' -> ${foilQty}`);
        console.log(`Row ${i + 1} parsed:`, row);
      }
      
      if (normalQty > 0 || foilQty > 0) {
        cardsWithQuantity++;
        rows.push(row as DreambornCSVRow);
        
        if (cardsWithQuantity <= 5 || cardsWithQuantity === 129) {
          console.log(`Found card with quantity: ${row.Name}, Normal: ${normalQty}, Foil: ${foilQty}`);
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

export const matchCardToDatabase = (csvRow: DreambornCSVRow): LorcanaCard | null => {
  const { Name: csvName, Set: csvSet, 'Card Number': csvCardNumber, Rarity: csvRarity } = csvRow;
  
  // Parse card number
  const cardNumber = parseInt(csvCardNumber?.toString().trim() || '0');
  
  if (!csvSet || (cardNumber < 0 || isNaN(cardNumber))) {
    console.warn(`Invalid set or card number: Set="${csvSet}", Card Number="${csvCardNumber}" for card: ${csvName}`);
    return null;
  }
  
  const setStr = csvSet.toString().trim();
  
  console.log(`Matching: ${csvName} - CSV Set: ${setStr}, Card Number: ${cardNumber}, Rarity: ${csvRarity}`);
  
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
    
    // Normalize names for matching (case-insensitive, normalize punctuation)
    const normalizedCsvName = csvName.trim().toLowerCase()
      .replace(/['']/g, "'") // Normalize apostrophes
      .replace(/[-–—]/g, "-"); // Normalize dashes
    
    // Fallback to name matching with fuzzy matching
    const nameMatches = allCards.filter(c => {
      const normalizedDbName = c.fullName.toLowerCase()
        .replace(/['']/g, "'")
        .replace(/[-–—]/g, "-");
      
      // Try exact match first (with punctuation)
      if (normalizedDbName === normalizedCsvName) return true;
      
      // For cards without punctuation differences, try without punctuation
      const csvNameNoPunct = normalizedCsvName.replace(/[!?.,]/g, "");
      const dbNameNoPunct = normalizedDbName.replace(/[!?.,]/g, "");
      
      if (dbNameNoPunct === csvNameNoPunct) return true;
      
      // Special case for "Wake Up" vs "Wake Up, Alice!"
      if (csvNameNoPunct === "wake up" && dbNameNoPunct.startsWith("wake up")) return true;
      
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

export const importDreambornCollection = (csvContent: string): ImportResult => {
  try {
    console.log('=== STARTING DREAMBORN IMPORT ===');
    const csvRows = parseDreambornCSV(csvContent);
    console.log(`CSV parsing complete. Found ${csvRows.length} rows with quantities.`);
    
    const importedCards: ImportedCard[] = [];
    const failedCards: { name: string; set: string; cardNumber: string; rarity: string }[] = [];
    let matchedCards = 0;
    let unmatchedCards = 0;

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      
      if (i < 5) {
        console.log(`Processing row ${i + 1}:`, {
          name: row.Name,
          normal: row.Normal,
          foil: row.Foil,
          rarity: row.Rarity
        });
      }
      
      const card = matchCardToDatabase(row);
      if (!card) {
        unmatchedCards++;
        failedCards.push({
          name: row.Name || 'Unknown',
          set: row.Set || 'Unknown',
          cardNumber: row['Card Number'] || 'Unknown',
          rarity: row.Rarity || 'Unknown'
        });
        if (unmatchedCards <= 5) {
          console.log(`Could not match card: ${row.Name}`);
        }
        continue;
      }

      matchedCards++;
      const normalQuantity = parseInt(row.Normal || '0') || 0;
      const foilQuantity = parseInt(row.Foil || '0') || 0;

      importedCards.push({
        card,
        normalQuantity,
        foilQuantity
      });
      
      if (matchedCards <= 5) {
        console.log(`Matched card: ${row.Name} -> ${card.fullName}, Normal: ${normalQuantity}, Foil: ${foilQuantity}`);
      }
    }
    
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