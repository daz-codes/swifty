// pagination.js

/**
 * Split array into chunks of specified size
 * @param {Array} items - Items to paginate
 * @param {number} pageSize - Items per page
 * @returns {Array[]} - Array of page chunks
 */
export const chunkPages = (items, pageSize) => {
  const chunks = [];
  for (let i = 0; i < items.length; i += pageSize) {
    chunks.push(items.slice(i, i + pageSize));
  }
  return chunks;
};

/**
 * Generate pagination navigation HTML
 * @param {object} options - Pagination options
 * @param {number} options.currentPage - Current page number (1-indexed)
 * @param {number} options.totalPages - Total number of pages
 * @param {string} options.baseUrl - Base URL for the paginated folder (with trailing slash)
 * @param {object} options.config - Config with CSS class names
 * @returns {string} - HTML for pagination navigation
 */
export const generatePaginationNav = ({ currentPage, totalPages, baseUrl, config = {} }) => {
  if (totalPages <= 1) return '';

  const paginationClass = config.pagination_class || 'swifty_pagination';
  const linkClass = config.pagination_link_class || 'swifty_pagination_link';
  const currentClass = config.pagination_current_class || 'swifty_pagination_current';

  const links = [];

  // Previous link
  if (currentPage > 1) {
    const prevUrl = currentPage === 2 ? baseUrl : `${baseUrl}page/${currentPage - 1}/`;
    links.push(`<a href="${prevUrl}" class="${linkClass} swifty_pagination_prev">&laquo; Previous</a>`);
  }

  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const pageUrl = i === 1 ? baseUrl : `${baseUrl}page/${i}/`;
    if (i === currentPage) {
      links.push(`<span class="${currentClass}">${i}</span>`);
    } else {
      links.push(`<a href="${pageUrl}" class="${linkClass}">${i}</a>`);
    }
  }

  // Next link
  if (currentPage < totalPages) {
    const nextUrl = `${baseUrl}page/${currentPage + 1}/`;
    links.push(`<a href="${nextUrl}" class="${linkClass} swifty_pagination_next">Next &raquo;</a>`);
  }

  return `<nav class="${paginationClass}">${links.join(' ')}</nav>`;
};
