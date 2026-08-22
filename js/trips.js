/* ============================================
   Kibi — Trips Module
   CRUD operations, tab management, trip cards
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  if (page === 'my-trips') {
    const user = requireAuth();
    if (!user) return;
    initNav('my-trips');
    initMyTrips(user);
  }

  if (page === 'trip-details') {
    initNav('discover', true);
    initTripDetails();
  }

  if (page === 'plan-trip') {
    initNav('plan-trip');
    initPlanTrip();
  }

  if (page === 'itinerary') {
    initNav('itinerary');
    initItineraryPage();
  }

  if (page === 'discover') {
    initNav('discover');
    initDiscover();
  }

  if (page === 'profile') {
    const user = requireAuth();
    if (!user) return;
    initNav('profile');
    initProfile(user);
  }
});

/* ==========================================
   MY TRIPS PAGE
   ========================================== */
function initMyTrips(user) {
  const tabs = document.querySelectorAll('.tab');
  const tabContents = document.querySelectorAll('.tab-content');

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const target = document.getElementById(tab.dataset.tab);
      if (target) target.classList.add('active');
    });
  });

  renderPlannedTrips(user);
  renderJoinedTrips(user);
  renderSavedTripsTab(user);
}

function renderPlannedTrips(user) {
  const container = document.getElementById('plannedTrips');
  if (!container) return;

  const trips = getUserTrips(user.id);

  if (trips.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="heading-4 font-serif text-charcoal mb-1">No planned trips yet</h3>
        <p class="text-text-secondary">Start by planning your first adventure!</p>
        <a href="plan-trip.html" class="btn btn-accent mt-4 shadow-soft hover:shadow-card transition-shadow">Plan a Trip</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    ${trips.map(trip => renderTripCard(trip, true)).join('')}
  </div>`;

  // Attach delete handlers
  container.querySelectorAll('.delete-trip').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Delete this trip?')) {
        deleteTrip(btn.dataset.id);
        renderPlannedTrips(user);
        showToast('Trip deleted', 'default');
      }
    });
  });
}

function renderJoinedTrips(user) {
  const container = document.getElementById('joinedTrips');
  if (!container) return;

  const requests = getUserJoinRequests(user.id);
  const trips = getTrips();

  const joinedTripIds = requests.map(r => r.tripId);
  const joinedTrips = trips.filter(t => joinedTripIds.includes(t.id));

  if (joinedTrips.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="heading-4 font-serif text-charcoal mb-1">No joined trips</h3>
        <p class="text-text-secondary">Browse trips and request to join!</p>
        <a href="discover.html" class="btn btn-accent mt-4 shadow-soft hover:shadow-card transition-shadow">Discover Trips</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    ${joinedTrips.map(trip => {
      const request = requests.find(r => r.tripId === trip.id);
      return renderTripCard(trip, false, request?.status);
    }).join('')}
  </div>`;
}

function renderSavedTripsTab(user) {
  const container = document.getElementById('savedTrips');
  if (!container) return;

  const trips = getSavedTrips(user.id);

  if (trips.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3 class="heading-4 font-serif text-charcoal mb-1">No saved trips</h3>
        <p class="text-text-secondary">Save trips you're interested in!</p>
        <a href="discover.html" class="btn btn-accent mt-4 shadow-soft hover:shadow-card transition-shadow">Discover Trips</a>
      </div>
    `;
    return;
  }

  container.innerHTML = `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
    ${trips.map(trip => renderTripCard(trip)).join('')}
  </div>`;
}

function renderTripCard(trip, showDelete = false, status = null) {
  return `
    <div class="trip-card bg-white rounded-2xl shadow-soft overflow-hidden cursor-pointer hover:-translate-y-1 hover:shadow-card transition-all duration-300" onclick="window.location.href='trip-details.html?id=${trip.id}'">
      <div class="card-image-container aspect-[16/10] overflow-hidden relative">
        <img src="${trip.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80'}" alt="${trip.destination}" class="card-image w-full h-full object-cover" loading="lazy">
        ${status ? `<div class="absolute top-3 right-3">
          <span class="tag ${status === 'pending' ? '' : 'tag-sage'}">${status === 'pending' ? 'Request Sent' : 'Joined'}</span>
        </div>` : ''}
      </div>
      <div class="card-body p-5">
        <div class="card-title font-serif text-lg text-charcoal">${trip.title || trip.destination}</div>
        <div class="card-subtitle text-sm text-text-secondary mt-1">${formatDateRange(trip.startDate, trip.endDate)}</div>
        <div class="trip-card-meta flex items-center justify-between text-sm text-text-secondary mt-3">
          <span>${formatBudget(trip.budget || trip.totalBudget || 0)}</span>
          ${trip.maxMembers ? `<span>${(trip.members || []).length}/${trip.maxMembers} travelers</span>` : ''}
        </div>
      </div>
      ${showDelete ? `
        <div class="card-footer flex items-center justify-between px-5 pb-5">
          <a href="trip-details.html?id=${trip.id}" class="btn btn-ghost btn-sm">View</a>
          <button class="btn btn-ghost btn-sm delete-trip text-error" data-id="${trip.id}">Delete</button>
        </div>
      ` : ''}
    </div>
  `;
}

/* ==========================================
   TRIP DETAILS PAGE
   ========================================== */
function initTripDetails() {
  const tripId = getQueryParam('id');
  if (!tripId) {
    window.location.href = 'discover.html';
    return;
  }

  const trip = getTripById(tripId);
  if (!trip) {
    window.location.href = 'discover.html';
    return;
  }

  const user = getCurrentUser();
  const dest = getDestinationById(trip.destinationId);
  const hasRequested = user ? hasRequestedToJoin(user.id, tripId) : false;

  // Header
  const headerEl = document.getElementById('tripHeader');
  if (headerEl) {
    headerEl.style.backgroundImage = `url(${trip.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80'})`;
    headerEl.innerHTML = `
      <div class="absolute inset-0 bg-gradient-to-t from-charcoal/80 via-charcoal/40 to-transparent flex items-end">
        <div class="max-w-7xl mx-auto px-6 pb-12 w-full">
          <h1 class="font-serif text-4xl md:text-5xl text-white">${trip.title || trip.destination}</h1>
          <p class="text-lg text-white/80 mt-2">${formatDateRange(trip.startDate, trip.endDate)} · ${formatBudget(trip.budget)}</p>
        </div>
      </div>
    `;
  }

  // Description
  const descEl = document.getElementById('tripDescription');
  if (descEl) {
    descEl.innerHTML = `
      <p class="text-large">${trip.description || 'An amazing trip waiting for you.'}</p>
      <div class="tags flex flex-wrap gap-2 mt-6">
        ${(trip.interests || []).map(i => `<span class="tag tag-sage">${i}</span>`).join('')}
        <span class="tag">${trip.travelStyle || 'Adventure'}</span>
        <span class="tag">${trip.socialPreference || 'Small Group'}</span>
      </div>
    `;
  }

  // Compatibility
  if (user) {
    const compatEl = document.getElementById('tripCompat');
    if (compatEl) {
      const score = calculateTripCompatibility(user, trip);
      compatEl.innerHTML = `
        <div class="match-score inline-flex items-center px-6 py-4 rounded-full bg-sage/10 text-sage text-2xl font-semibold">
          <span data-counter="${score}" data-suffix="%" data-duration="1500">0%</span> Match
        </div>
        <p class="text-small text-text-secondary mt-2">Based on your travel profile</p>
      `;
    }
  }

  // Itinerary
  const itinEl = document.getElementById('tripItinerary');
  if (itinEl && trip.itinerary) {
    itinEl.innerHTML = `
      <div class="itinerary-timeline">
        ${trip.itinerary.map(day => `
          <div class="itinerary-day">
            <div class="itinerary-day-label">Day ${day.day} — ${day.title}</div>
            <div class="itinerary-activities">
              ${day.activities.map(act => `
                <div class="itinerary-activity">
                  <div class="activity-icon">${act.icon || '📍'}</div>
                  <div class="activity-info">
                    <div class="activity-name">${act.name}</div>
                    <div class="activity-time">${act.time}${act.cost ? ` · ${formatBudget(act.cost)}` : ''}</div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Members
  const membersEl = document.getElementById('tripMembers');
  if (membersEl && trip.members) {
    const travelers = getSampleTravelers();
    membersEl.innerHTML = `
      <div class="flex flex-wrap gap-3">
        ${trip.members.map(memberId => {
          const member = travelers.find(t => t.id === memberId);
          return member ? `
            <div class="flex items-center gap-2 px-3 py-1.5 bg-cream-dark rounded-full">
              <div class="w-7 h-7 rounded-full bg-sage text-white flex items-center justify-center text-xs font-semibold">${member.avatar || member.name.charAt(0)}</div>
              <span class="text-small text-text-main">${member.name}</span>
            </div>
          ` : '';
        }).join('')}
        ${trip.maxMembers - trip.members.length > 0 ? `
          <div class="text-small text-text-muted px-3 py-1.5">${trip.maxMembers - trip.members.length} spots left</div>
        ` : ''}
      </div>
    `;
  }

  // Join button
  const joinBtn = document.getElementById('joinBtn');
  if (joinBtn) {
    if (!user) {
      joinBtn.textContent = 'Login to Join';
      joinBtn.addEventListener('click', () => { window.location.href = 'login.html'; });
    } else if (hasRequested) {
      joinBtn.textContent = 'Request Sent ✓';
      joinBtn.classList.remove('btn-accent');
      joinBtn.classList.add('btn-secondary');
      joinBtn.disabled = true;
    } else {
      joinBtn.addEventListener('click', () => {
        saveJoinRequest({
          tripId: trip.id,
          userId: user.id
        });

        saveNotification({
          userId: user.id,
          message: `Your request to join "${trip.title || trip.destination}" was sent!`,
          type: 'join_request'
        });

        joinBtn.textContent = 'Request Sent ✓';
        joinBtn.classList.remove('btn-accent');
        joinBtn.classList.add('btn-secondary');
        joinBtn.disabled = true;

        showToast('Join request sent! 🎉', 'success');
      });
    }
  }

  // Save button
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn && user) {
    saveBtn.addEventListener('click', () => {
      saveTripToUser(user.id, trip.id);
      showToast('Trip saved! ✓', 'success');
      saveBtn.textContent = 'Saved ✓';
      saveBtn.disabled = true;
    });
  }

  // Initialize animations
  if (typeof runAnimationInit === 'function') runAnimationInit();
}

/* ==========================================
   PLAN TRIP PAGE
   ========================================== */
function initPlanTrip() {
  const user = getCurrentUser();
  const form = document.getElementById('planForm');
  if (!form) return;

  // Destination Search (Nominatim API Integration)
  const destSearch = document.getElementById('destSearch');
  const destSuggestions = document.getElementById('destSuggestions');
  const destId = document.getElementById('destId');
  const destLat = document.getElementById('destLat');
  const destLon = document.getElementById('destLon');

  if (destSearch && destSuggestions) {
    let debounceTimer;

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
      if (!destSearch.contains(e.target) && !destSuggestions.contains(e.target)) {
        destSuggestions.style.display = 'none';
      }
    });

    destSearch.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      clearTimeout(debounceTimer);

      if (query.length < 3) {
        destSuggestions.style.display = 'none';
        return;
      }

      // Debounce API calls
      debounceTimer = setTimeout(async () => {
        destSuggestions.innerHTML = '<div class="px-4 py-2 text-text-muted text-sm">Searching...</div>';
        destSuggestions.style.display = 'block';

        // Fetch from API
        const results = await GeocodingAPI.searchDestination(query);

        if (!results || results.length === 0) {
          destSuggestions.innerHTML = '<div class="px-4 py-2 text-text-muted text-sm">No destinations found.</div>';
          return;
        }

        destSuggestions.innerHTML = results.map(result => `
          <div class="suggestion-item px-4 py-2 cursor-pointer border-b border-border-light last:border-b-0 transition-colors hover:bg-cream-dark" data-id="${result.id}" data-lat="${result.latitude}" data-lon="${result.longitude}" data-name="${result.name}">
            <div class="font-semibold text-sm text-text-main">${result.name}</div>
            <div class="text-xs text-text-muted">${result.displayName}</div>
          </div>
        `).join('');

        // Add click handlers to suggestions
        destSuggestions.querySelectorAll('.suggestion-item').forEach(item => {
          item.addEventListener('click', () => {
            destSearch.value = item.dataset.name;
            destId.value = item.dataset.id;
            destLat.value = item.dataset.lat;
            destLon.value = item.dataset.lon;
            destSuggestions.style.display = 'none';
          });
        });
      }, 600); // 600ms debounce
    });
  }

  // Pre-fill from user preferences
  if (user) {
    const budgetInput = document.getElementById('budgetInput');
    if (budgetInput && user.budget) {
      const range = parseBudgetRange(user.budget);
      if (range) budgetInput.value = Math.round((range.min + range.max) / 2);
    }
  }

  // Interest chips
  document.querySelectorAll('#planInterests .chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });

  // Travel style chips
  document.querySelectorAll('#planStyles .chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });

  // Generate itinerary
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const destinationName = document.getElementById('destSearch').value;
    const destinationId = document.getElementById('destId').value || 'custom_dest';
    const lat = document.getElementById('destLat').value;
    const lon = document.getElementById('destLon').value;

    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const budget = parseInt(document.getElementById('budgetInput').value);

    const selectedStyles = [...document.querySelectorAll('#planStyles .chip.active')].map(c => c.dataset.value);
    const selectedInterests = [...document.querySelectorAll('#planInterests .chip.active')].map(c => c.dataset.value);
    const socialPref = document.getElementById('socialSelect')?.value || 'Small Group';
    const pace = document.getElementById('paceSelect')?.value || 'Moderate';

    // Validation
    if (!destinationName) return showToast('Please select a destination', 'error');
    if (!startDate) return showToast('Please select a start date', 'error');
    if (!endDate) return showToast('Please select an end date', 'error');
    if (new Date(endDate) <= new Date(startDate)) return showToast('End date must be after start date', 'error');
    if (!budget || budget < 1000) return showToast('Please enter a valid budget (min ₹1,000)', 'error');

    // Show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.innerHTML = '<span class="spinner inline-block w-5 h-5 border-2 mr-2 align-middle"></span> Generating...';
    submitBtn.disabled = true;

    // Generate async
    try {
      const result = await generateItinerary({
        destinationId,
        destinationName,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        startDate,
        endDate,
        budget,
        travelStyle: selectedStyles,
        interests: selectedInterests,
        socialPreference: socialPref,
        travelPace: pace
      });

      if (!result) {
        throw new Error('Itinerary generation failed');
      }

      // Store the generated itinerary temporarily
      sessionStorage.setItem('wm_generated_itinerary', JSON.stringify(result));

      showToast('Itinerary generated! 🎉', 'success');
      setTimeout(() => {
        window.location.href = 'itinerary.html';
      }, 500);

    } catch (err) {
      console.error(err);
      showToast('Could not generate itinerary. Please try again.', 'error');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  });
}

/* ==========================================
   ITINERARY PAGE
   ========================================== */
function initItineraryPage() {
  const data = sessionStorage.getItem('wm_generated_itinerary');
  if (!data) {
    window.location.href = 'plan-trip.html';
    return;
  }

  const itinerary = JSON.parse(data);
  const user = getCurrentUser();

  // 1. Hero Section
  const heroEl = document.getElementById('itinHero');
  if (heroEl) {
    // Generate an image based on destination if available, otherwise fallback
    const bgImage = `https://source.unsplash.com/1600x900/?${encodeURIComponent(itinerary.destination)},travel,city`;
    
    heroEl.innerHTML = `
      <div class="absolute inset-0 bg-cover bg-center" style="background-image: url('${bgImage}')"></div>
      <div class="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/40 to-transparent"></div>
      <div class="relative z-10 w-full flex flex-col md:flex-row justify-between items-end gap-6">
          <div class="text-white max-w-2xl">
              <div class="flex items-center gap-3 mb-4">
                  <span class="px-3 py-1.5 rounded-full bg-blue-500/20 backdrop-blur-md text-blue-100 text-xs font-semibold border border-blue-400/30">Personalized Trip</span>
                  <span class="text-sm text-gray-200 flex items-center gap-1 font-medium">
                      <i class="fa-regular fa-calendar text-xs"></i>
                      ${formatDateRange(itinerary.startDate, itinerary.endDate)}
                  </span>
              </div>
              <h1 class="text-4xl md:text-5xl font-bold mb-3 tracking-tight">${itinerary.destination} Escape</h1>
              <p class="text-lg text-gray-200 opacity-90 font-light">A curated ${itinerary.numDays}-day journey to ${itinerary.destination}.</p>
          </div>
          <div class="flex gap-3 shrink-0 w-full md:w-auto">
              <button class="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md text-white text-sm font-semibold hover:bg-white/20 transition-colors border border-white/20">
                  <i class="fa-solid fa-share-nodes"></i>
                  Share
              </button>
              <button id="saveItinBtn" class="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-full bg-brand-blue text-white text-sm font-semibold hover:bg-brand-blue/80 transition-colors shadow-lg shadow-brand-blue/30 border border-brand-blue/50">
                  <i class="fa-regular fa-bookmark"></i>
                  Save Trip
              </button>
          </div>
      </div>
    `;
    
    const saveBtn = document.getElementById('saveItinBtn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        saveBtn.innerHTML = '<span class="spinner w-4 h-4 mr-2 border-2"></span> Saving...';
        setTimeout(() => {
          const newTrip = {
            ...itinerary,
            title: `${itinerary.destination} Trip`,
            id: generateId(),
            createdAt: new Date().toISOString()
          };
          saveTrip(newTrip);
          showToast(`Your ${itinerary.destination} itinerary has been saved!`, 'success');
          saveBtn.innerHTML = '✅ Saved';
          saveBtn.classList.add('opacity-70');
        }, 800);
      });
    }
  }

  // 2. Timeline
  const timelineEl = document.getElementById('itinTimeline');
  if (timelineEl) {
    // Array of tailwind colors for variation
    const colors = ['blue-500', 'green-500', 'orange-400', 'purple-500', 'pink-500'];
    const textColors = ['blue-600', 'green-600', 'orange-500', 'purple-600', 'pink-600'];
    const bgColors = ['blue-100', 'green-100', 'orange-100', 'purple-100', 'pink-100'];

    timelineEl.innerHTML = itinerary.itinerary.map((day, dIdx) => `
      <div class="glass-panel rounded-3xl p-8 flex flex-col gap-6">
          <div class="flex items-start justify-between border-b border-gray-200/50 pb-6">
              <div>
                  <div class="flex items-center gap-4 mb-2">
                      <span class="w-10 h-10 rounded-full bg-blue-100 text-brand-blue flex items-center justify-center font-bold text-lg">${day.day}</span>
                      <h3 class="text-2xl font-bold text-gray-900">${day.title || `Day ${day.day}`}</h3>
                  </div>
                  <p class="text-gray-600 ml-14">Discovering ${itinerary.destination}'s highlights.</p>
              </div>
              <span class="px-4 py-1.5 bg-gray-100 rounded-full text-xs font-semibold text-gray-600">${itinerary.destination}</span>
          </div>
          <div class="flex flex-col gap-8 relative ml-5 pl-8 border-l-2 border-blue-200 mt-2">
              ${(day.activities || []).map((act, aIdx) => {
                  const cIdx = aIdx % colors.length;
                  const cBorder = `border-${colors[cIdx]}`;
                  const cText = `text-${colors[cIdx]}`;
                  const cTime = `text-${textColors[cIdx]}`;
                  const cBg = `bg-${bgColors[cIdx]}`;
                  
                  return `
                  <div class="relative">
                      <div class="absolute -left-[43px] top-1 w-8 h-8 rounded-full bg-white border-2 ${cBorder} flex items-center justify-center">
                          <span class="text-xs ${cText}">${act.icon || '📍'}</span>
                      </div>
                      <div class="flex flex-col md:flex-row gap-6 md:items-start">
                          <div class="w-24 shrink-0 text-sm font-bold ${cTime} mt-1">${act.time || 'TBD'}</div>
                          <div class="flex-1 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                              <h4 class="font-bold text-gray-900 text-lg mb-2">${act.name}</h4>
                              <p class="text-gray-600 mb-4 text-sm leading-relaxed">${act.description || ''}</p>
                              ${act.cost ? `
                              <div class="flex gap-2">
                                  <span class="px-3 py-1.5 bg-gray-50 rounded-lg text-xs font-medium text-gray-600 flex items-center gap-1.5 border border-gray-100"><i class="fa-solid fa-tag text-gray-400"></i> ${formatBudget(act.cost)}</span>
                              </div>` : ''}
                          </div>
                      </div>
                  </div>
                  `;
              }).join('')}
          </div>
      </div>
    `).join('');
  }

  // 3. Budget
  const budgetEl = document.getElementById('itinBudget');
  if (budgetEl && itinerary.budgetBreakdown) {
    const b = itinerary.budgetBreakdown;
    // Calculate percentages
    const tot = b.total || 1;
    const pStay = Math.round((b.stay / tot) * 100) || 50;
    const pFood = Math.round((b.food / tot) * 100) || 25;
    const pTrans = Math.round((b.transport / tot) * 100) || 15;
    const pAct = Math.round((b.activities / tot) * 100) || 10;
    
    budgetEl.innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-xl font-bold text-gray-900">Budget Estimate</h3>
            <span class="text-2xl font-bold text-brand-blue">₹${b.total}</span>
        </div>
        <div class="flex h-3 w-full rounded-full overflow-hidden mb-6">
            <div class="bg-brand-blue" style="width: ${pStay}%"></div>
            <div class="bg-orange-400" style="width: ${pFood}%"></div>
            <div class="bg-green-400" style="width: ${pTrans}%"></div>
            <div class="bg-purple-400" style="width: ${pAct}%"></div>
        </div>
        <ul class="space-y-4">
            <li class="flex justify-between items-center text-sm">
                <div class="flex items-center gap-2 text-gray-700">
                    <span class="w-3 h-3 rounded-full bg-brand-blue"></span> Stay
                </div>
                <span class="font-bold text-gray-900">₹${b.stay}</span>
            </li>
            <li class="flex justify-between items-center text-sm">
                <div class="flex items-center gap-2 text-gray-700">
                    <span class="w-3 h-3 rounded-full bg-orange-400"></span> Food &amp; Dining
                </div>
                <span class="font-bold text-gray-900">₹${b.food}</span>
            </li>
            <li class="flex justify-between items-center text-sm">
                <div class="flex items-center gap-2 text-gray-700">
                    <span class="w-3 h-3 rounded-full bg-green-400"></span> Transportation
                </div>
                <span class="font-bold text-gray-900">₹${b.transport}</span>
            </li>
            <li class="flex justify-between items-center text-sm">
                <div class="flex items-center gap-2 text-gray-700">
                    <span class="w-3 h-3 rounded-full bg-purple-400"></span> Activities
                </div>
                <span class="font-bold text-gray-900">₹${b.activities}</span>
            </li>
        </ul>
    `;
  }

  // 4. Weather
  const weatherEl = document.getElementById('itinWeather');
  if (weatherEl && itinerary.weather && itinerary.weather.current) {
    const w = itinerary.weather.current;
    const daily = itinerary.weather.daily[0];
    weatherEl.innerHTML = `
        <div class="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-brand-blue text-3xl mb-2">
            ${w.icon}
        </div>
        <h3 class="font-bold text-gray-900 text-lg">Weather Outlook</h3>
        <p class="text-gray-600 text-sm">
            Current conditions are ${w.temp}°C and ${w.condition}. 
            Expect a ${daily.rainProb}% chance of rain with winds around ${w.wind} km/h.
        </p>
    `;
  }
}

