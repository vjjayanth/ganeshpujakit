/* ==========================================================================
   Divine Puja Kits - Application Logic & Store Locator Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ==========================================
  // 1. STORES DATABASE (Sample Verified Stores)
  // ==========================================
  const STORES_DATABASE = (typeof window.STORES_DATABASE !== 'undefined' && window.STORES_DATABASE.length > 0) 
    ? window.STORES_DATABASE 
    : [
    {
      id: "store-001",
      name: "Divine Kits - Malleshwaram Center",
      address: "8th Cross Rd, Sampige Road, Malleshwaram, Bengaluru, Karnataka 560003",
      lat: 13.0033,
      lng: 77.5700,
      hours: "8:00 AM - 8:30 PM"
    }
  ];


  // Default Fallback Coordinates (Bengaluru City Center)
  let selectedCoordinates = { lat: 12.9716, lng: 77.5946 };

  // Default Google Sheets Webhook URL
  const DEFAULT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbyZcR8RClyRo_jpeCEPqk6W9wiFHtroy1nHuAtPL_eW-QRYa-8v4T4HqIBUA3b69kI/exec";

  // LocationIQ Access Token (Primary Address API)
  const LOCATIONIQ_TOKEN = "pk.ba5c48f0ad8a8c94b22e161877b201ca";

  // ==========================================
  // 2. DOM ELEMENTS
  // ==========================================
  const form = document.getElementById('puja-order-form');
  const nameInput = document.getElementById('customer-name');
  const mobileInput = document.getElementById('customer-mobile');
  const qtyInput = document.getElementById('kits-quantity');
  const qtyMinus = document.getElementById('qty-minus');
  const qtyPlus = document.getElementById('qty-plus');
  const addressInput = document.getElementById('customer-address');
  const suggestionsBox = document.getElementById('address-suggestions');
  const geoBtn = document.getElementById('geo-btn');
  const geoStatus = document.getElementById('geo-status');
  const submitBtn = document.getElementById('submit-btn');

  const formSection = document.getElementById('order-form-section');
  const resultsSection = document.getElementById('results-section');
  const summaryKits = document.getElementById('summary-kits');
  const storesListContainer = document.getElementById('stores-list');
  const newOrderBtn = document.getElementById('new-order-btn');

  // Navigation View Elements
  const tabFindNearest = document.getElementById('tab-find-nearest');
  const tabBrowseAll = document.getElementById('tab-browse-all');
  const viewOrderContainer = document.getElementById('view-order-container');
  const viewBrowseContainer = document.getElementById('view-browse-container');

  const browseSearch = document.getElementById('browse-search');
  const regionChipsContainer = document.getElementById('region-chips');
  const allStoresGrid = document.getElementById('all-stores-grid');

  let activeRegion = 'ALL';
  let searchFilterQuery = '';

  // Admin Modal Elements
  const adminTriggerBtn = document.getElementById('admin-trigger-btn');
  const adminModal = document.getElementById('admin-modal');
  const adminCloseBtn = document.getElementById('admin-close-btn');
  const adminAuthBox = document.getElementById('admin-auth');
  const adminPasscodeInput = document.getElementById('admin-passcode');
  const adminLoginBtn = document.getElementById('admin-login-btn');
  const adminPanel = document.getElementById('admin-panel');
  const totalOrdersCount = document.getElementById('total-orders-count');
  const ordersTableBody = document.getElementById('orders-table-body');
  const exportExcelBtn = document.getElementById('export-excel-btn');
  const googleSheetUrlInput = document.getElementById('google-sheet-url');
  const saveWebhookBtn = document.getElementById('save-webhook-btn');
  const clearOrdersBtn = document.getElementById('clear-orders-btn');

  // ==========================================
  // 3. INITIALIZATION
  // ==========================================
  loadSavedWebhookUrl();


  // Quantity Control Events
  qtyMinus.addEventListener('click', () => {
    let currentVal = parseInt(qtyInput.value) || 1;
    if (currentVal > 1) qtyInput.value = currentVal - 1;
  });
  qtyPlus.addEventListener('click', () => {
    let currentVal = parseInt(qtyInput.value) || 1;
    if (currentVal < 20) qtyInput.value = currentVal + 1;
  });

  // Mobile number input formatting (numbers only)
  mobileInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
  });

  // ==========================================
  // 4. FREE ADDRESS AUTOCOMPLETE (Photon API)
  // ==========================================
  let debounceTimer;
  addressInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    clearTimeout(debounceTimer);

    if (query.length < 3) {
      suggestionsBox.classList.add('hidden');
      return;
    }

    debounceTimer = setTimeout(() => {
      fetchAddressSuggestions(query);
    }, 300);
  });

  async function fetchAddressSuggestions(query) {
    // 1. Primary: LocationIQ Autocomplete API (5,000 req/day free, India filtered)
    if (LOCATIONIQ_TOKEN) {
      try {
        const response = await fetch(`https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_TOKEN}&q=${encodeURIComponent(query)}&limit=5&countrycodes=in&format=json`);
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            renderLocationIQSuggestions(data);
            return;
          }
        }
      } catch (err) {
        console.warn("LocationIQ primary API failed, using OpenStreetMap Photon fallback:", err);
      }
    }

    // 2. Fallback: OpenStreetMap Photon API
    try {
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5&lang=en`);
      const data = await response.json();

      if (data && data.features && data.features.length > 0) {
        renderPhotonSuggestions(data.features);
      } else {
        suggestionsBox.classList.add('hidden');
      }
    } catch (err) {
      console.warn("Photon fallback API failed:", err);
      suggestionsBox.classList.add('hidden');
    }
  }

  function renderLocationIQSuggestions(items) {
    suggestionsBox.innerHTML = '';
    items.forEach(item => {
      const displayName = item.display_name;
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);

      if (!displayName || isNaN(lat) || isNaN(lng)) return;

      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.textContent = displayName;
      div.addEventListener('click', () => {
        addressInput.value = displayName;
        selectedCoordinates = { lat, lng };
        suggestionsBox.classList.add('hidden');
        showToast("📍 Location selected!");
      });
      suggestionsBox.appendChild(div);
    });
    suggestionsBox.classList.remove('hidden');
  }

  function renderPhotonSuggestions(features) {
    suggestionsBox.innerHTML = '';
    features.forEach(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates; // [lng, lat]
      
      const displayName = [props.name, props.street, props.district, props.city, props.state, props.postcode]
        .filter(Boolean)
        .join(', ');

      if (!displayName) return;

      const item = document.createElement('div');
      item.className = 'suggestion-item';
      item.textContent = displayName;
      item.addEventListener('click', () => {
        addressInput.value = displayName;
        selectedCoordinates = { lat: coords[1], lng: coords[0] };
        suggestionsBox.classList.add('hidden');
        showToast("📍 Location selected!");
      });
      suggestionsBox.appendChild(item);
    });
    suggestionsBox.classList.remove('hidden');
  }

  // Hide suggestions when clicking outside
  document.addEventListener('click', (e) => {
    if (!addressInput.contains(e.target) && !suggestionsBox.contains(e.target)) {
      suggestionsBox.classList.add('hidden');
    }
  });

  // ==========================================
  // 5. BROWSER GEOLOCATION HANDLER
  // ==========================================
  geoBtn.addEventListener('click', () => {
    if (!navigator.geolocation) {
      geoStatus.textContent = "Geolocation is not supported by your browser.";
      return;
    }

    geoStatus.textContent = "Detecting location...";
    geoBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        selectedCoordinates = { lat: latitude, lng: longitude };
        geoStatus.textContent = "✓ Location detected!";
        geoBtn.disabled = false;

        // Reverse Geocode: LocationIQ (Primary) -> Nominatim (Fallback)
        try {
          let address = null;
          if (LOCATIONIQ_TOKEN) {
            try {
              const res = await fetch(`https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_TOKEN}&lat=${latitude}&lon=${longitude}&format=json`);
              if (res.ok) {
                const data = await res.json();
                if (data && data.display_name) address = data.display_name;
              }
            } catch (e) {
              console.warn("LocationIQ reverse geocode failed, using Nominatim fallback:", e);
            }
          }

          if (!address) {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            if (data && data.display_name) address = data.display_name;
          }

          addressInput.value = address || `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
        } catch (e) {
          addressInput.value = `Detected Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
        }
        showToast("📍 Current location applied!");
      },

      (error) => {
        geoBtn.disabled = false;
        if (error.code === error.PERMISSION_DENIED) {
          geoStatus.textContent = "Permission denied. Please enter address manually.";
        } else {
          geoStatus.textContent = "Unable to retrieve location. Enter address manually.";
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  });

  // ==========================================
  // 6. DISTANCE ENGINE (Haversine Formula)
  // ==========================================
  function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  }

  function getTop5NearestStores(userLat, userLng) {
    const storesWithDistance = STORES_DATABASE.map(store => {
      const dist = parseFloat(calculateDistanceKm(userLat, userLng, store.lat, store.lng));
      return { ...store, distanceKm: dist };
    });

    // Sort by nearest distance
    storesWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

    return storesWithDistance.slice(0, 5);
  }

  // ==========================================
  // 7. FORM SUBMISSION & STORE LOCATOR
  // ==========================================
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validation
    const name = nameInput.value.trim();
    const mobile = mobileInput.value.trim();
    const quantity = parseInt(qtyInput.value) || 1;
    const address = addressInput.value.trim();

    let hasError = false;
    if (!name) {
      document.getElementById('name-error').parentElement.classList.add('has-error');
      hasError = true;
    } else {
      document.getElementById('name-error').parentElement.classList.remove('has-error');
    }

    if (!mobile || mobile.length !== 10) {
      document.getElementById('mobile-error').parentElement.classList.add('has-error');
      hasError = true;
    } else {
      document.getElementById('mobile-error').parentElement.classList.remove('has-error');
    }

    if (!address) {
      document.getElementById('address-error').parentElement.classList.add('has-error');
      hasError = true;
    } else {
      document.getElementById('address-error').parentElement.classList.remove('has-error');
    }

    if (hasError) return;

    // Show Loading State
    const btnText = submitBtn.querySelector('.btn-text');
    const btnSpinner = submitBtn.querySelector('.btn-spinner');
    btnText.textContent = "Locating Nearest Stores...";
    btnSpinner.classList.remove('hidden');
    submitBtn.disabled = true;

    // Compute Nearest Stores
    const topStores = getTop5NearestStores(selectedCoordinates.lat, selectedCoordinates.lng);

    // Save Order Data
    const orderData = {
      id: "ORD-" + Date.now().toString().slice(-6),
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      name,
      mobile,
      kits: quantity,
      address,
      userLat: selectedCoordinates.lat,
      userLng: selectedCoordinates.lng,
      nearestStore: topStores[0].name
    };

    // Save locally
    saveOrderLocally(orderData);

    // Send to Google Sheet Webhook (Async, non-blocking)
    sendToGoogleSheetWebhook(orderData);

    // Render Store Results after short delay
    setTimeout(() => {
      renderTopStores(topStores);
      summaryKits.textContent = quantity;

      formSection.classList.add('hidden');
      resultsSection.classList.remove('hidden');
      window.scrollTo({ top: resultsSection.offsetTop - 80, behavior: 'smooth' });

      // Reset Button State
      btnText.textContent = "Find Nearest Pickup Stores";
      btnSpinner.classList.add('hidden');
      submitBtn.disabled = false;
    }, 600);
  });

  newOrderBtn.addEventListener('click', () => {
    form.reset();
    qtyInput.value = 1;
    resultsSection.classList.add('hidden');
    formSection.classList.remove('hidden');
    window.scrollTo({ top: formSection.offsetTop - 80, behavior: 'smooth' });
  });

  // ==========================================
  // 8. RENDER STORE CARDS & ACTIONS
  // ==========================================
  function renderTopStores(stores) {
    storesListContainer.innerHTML = '';
    storesListContainer.className = 'stores-grid compact-grid';

    stores.forEach((store, index) => {
      const row = document.createElement('div');
      row.className = `compact-store-card ${index === 0 ? 'top-nearest' : ''}`;

      const googleMapsUrl = store.gmapsUrl || (store.lat && store.lng ? `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}` : null);

      row.innerHTML = `
        <div class="compact-info">
          <div class="store-top-bar" style="margin-bottom:4px;">
            <span class="rank-badge">${index === 0 ? '🏆 Closest Option' : `#${index + 1} Nearest`}</span>
            ${store.distanceKm !== undefined ? `<span class="distance-badge">📍 ${store.distanceKm} km away</span>` : ''}
          </div>
          <div class="compact-name">${store.name}</div>
        </div>
        <div class="compact-actions">
          ${store.managerPhone ? `
            <a href="tel:${store.managerPhone.replace(/\s+/g, '')}" class="btn btn-secondary btn-sm">📞 Call Store</a>
          ` : ''}
          ${googleMapsUrl ? `
            <a href="${googleMapsUrl}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">🗺️ Directions</a>
          ` : ''}
        </div>
      `;


      storesListContainer.appendChild(row);
    });
  }


  // ==========================================
  // VIEW SWITCHING & STATE-WISE FILTERING
  // ==========================================
  if (tabFindNearest && tabBrowseAll) {
    tabFindNearest.addEventListener('click', () => {
      tabFindNearest.classList.add('active');
      tabBrowseAll.classList.remove('active');
      viewBrowseContainer.classList.add('hidden');
      viewOrderContainer.classList.remove('hidden');
    });

    tabBrowseAll.addEventListener('click', () => {
      tabBrowseAll.classList.add('active');
      tabFindNearest.classList.remove('active');
      viewOrderContainer.classList.add('hidden');
      viewBrowseContainer.classList.remove('hidden');
      renderFilteredStores();
    });
  }


  // Sub-zone & Pagination Variables
  const zoneChipsContainer = document.getElementById('zone-chips');
  const btnViewCards = document.getElementById('btn-view-cards');
  const btnViewCompact = document.getElementById('btn-view-compact');
  const paginationControls = document.getElementById('pagination-controls');
  const paginationInfo = document.getElementById('pagination-info');
  const paginationButtons = document.getElementById('pagination-buttons');

  let activeZone = 'ALL';
  let currentPage = 1;
  const STORES_PER_PAGE = 12;
  let viewMode = 'CARDS'; // 'CARDS' or 'COMPACT'

  const ZONE_KEYWORDS = {
    WEST_HYD: ['kukatpally', 'miyapur', 'bachupally', 'nizampet', 'kphb', 'pragathi nagar', 'chintal', 'jagdgiri'],
    IT_CORRIDOR: ['gachibowli', 'kondapur', 'kokapet', 'madhapur', 'manikonda', 'q city', 'serilingampally', 'chandanagar'],
    CENTRAL_HYD: ['banjara hills', 'somajiguda', 'panjagutta', 'yosufguda', 'sanath nagar', 'sr nagar', 'mothi nagar', 'moosapet', 'rtc x roads', 'kavadiguda', 'shivam amberpet', 'tarnaka', 'bowenpally'],
    EAST_HYD: ['lb nagar', 'uppal', 'boduppal', 'dilsukhnagar', 'nacharam', 'karmanghat', 'vanasthalipuram', 'champapet', 'meerpet', 'bn reddy', 'almasguda', 'kothapet', 'chaitanyapuri', 'saidabad', 'moulali'],
    NORTH_HYD: ['alwal', 'kompally', 'malkajgiri', 'a.s rao nagar', 'ecil', 'warasiguda', 'padmarao nagar'],
    OTHER_TS_CITIES: ['siddipet', 'karimnagar', 'choutuppal', 'chityal', 'nalgonda', 'suryapet', 'kodad', 'warangal', 'hanmankonda']
  };


  if (zoneChipsContainer) {
    zoneChipsContainer.querySelectorAll('.sub-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        zoneChipsContainer.querySelectorAll('.sub-chip').forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeZone = e.currentTarget.getAttribute('data-zone');
        currentPage = 1;
        renderFilteredStores();
      });
    });
  }

  if (regionChipsContainer) {
    regionChipsContainer.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        regionChipsContainer.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        activeRegion = e.currentTarget.getAttribute('data-region');
        
        // Show Hyderabad sub-chips ONLY when TELANGANA is selected
        if (zoneChipsContainer) {
          if (activeRegion === 'TELANGANA') {
            zoneChipsContainer.classList.remove('hidden');
          } else {
            zoneChipsContainer.classList.add('hidden');
            activeZone = 'ALL'; // Reset zone filter when switching away from Telangana
            zoneChipsContainer.querySelectorAll('.sub-chip').forEach(sc => sc.classList.remove('active'));
            const allSubChip = zoneChipsContainer.querySelector('[data-zone="ALL"]');
            if (allSubChip) allSubChip.classList.add('active');
          }
        }

        currentPage = 1;
        renderFilteredStores();
      });
    });
  }


  if (browseSearch) {
    browseSearch.addEventListener('input', (e) => {
      searchFilterQuery = e.target.value.trim().toLowerCase();
      currentPage = 1;
      renderFilteredStores();
    });
  }

  if (btnViewCards && btnViewCompact) {
    btnViewCards.addEventListener('click', () => {
      btnViewCards.classList.add('active');
      btnViewCompact.classList.remove('active');
      viewMode = 'CARDS';
      renderFilteredStores();
    });

    btnViewCompact.addEventListener('click', () => {
      btnViewCompact.classList.add('active');
      btnViewCards.classList.remove('active');
      viewMode = 'COMPACT';
      renderFilteredStores();
    });
  }

  function matchesZone(store, zoneKey) {
    if (zoneKey === 'ALL') return true;
    const keywords = ZONE_KEYWORDS[zoneKey];
    if (!keywords) return true;

    const locLower = (store.location || '').toLowerCase();
    const addrLower = (store.address || '').toLowerCase();

    return keywords.some(kw => locLower.includes(kw) || addrLower.includes(kw));
  }

  function renderFilteredStores() {
    if (!allStoresGrid) return;
    allStoresGrid.innerHTML = '';

    const filtered = STORES_DATABASE.filter(store => {
      const matchRegion = activeRegion === 'ALL' || (store.region && store.region.toUpperCase() === activeRegion);
      const matchSubZone = matchesZone(store, activeZone);
      
      const q = searchFilterQuery;
      const matchSearch = !q || 
        (store.name && store.name.toLowerCase().includes(q)) ||
        (store.location && store.location.toLowerCase().includes(q)) ||
        (store.address && store.address.toLowerCase().includes(q)) ||
        (store.managerPhone && store.managerPhone.includes(q));

      return matchRegion && matchSubZone && matchSearch;
    });

    if (filtered.length === 0) {
      allStoresGrid.innerHTML = `<div class="empty-table text-center" style="grid-column: 1/-1; padding: 30px;">No stores found matching your search.</div>`;
      if (paginationControls) paginationControls.style.display = 'none';
      return;
    }

    if (paginationControls) paginationControls.style.display = 'flex';

    // Pagination calculations
    const totalStores = filtered.length;
    const totalPages = Math.ceil(totalStores / STORES_PER_PAGE);
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * STORES_PER_PAGE;
    const endIndex = Math.min(startIndex + STORES_PER_PAGE, totalStores);
    const pagedStores = filtered.slice(startIndex, endIndex);

    // Update Pagination Info Text
    if (paginationInfo) {
      paginationInfo.textContent = `Showing ${startIndex + 1}–${endIndex} of ${totalStores} stores`;
    }

    // Set Compact Grid Layout
    allStoresGrid.className = 'stores-grid compact-grid';

    pagedStores.forEach(store => {
      const googleMapsUrl = store.gmapsUrl || (store.lat && store.lng ? `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}` : null);

      const row = document.createElement('div');
      row.className = 'compact-store-card';
      row.innerHTML = `
        <div class="compact-info">
          <div class="compact-name">${store.name}</div>
        </div>
        <div class="compact-actions">
          ${store.managerPhone ? `
            <a href="tel:${store.managerPhone.replace(/\s+/g, '')}" class="btn btn-secondary btn-sm">📞 Call Store</a>
          ` : ''}
          ${googleMapsUrl ? `
            <a href="${googleMapsUrl}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">🗺️ Directions</a>
          ` : ''}
        </div>
      `;
      allStoresGrid.appendChild(row);

    });

    // Render Pagination Buttons
    renderPaginationButtons(totalPages);
  }


  function renderPaginationButtons(totalPages) {
    if (!paginationButtons) return;
    paginationButtons.innerHTML = '';

    if (totalPages <= 1) return;

    // Prev Button
    const prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'page-btn';
    prevBtn.textContent = '‹ Prev';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderFilteredStores();
        window.scrollTo({ top: viewBrowseContainer.offsetTop - 80, behavior: 'smooth' });
      }
    });
    paginationButtons.appendChild(prevBtn);

    // Page Number Buttons
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.type = 'button';
      pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.addEventListener('click', () => {
        currentPage = i;
        renderFilteredStores();
        window.scrollTo({ top: viewBrowseContainer.offsetTop - 80, behavior: 'smooth' });
      });
      paginationButtons.appendChild(pageBtn);
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'page-btn';
    nextBtn.textContent = 'Next ›';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderFilteredStores();
        window.scrollTo({ top: viewBrowseContainer.offsetTop - 80, behavior: 'smooth' });
      }
    });
    paginationButtons.appendChild(nextBtn);
  }


  function renderAllStoresPreview() {
    renderFilteredStores();
  }


  // ==========================================
  // 9. LOCAL DATA & GOOGLE SHEET SYNC
  // ==========================================
  function saveOrderLocally(order) {
    let orders = JSON.parse(localStorage.getItem('puja_orders') || '[]');
    orders.unshift(order);
    localStorage.setItem('puja_orders', JSON.stringify(orders));
  }

  async function sendToGoogleSheetWebhook(orderData) {
    const webhookUrl = localStorage.getItem('google_sheet_webhook_url') || DEFAULT_WEBHOOK_URL;
    if (!webhookUrl) return;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors', // standard for Apps Script endpoints
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });
      console.log("Order logged to Google Sheet Webhook");
    } catch (e) {
      console.warn("Google Sheet sync error:", e);
    }
  }

  function loadSavedWebhookUrl() {
    const savedUrl = localStorage.getItem('google_sheet_webhook_url') || DEFAULT_WEBHOOK_URL;
    if (googleSheetUrlInput) {
      googleSheetUrlInput.value = savedUrl;
    }
  }

  saveWebhookBtn.addEventListener('click', () => {
    const url = googleSheetUrlInput.value.trim();
    localStorage.setItem('google_sheet_webhook_url', url);
    showToast("✓ Webhook URL Saved!");
  });

  // ==========================================
  // 10. HIDDEN ADMIN DASHBOARD & EXCEL EXPORT
  // ==========================================
  adminTriggerBtn.addEventListener('click', () => {
    adminModal.classList.remove('hidden');
  });

  adminCloseBtn.addEventListener('click', () => {
    adminModal.classList.add('hidden');
  });

  adminLoginBtn.addEventListener('click', handleAdminAuth);
  adminPasscodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAdminAuth();
  });

  function handleAdminAuth() {
    const code = adminPasscodeInput.value.trim();
    if (code === 'Badyatha@2026') {
      adminAuthBox.classList.add('hidden');
      adminPanel.classList.remove('hidden');
      renderAdminTable();
    } else {
      document.getElementById('auth-error').style.display = 'block';
    }
  }

  function renderAdminTable() {
    const orders = JSON.parse(localStorage.getItem('puja_orders') || '[]');
    totalOrdersCount.textContent = orders.length;

    if (orders.length === 0) {
      ordersTableBody.innerHTML = `<tr><td colspan="7" class="empty-table">No orders logged yet.</td></tr>`;
      return;
    }

    ordersTableBody.innerHTML = '';
    orders.forEach(order => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><small>${order.timestamp}</small></td>
        <td><strong>${escapeHtml(order.name)}</strong></td>
        <td><a href="tel:${order.mobile}">${order.mobile}</a></td>
        <td><strong>${order.kits}</strong></td>
        <td><small>${escapeHtml(order.address)}</small></td>
        <td>${escapeHtml(order.nearestStore)}</td>
        <td><span class="rank-badge">Reserved</span></td>
      `;
      ordersTableBody.appendChild(tr);
    });
  }

  // EXCEL / CSV DOWNLOAD GENERATOR
  exportExcelBtn.addEventListener('click', () => {
    const orders = JSON.parse(localStorage.getItem('puja_orders') || '[]');
    if (orders.length === 0) {
      showToast("No orders available to export.");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Order ID,Timestamp,Customer Name,Mobile Number,Kits Count,Address,Assigned Store\n";

    orders.forEach(row => {
      const cleanName = `"${(row.name || '').replace(/"/g, '""')}"`;
      const cleanAddress = `"${(row.address || '').replace(/"/g, '""')}"`;
      const cleanStore = `"${(row.nearestStore || '').replace(/"/g, '""')}"`;
      
      const line = `${row.id},${row.timestamp},${cleanName},${row.mobile},${row.kits},${cleanAddress},${cleanStore}`;
      csvContent += line + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Puja_Orders_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("📥 Excel CSV File Downloaded!");
  });

  clearOrdersBtn.addEventListener('click', () => {
    if (confirm("Are you sure you want to clear all local order records?")) {
      localStorage.removeItem('puja_orders');
      renderAdminTable();
      showToast("Orders cleared.");
    }
  });

  // ==========================================
  // 11. TOAST NOTIFICATION SYSTEM
  // ==========================================
  function showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  function escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, function(m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
    });
  }

});
