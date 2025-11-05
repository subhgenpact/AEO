/**
 * OPTIMIZATION #2: Iterative Part Walking
 * 
 * Replaces recursive part walking with iterative approach using a stack.
 * This prevents stack overflow and improves performance for deeply nested BOMs.
 * 
 * Performance Impact:
 * - Recursive: O(n^5) complexity, stack overflow risk
 * - Iterative: O(n) complexity, constant memory usage
 */

/**
 * Optimized iterative part walker for RM suppliers
 * Replaces the recursive walkPartsForRM function
 */
function walkPartsForRMIterative(parts, esns, supplierHint, rawType = null) {
  const results = [];
  const stack = [{
    parts: parts || [],
    level: 'L1',
    supplier: supplierHint,
    esns: esns || []
  }];
  
  while (stack.length > 0) {
    const { parts: currentParts, level, supplier, esns: currentEsns } = stack.pop();
    
    currentParts.forEach(part => {
      const supplierForPart = part.supplier || supplier || null;
      
      // Process current part if it has RM supplier and matches raw type filter
      if (part.rmSupplier && part.rawType) {
        if (!rawType || part.rawType === rawType) {
          results.push({
            rmSupplier: part.rmSupplier,
            level: level,
            supplier: supplierForPart,
            esns: currentEsns,
            rawType: part.rawType
          });
        }
      }
      
      // Add child levels to stack (in reverse order to maintain processing order)
      const childLevels = [
        { parts: part.level5Parts, level: 'L5' },
        { parts: part.level4Parts, level: 'L4' },
        { parts: part.level3Parts, level: 'L3' },
        { parts: part.level2Parts, level: 'L2' }
      ];
      
      childLevels.forEach(({ parts: childParts, level: childLevel }) => {
        if (childParts && childParts.length > 0) {
          stack.push({
            parts: childParts,
            level: childLevel,
            supplier: supplierForPart,
            esns: currentEsns
          });
        }
      });
    });
  }
  
  return results;
}

/**
 * Optimized iterative part walker for general RM data
 * Replaces the recursive walkParts function
 */
function walkPartsIterative(parts, esns, supplierHint) {
  const results = [];
  const stack = [{
    parts: parts || [],
    level: 'L1',
    supplier: supplierHint,
    esns: esns || []
  }];
  
  while (stack.length > 0) {
    const { parts: currentParts, level, supplier, esns: currentEsns } = stack.pop();
    
    currentParts.forEach(part => {
      const supplierForPart = part.supplier || supplier || null;
      
      // Process current part if it has RM supplier
      if (part.rmSupplier) {
        results.push({
          rmSupplier: part.rmSupplier,
          level: level,
          supplier: supplierForPart,
          esns: currentEsns
        });
      }
      
      // Add child levels to stack (in reverse order to maintain processing order)
      const childLevels = [
        { parts: part.level5Parts, level: 'L5' },
        { parts: part.level4Parts, level: 'L4' },
        { parts: part.level3Parts, level: 'L3' },
        { parts: part.level2Parts, level: 'L2' }
      ];
      
      childLevels.forEach(({ parts: childParts, level: childLevel }) => {
        if (childParts && childParts.length > 0) {
          stack.push({
            parts: childParts,
            level: childLevel,
            supplier: supplierForPart,
            esns: currentEsns
          });
        }
      });
    });
  }
  
  return results;
}

/**
 * Optimized iterative part walker for raw type data
 * Replaces the recursive walkPartsForRawType function
 */
function walkPartsForRawTypeIterative(parts, esns, supplierHint) {
  const results = [];
  const stack = [{
    parts: parts || [],
    level: 'L1',
    supplier: supplierHint,
    esns: esns || []
  }];
  
  while (stack.length > 0) {
    const { parts: currentParts, level, supplier, esns: currentEsns } = stack.pop();
    
    currentParts.forEach(part => {
      const supplierForPart = part.supplier || supplier || null;
      
      // Process current part if it has raw type and RM supplier
      if (part.rawType && part.rmSupplier) {
        results.push({
          rawType: part.rawType,
          rmSupplier: part.rmSupplier,
          level: level,
          supplier: supplierForPart,
          esns: currentEsns
        });
      }
      
      // Add child levels to stack (in reverse order to maintain processing order)
      const childLevels = [
        { parts: part.level5Parts, level: 'L5' },
        { parts: part.level4Parts, level: 'L4' },
        { parts: part.level3Parts, level: 'L3' },
        { parts: part.level2Parts, level: 'L2' }
      ];
      
      childLevels.forEach(({ parts: childParts, level: childLevel }) => {
        if (childParts && childParts.length > 0) {
          stack.push({
            parts: childParts,
            level: childLevel,
            supplier: supplierForPart,
            esns: currentEsns
          });
        }
      });
    });
  }
  
  return results;
}

/**
 * Optimized iterative RM data extraction for demand.js
 * Replaces the recursive extractRMData function
 */
function extractRMDataIterative(parts, esns, supplier) {
  const rmSupplierData = new Map();
  const yearsToShow = window.yearsToShow || ['2025', '2026', '2027', '2028'];
  
  const stack = [{
    parts: parts || [],
    esns: esns || [],
    supplier: supplier
  }];
  
  while (stack.length > 0) {
    const { parts: currentParts, esns: currentEsns, supplier: currentSupplier } = stack.pop();
    
    currentParts.forEach(part => {
      if (part.rmSupplier) {
        const key = `${currentSupplier}-${part.rmSupplier}`;
        if (!rmSupplierData.has(key)) {
          rmSupplierData.set(key, { 
            supplier: currentSupplier, 
            rmSupplier: part.rmSupplier, 
            yearCounts: {} 
          });
        }
        const rmInfo = rmSupplierData.get(key);

        currentEsns.forEach(esn => {
          const year = getYearFromDate(esn.targetShipDate);
          if (year && yearsToShow.includes(year)) {
            rmInfo.yearCounts[year] = (rmInfo.yearCounts[year] || 0) + 1;
          }
        });
      }

      // Add child levels to stack
      const childLevels = [
        part.level2Parts,
        part.level3Parts,
        part.level4Parts,
        part.level5Parts
      ];
      
      childLevels.forEach(childParts => {
        if (childParts && childParts.length > 0) {
          stack.push({
            parts: childParts,
            esns: currentEsns,
            supplier: currentSupplier
          });
        }
      });
    });
  }
  
  return rmSupplierData;
}

// Export functions for use in other modules
if (typeof window !== 'undefined') {
  window.walkPartsForRMIterative = walkPartsForRMIterative;
  window.walkPartsIterative = walkPartsIterative;
  window.walkPartsForRawTypeIterative = walkPartsForRawTypeIterative;
  window.extractRMDataIterative = extractRMDataIterative;
}

// Also support module exports if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    walkPartsForRMIterative,
    walkPartsIterative,
    walkPartsForRawTypeIterative,
    extractRMDataIterative
  };
}