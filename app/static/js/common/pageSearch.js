(function () {
  "use strict";

  function getSearchTokens(value) {
    return value.trim().toLowerCase().split(/\s+/).filter(Boolean);
  }

  function itemMatchesSearch(item, tokens) {
    if (tokens.length === 0) {
      return true;
    }

    const searchableText = item.textContent.toLowerCase();

    return tokens.every(function (token) {
      return searchableText.indexOf(token) !== -1;
    });
  }

  function setupPageSearch(searchRoot) {
    const input = searchRoot.querySelector("[data-page-search-input]");
    const clearButton = searchRoot.querySelector("[data-page-search-clear]");
    const targetSelector = searchRoot.getAttribute("data-search-target");
    const emptySelector = searchRoot.getAttribute("data-search-empty");
    const emptyMessage = emptySelector ? document.querySelector(emptySelector) : null;

    if (!input || !targetSelector) {
      return;
    }

    const searchableItems = Array.from(document.querySelectorAll(targetSelector));

    function renderSearchResults() {
      const tokens = getSearchTokens(input.value);
      let visibleCount = 0;

      searchableItems.forEach(function (item) {
        const isVisible = itemMatchesSearch(item, tokens);
        item.hidden = !isVisible;

        if (isVisible) {
          visibleCount += 1;
        }
      });

      if (clearButton) {
        clearButton.hidden = tokens.length === 0;
      }

      if (emptyMessage) {
        emptyMessage.hidden = tokens.length === 0 || visibleCount > 0;
      }
    }

    function clearSearch() {
      input.value = "";
      renderSearchResults();
      input.focus();
    }

    input.addEventListener("input", renderSearchResults);
    input.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && input.value.trim()) {
        event.preventDefault();
        clearSearch();
      }
    });

    if (clearButton) {
      clearButton.addEventListener("click", clearSearch);
    }

    renderSearchResults();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-page-search]").forEach(setupPageSearch);
  });
})();
