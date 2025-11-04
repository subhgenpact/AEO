// Utility helpers extracted from demand.js (classic script, global attach)
(function(){
  function safeGetElement(id, context = document) {
    try {
      const element = context.getElementById ? context.getElementById(id) : context.querySelector(`#${id}`);
      if (!element) {
        console.warn(`Element with ID '${id}' not found`);
      }
      return element;
    } catch (error) {
      console.error(`Error getting element '${id}':`, error);
      return null;
    }
  }

  function safeQuerySelector(selector, context = document) {
    try {
      const element = context.querySelector(selector);
      if (!element) {
        console.warn(`Element with selector '${selector}' not found`);
      }
      return element;
    } catch (error) {
      console.error(`Error querying selector '${selector}':`, error);
      return null;
    }
  }

  function safeQuerySelectorAll(selector, context = document) {
    try {
      return context.querySelectorAll(selector);
    } catch (error) {
      console.error(`Error querying selector '${selector}':`, error);
      return [];
    }
  }

  // Extract year from date string format dd/mm/yyyy or mm/dd/yyyy as used in data
  function getYearFromDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      // Assume last part is year
      const y = parts[2].trim();
      return y;
    }
    // Fallback: try to match 4-digit year anywhere
    const match = dateStr.match(/(\d{4})/);
    return match ? match[1] : null;
  }

  // Expose globally
  window.safeGetElement = safeGetElement;
  window.safeQuerySelector = safeQuerySelector;
  window.safeQuerySelectorAll = safeQuerySelectorAll;
  window.getYearFromDate = getYearFromDate;
})();
