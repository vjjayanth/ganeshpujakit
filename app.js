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
  const tabBookOrder = document.getElementById('tab-book-order');
  const tabFindNearest = document.getElementById('tab-find-nearest');
  const tabBrowseAll = document.getElementById('tab-browse-all');
  const viewBookContainer = document.getElementById('view-book-container');
  const viewNearestContainer = document.getElementById('view-nearest-container');
  const viewBrowseContainer = document.getElementById('view-browse-container');

  const nearestGeoBtn = document.getElementById('nearest-geo-btn');
  const nearestSearchAddress = document.getElementById('nearest-search-address');
  const nearestAddressSuggestions = document.getElementById('nearest-address-suggestions');
  const nearestSearchBtn = document.getElementById('nearest-search-btn');
  const nearestLookupResults = document.getElementById('nearest-lookup-results');
  const nearestStoresGrid = document.getElementById('nearest-stores-grid');

  const browseSearch = document.getElementById('browse-search');
  const regionChipsContainer = document.getElementById('region-chips');
  const allStoresGrid = document.getElementById('all-stores-grid');

  // Modal Elements
  const orderSuccessModal = document.getElementById('order-success-modal');
  const modalOrderId = document.getElementById('modal-order-id');
  const modalUserName = document.getElementById('modal-user-name');
  const modalUserKits = document.getElementById('modal-user-kits');
  const modalOkBtn = document.getElementById('modal-ok-btn');





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
  if (qtyMinus && qtyInput) {
    qtyMinus.addEventListener('click', () => {
      let currentVal = parseInt(qtyInput.value) || 1;
      if (currentVal > 1) qtyInput.value = currentVal - 1;
    });
  }
  if (qtyPlus && qtyInput) {
    qtyPlus.addEventListener('click', () => {
      let currentVal = parseInt(qtyInput.value) || 1;
      if (currentVal < 20) qtyInput.value = currentVal + 1;
    });
  }

  // Mobile number input formatting (numbers only)
  if (mobileInput) {
    mobileInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
  }


  // ==========================================
  // 4. FREE ADDRESS AUTOCOMPLETE (Photon API)
  // ==========================================
  let debounceTimer;
  let activeAutocompleteTarget = 'BOOK'; // 'BOOK' or 'NEAREST'

  if (addressInput) {
    addressInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      clearTimeout(debounceTimer);
      activeAutocompleteTarget = 'BOOK';

      if (query.length < 3) {
        if (suggestionsBox) suggestionsBox.classList.add('hidden');
        return;
      }

      debounceTimer = setTimeout(() => {
        fetchAddressSuggestions(query);
      }, 300);
    });
  }

  if (nearestSearchAddress) {
    nearestSearchAddress.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      clearTimeout(debounceTimer);
      activeAutocompleteTarget = 'NEAREST';

      if (query.length < 3) {
        if (nearestAddressSuggestions) nearestAddressSuggestions.classList.add('hidden');
        return;
      }

      debounceTimer = setTimeout(() => {
        fetchAddressSuggestions(query);
      }, 300);
    });
  }


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
    const targetBox = activeAutocompleteTarget === 'NEAREST' ? nearestAddressSuggestions : suggestionsBox;
    const targetInput = activeAutocompleteTarget === 'NEAREST' ? nearestSearchAddress : addressInput;
    if (!targetBox || !targetInput) return;

    targetBox.innerHTML = '';
    items.forEach(item => {
      const displayName = item.display_name;
      const lat = parseFloat(item.lat);
      const lng = parseFloat(item.lon);

      if (!displayName || isNaN(lat) || isNaN(lng)) return;

      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.textContent = displayName;
      div.addEventListener('click', () => {
        targetInput.value = displayName;
        selectedCoordinates = { lat, lng };
        targetBox.classList.add('hidden');
        showToast("📍 Location selected!");

        if (activeAutocompleteTarget === 'NEAREST') {
          renderNearestLookupStores(lat, lng);
        }
      });
      targetBox.appendChild(div);
    });
    targetBox.classList.remove('hidden');
  }

  function renderPhotonSuggestions(features) {
    const targetBox = activeAutocompleteTarget === 'NEAREST' ? nearestAddressSuggestions : suggestionsBox;
    const targetInput = activeAutocompleteTarget === 'NEAREST' ? nearestSearchAddress : addressInput;
    if (!targetBox || !targetInput) return;

    targetBox.innerHTML = '';
    features.forEach(feature => {
      const props = feature.properties;
      const coords = feature.geometry.coordinates; // [lng, lat]
      
      const displayName = [props.name, props.street, props.district, props.city, props.state, props.postcode]
        .filter(Boolean)
        .join(', ');

      if (!displayName || !coords || coords.length < 2) return;

      const div = document.createElement('div');
      div.className = 'suggestion-item';
      div.textContent = displayName;
      div.addEventListener('click', () => {
        targetInput.value = displayName;
        selectedCoordinates = { lat: coords[1], lng: coords[0] };
        targetBox.classList.add('hidden');
        showToast("📍 Location selected!");

        if (activeAutocompleteTarget === 'NEAREST') {
          renderNearestLookupStores(coords[1], coords[0]);
        }
      });
      targetBox.appendChild(div);
    });
    targetBox.classList.remove('hidden');
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
  if (geoBtn) {
    geoBtn.addEventListener('click', () => {
      if (!navigator.geolocation) {
        if (geoStatus) geoStatus.textContent = "Geolocation is not supported by your browser.";
        return;
      }

      if (geoStatus) geoStatus.textContent = "Detecting location...";
      geoBtn.disabled = true;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          selectedCoordinates = { lat: latitude, lng: longitude };
          if (geoStatus) geoStatus.textContent = "✓ Location detected!";
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

            if (addressInput) addressInput.value = address || `Near ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          } catch (e) {
            if (addressInput) addressInput.value = `Detected Location (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
          }
          showToast("📍 Current location applied!");
        },

        (error) => {
          geoBtn.disabled = false;
          if (error.code === error.PERMISSION_DENIED) {
            if (geoStatus) geoStatus.textContent = "Permission denied. Please enter address manually.";
          } else {
            if (geoStatus) geoStatus.textContent = "Unable to retrieve location. Enter address manually.";
          }
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    });
  }


  // ==========================================
  // 6. DISTANCE ENGINE & MAPS HELPERS
  // ==========================================
  function calculateDistanceKm(lat1, lon1, lat2, lon2) {
    const p1Lat = parseFloat(lat1);
    const p1Lon = parseFloat(lon1);
    const p2Lat = parseFloat(lat2);
    const p2Lon = parseFloat(lon2);

    if (isNaN(p1Lat) || isNaN(p1Lon) || isNaN(p2Lat) || isNaN(p2Lon)) {
      return 999999; // Return high fallback distance for un-geocoded stores
    }

    const R = 6371; // Earth's radius in km
    const dLat = (p2Lat - p1Lat) * Math.PI / 180;
    const dLon = (p2Lon - p1Lon) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1Lat * Math.PI / 180) * Math.cos(p2Lat * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Return raw number for accurate mathematical sorting
  }

  function getTop5NearestStores(userLat, userLng) {
    const validUserLat = parseFloat(userLat);
    const validUserLng = parseFloat(userLng);

    if (isNaN(validUserLat) || isNaN(validUserLng)) {
      return STORES_DATABASE.slice(0, 5).map(s => ({ ...s, distanceKm: undefined }));
    }

    const storesWithDistance = STORES_DATABASE.map(store => {
      const rawDist = calculateDistanceKm(validUserLat, validUserLng, store.lat, store.lng);
      return { 
        ...store, 
        distanceKm: rawDist >= 900000 ? undefined : parseFloat(rawDist.toFixed(1)) 
      };
    });

    // Sort numerically by distance (closest first)
    storesWithDistance.sort((a, b) => {
      const dA = a.distanceKm !== undefined ? a.distanceKm : 999999;
      const dB = b.distanceKm !== undefined ? b.distanceKm : 999999;
      return dA - dB;
    });

    return storesWithDistance.slice(0, 5);
  }

  function getStoreGmapsUrl(store) {
    if (store.gmapsUrl) return store.gmapsUrl;
    if (store.lat && store.lng) {
      return `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}`;
    }
    // Search query fallback for stores without exact lat/lng
    const query = `${store.name}, ${store.location || ''}, Telangana, India`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  function isApproxStore(store) {
    return !store.lat || !store.lng || store.hasDirections === false;
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
    if (btnText) btnText.textContent = "Reserving Kits...";
    if (btnSpinner) btnSpinner.classList.remove('hidden');
    submitBtn.disabled = true;

    // Generate Unique Order ID (Format: PK-MMDD-XXXX)
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const orderId = `PK-${month}${day}-${randomCode}`;

    // Save Order Data
    const orderData = {
      id: orderId,
      timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      name,
      mobile,
      kits: quantity,
      address,
      nearestStore: "N/A (Store Lookup)"
    };

    // Save locally
    saveOrderLocally(orderData);

    // Send to Google Sheet Webhook (Async, non-blocking)
    sendToGoogleSheetWebhook(orderData);

    // Show Popup Modal after short delay
    setTimeout(() => {
      // Reset Button State
      if (btnText) btnText.textContent = "Confirm & Reserve Puja Kits";
      if (btnSpinner) btnSpinner.classList.add('hidden');
      submitBtn.disabled = false;


      // Populate Modal & Display
      if (modalOrderId) modalOrderId.textContent = orderId;
      if (modalUserName) modalUserName.textContent = name;
      if (modalUserKits) modalUserKits.textContent = quantity;
      if (orderSuccessModal) orderSuccessModal.classList.remove('hidden');
    }, 500);

  });

  // Modal OK Button
  if (modalOkBtn) {
    modalOkBtn.addEventListener('click', () => {
      if (orderSuccessModal) orderSuccessModal.classList.add('hidden');
      if (form) form.reset();
      if (qtyInput) qtyInput.value = 1;
    });
  }



  // ==========================================
  // 8. RENDER STORE CARDS & ACTIONS
  // ==========================================
  function renderTopStores(stores) {
    storesListContainer.innerHTML = '';
    storesListContainer.className = 'stores-grid compact-grid';

    stores.forEach((store, index) => {
      const row = document.createElement('div');
      row.className = `compact-store-card ${index === 0 ? 'top-nearest' : ''}`;
      const googleMapsUrl = getStoreGmapsUrl(store);
      const isApprox = isApproxStore(store);

      row.innerHTML = `
        <div class="compact-info">
          <div class="store-top-bar" style="margin-bottom:4px;">
            <span class="rank-badge">${index === 0 ? '🏆 Closest Option' : `#${index + 1} Nearest`}</span>
            ${store.distanceKm !== undefined ? `<span class="distance-badge">📍 ${store.distanceKm} km away</span>` : ''}
            ${isApprox ? `<span class="approx-badge" style="background:#FFF3E0; color:#E65100; font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:12px; margin-left:4px; display:inline-block;">📍 Approx Location</span>` : ''}
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
  function setNavTabActive(activeTab) {
    [tabBookOrder, tabFindNearest, tabBrowseAll].forEach(t => {
      if (t) t.classList.remove('active');
    });
    if (activeTab) activeTab.classList.add('active');
  }

  function showViewContainer(targetContainer) {
    [viewBookContainer, viewNearestContainer, viewBrowseContainer].forEach(c => {
      if (c) c.classList.add('hidden');
    });
    if (targetContainer) {
      targetContainer.classList.remove('hidden');
      // Force animation restart for ultra-smooth scale-fade transition
      targetContainer.style.animation = 'none';
      targetContainer.offsetHeight; // trigger reflow
      targetContainer.style.animation = '';

      // Smooth scroll browser viewport directly to the active content section
      setTimeout(() => {
        const headerOffset = 75;
        const elementPosition = targetContainer.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        window.scrollTo({
          top: Math.max(0, offsetPosition),
          behavior: 'smooth'
        });
      }, 30);
    }
  }


  if (tabBookOrder) {
    tabBookOrder.addEventListener('click', () => {
      setNavTabActive(tabBookOrder);
      showViewContainer(viewBookContainer);
    });
  }

  if (tabFindNearest) {
    tabFindNearest.addEventListener('click', () => {
      setNavTabActive(tabFindNearest);
      showViewContainer(viewNearestContainer);
    });
  }

  if (tabBrowseAll) {
    tabBrowseAll.addEventListener('click', () => {
      setNavTabActive(tabBrowseAll);
      showViewContainer(viewBrowseContainer);
      renderFilteredStores();
    });
  }


  // Standalone Find Nearest Stores Tool Handlers
  if (nearestGeoBtn) {
    nearestGeoBtn.addEventListener('click', () => {
      if (!window.isSecureContext && location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        showToast("⚠️ Mobile GPS requires HTTPS. Type your area below or deploy to Vercel.");
      }

      if (navigator.geolocation) {
        showToast("📍 Detecting your current location...");
        nearestGeoBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
          (position) => {
            nearestGeoBtn.disabled = false;
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            renderNearestLookupStores(userLat, userLng);
            showToast("✓ Nearest stores calculated!");
          },
          (err) => {
            nearestGeoBtn.disabled = false;
            if (err.code === err.PERMISSION_DENIED) {
              showToast("Location permission denied. Please type your area name below.");
            } else if (err.code === err.TIMEOUT) {
              showToast("GPS signal timed out. Please type your area name below.");
            } else {
              showToast("Could not access GPS. Please type your area name below.");
            }
          },
          {
            enableHighAccuracy: false, // Cell/Wi-Fi triangulation is faster & reliable indoors on mobile
            timeout: 12000,
            maximumAge: 60000
          }
        );
      } else {
        showToast("Geolocation not supported. Please type your location below.");
      }
    });
  }

  if (nearestSearchBtn && nearestSearchAddress) {
    nearestSearchBtn.addEventListener('click', async () => {
      const q = nearestSearchAddress.value.trim();
      if (!q) {
        showToast("Please enter an address or area name");
        return;
      }

      showToast("Searching location...");

      // 1. Try LocationIQ Geocoding
      try {
        if (LOCATIONIQ_TOKEN) {
          const res = await fetch(`https://api.locationiq.com/v1/autocomplete?key=${LOCATIONIQ_TOKEN}&q=${encodeURIComponent(q)}&limit=1&countrycodes=in&format=json`);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lng = parseFloat(data[0].lon);
              if (!isNaN(lat) && !isNaN(lng)) {
                renderNearestLookupStores(lat, lng);
                showToast("✓ Found nearest stores!");
                return;
              }
            }
          }
        }
      } catch (e) {
        console.warn("LocationIQ search fallback:", e);
      }

      // 2. Try OpenStreetMap Photon Geocoding
      try {
        const res = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=1&lang=en`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.features && data.features.length > 0) {
            const coords = data.features[0].geometry.coordinates; // [lng, lat]
            if (coords && coords.length >= 2) {
              renderNearestLookupStores(coords[1], coords[0]);
              showToast("✓ Found nearest stores!");
              return;
            }
          }
        }
      } catch (e) {
        console.warn("Photon search fallback:", e);
      }

      // 3. Fallback to default
      renderNearestLookupStores(selectedCoordinates.lat, selectedCoordinates.lng);
    });
  }


  function renderNearestLookupStores(userLat, userLng) {
    if (!nearestStoresGrid) return;
    nearestStoresGrid.innerHTML = '';
    const topStores = getTop5NearestStores(userLat, userLng);

    topStores.forEach((store, index) => {
      const googleMapsUrl = getStoreGmapsUrl(store);
      const isApprox = isApproxStore(store);
      const row = document.createElement('div');
      row.className = `compact-store-card ${index === 0 ? 'top-nearest' : ''}`;
      row.innerHTML = `
        <div class="compact-info">
          <div class="store-top-bar" style="margin-bottom:4px;">
            <span class="rank-badge">${index === 0 ? '🏆 Closest Option' : `#${index + 1} Nearest`}</span>
            ${store.distanceKm !== undefined ? `<span class="distance-badge">📍 ${store.distanceKm} km away</span>` : ''}
            ${isApprox ? `<span class="approx-badge" style="background:#FFF3E0; color:#E65100; font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:12px; margin-left:4px; display:inline-block;">📍 Approx Location</span>` : ''}
          </div>
          <div class="compact-name">${store.name}</div>
        </div>
        <div class="compact-actions">
          ${store.managerPhone ? `<a href="tel:${store.managerPhone.replace(/\s+/g, '')}" class="btn btn-secondary btn-sm">📞 Call Store</a>` : ''}
          ${googleMapsUrl ? `<a href="${googleMapsUrl}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">🗺️ Directions</a>` : ''}
        </div>
      `;
      nearestStoresGrid.appendChild(row);
    });

    if (nearestLookupResults) nearestLookupResults.classList.remove('hidden');
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
            // Smooth jump directly to Telangana sub-zone chips
            setTimeout(() => {
              const headerOffset = 75;
              const elementPosition = zoneChipsContainer.getBoundingClientRect().top;
              const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
              window.scrollTo({ top: Math.max(0, offsetPosition), behavior: 'smooth' });
            }, 30);
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

  let showAllStoresMode = false;

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
      const googleMapsUrl = getStoreGmapsUrl(store);
      const isApprox = isApproxStore(store);

      const row = document.createElement('div');
      row.className = 'compact-store-card';
      row.innerHTML = `
        <div class="compact-info">
          <div class="compact-name">${store.name} ${isApprox ? `<span class="approx-badge" style="background:#FFF3E0; color:#E65100; font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:12px; margin-left:4px; display:inline-block;">📍 Approx Location</span>` : ''}</div>
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


    // Page Number Buttons (All pages 1..totalPages)
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
    let savedUrl = localStorage.getItem('google_sheet_webhook_url');
    if (!savedUrl) {
      savedUrl = DEFAULT_WEBHOOK_URL;
      localStorage.setItem('google_sheet_webhook_url', savedUrl);
    }
    if (googleSheetUrlInput) {
      googleSheetUrlInput.value = savedUrl;
    }
  }


  if (saveWebhookBtn) {
    saveWebhookBtn.addEventListener('click', () => {
      if (googleSheetUrlInput) {
        const url = googleSheetUrlInput.value.trim();
        localStorage.setItem('google_sheet_webhook_url', url);
        showToast("✓ Webhook URL Saved!");
      }
    });
  }

  // ==========================================
  // 10. HIDDEN ADMIN DASHBOARD & EXCEL EXPORT
  // ==========================================
  const togglePasscodeBtn = document.getElementById('toggle-passcode-btn');

  if (togglePasscodeBtn && adminPasscodeInput) {
    togglePasscodeBtn.addEventListener('click', () => {
      const isPassword = adminPasscodeInput.type === 'password';
      adminPasscodeInput.type = isPassword ? 'text' : 'password';
      togglePasscodeBtn.innerHTML = isPassword 
        ? '<span class="material-symbols-outlined" style="font-size: 20px;">visibility_off</span>' 
        : '<span class="material-symbols-outlined" style="font-size: 20px;">visibility</span>';
    });
  }

  if (adminTriggerBtn) {
    adminTriggerBtn.addEventListener('click', () => {
      if (adminModal) adminModal.classList.remove('hidden');
      if (adminPasscodeInput) adminPasscodeInput.focus();
    });
  }


  if (adminCloseBtn) {
    adminCloseBtn.addEventListener('click', () => {
      adminModal.classList.add('hidden');
    });
  }



  // Close modal when clicking outside content backdrop
  if (adminModal) {
    adminModal.addEventListener('click', (e) => {
      if (e.target === adminModal) {
        adminModal.classList.add('hidden');
      }
    });
  }

  // Close modal on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (adminModal && !adminModal.classList.contains('hidden')) {
        adminModal.classList.add('hidden');
      }
      if (orderSuccessModal && !orderSuccessModal.classList.contains('hidden')) {
        orderSuccessModal.classList.add('hidden');
      }
    }
  });

  if (adminLoginBtn) adminLoginBtn.addEventListener('click', handleAdminAuth);
  if (adminPasscodeInput) {
    adminPasscodeInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAdminAuth();
    });
  }


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
    if (totalOrdersCount) totalOrdersCount.textContent = orders.length;

    const totalKits = orders.reduce((sum, order) => sum + (parseInt(order.kits) || 1), 0);
    const totalKitsEl = document.getElementById('total-kits-count');
    if (totalKitsEl) totalKitsEl.textContent = totalKits;

    if (orders.length === 0) {
      ordersTableBody.innerHTML = `<tr><td colspan="6" class="empty-table">No orders logged yet.</td></tr>`;
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
    csvContent += "Order ID,Timestamp,Customer Name,Mobile Number,Kits Count,Address\n";

    orders.forEach(row => {
      const cleanName = `"${(row.name || '').replace(/"/g, '""')}"`;
      const cleanAddress = `"${(row.address || '').replace(/"/g, '""')}"`;
      
      const line = `${row.id || 'PK-PENDING'},${row.timestamp},${cleanName},${row.mobile},${row.kits},${cleanAddress}`;
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
