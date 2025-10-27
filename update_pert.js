const fs = require('fs');

function updatePertCalculation(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Replace the old PERT calculation with the new one
  const oldCalculation = `    // Complexity multipliers - Only affects range, NOT base time
    const complexityMultipliers = {
      simple: { mostLikely: 1.0, range: 0.2 },    // Tight range (±20%)
      medium: { mostLikely: 1.0, range: 0.5 },    // Medium range (±50%)
      complex: { mostLikely: 1.0, range: 0.8 }    // Wide range (±80%)
    };
    
    // Confidence multipliers - Affects pessimistic dramatically
    const confidenceMultipliers = {
      high: 1.0,    // Pessimistic = mostLikely + range
      medium: 2.0,  // Pessimistic = mostLikely + 2×range
      low: 3.5      // Pessimistic = mostLikely + 3.5×range
    };
    
    const complexity = complexityMultipliers[timeEstimation.complexity];
    const confidence = confidenceMultipliers[timeEstimation.confidence];
    
    const mostLikely = base * complexity.mostLikely;
    const range = base * complexity.range;
    
    return {
      optimistic: Math.max(0.1, mostLikely - range),`;
  
  const newCalculation = `    // Complexity factors - Adds buffer time based on uncertainty
    const complexityFactors = {
      simple: 0.2,    // 20% buffer range
      medium: 0.5,    // 50% buffer range
      complex: 0.8    // 80% buffer range
    };
    
    // Confidence multipliers - Affects how much buffer to add to pessimistic
    const confidenceMultipliers = {
      high: 1.0,    // Pessimistic = base + (range × 1)
      medium: 2.0,  // Pessimistic = base + (range × 2)
      low: 3.5      // Pessimistic = base + (range × 3.5)
    };
    
    const complexityFactor = complexityFactors[timeEstimation.complexity];
    const confidenceMultiplier = confidenceMultipliers[timeEstimation.confidence];
    
    const range = base * complexityFactor;
    
    return {
      optimistic: base,`;
  
  if (content.includes(oldCalculation)) {
    content = content.replace(oldCalculation, newCalculation);
    
    // Also update the return statement
    content = content.replace(
      'optimistic: Math.max(0.1, mostLikely - range),  // At least 0.1 hours\n      mostLikely: mostLikely,\n      pessimistic: mostLikely + (range * confidence)',
      'optimistic: base,                                    // Base estimate is the best case\n      mostLikely: base + (range * 0.5),                   // Add half the range\n      pessimistic: base + (range * confidenceMultiplier)  // Add full adjusted range'
    );
    
    content = content.replace(
      'optimistic: Math.max(0.1, mostLikely - range),\n      mostLikely: mostLikely,\n      pessimistic: mostLikely + (range * confidence)',
      'optimistic: base,                                    // Base estimate is the best case\n      mostLikely: base + (range * 0.5),                   // Add half the range\n      pessimistic: base + (range * confidenceMultiplier)  // Add full adjusted range'
    );
    
    fs.writeFileSync(filePath, content);
    console.log(`✓ Updated ${filePath}`);
    return true;
  } else {
    console.log(`✗ Pattern not found in ${filePath}`);
    return false;
  }
}

// Update both files
updatePertCalculation('client/src/components/request-detail.tsx');
updatePertCalculation('client/src/pages/tasks.tsx');

console.log('Done!');

