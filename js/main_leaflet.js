// Sacred Taiwan Religious Sites Map - Leaflet Version
// Global variables
var map;
var markersLayer;
var clusterGroup;
var selectedCounty = '';
var selectedGod = '';
var currentFeature = false;
var pointsPool = {};
var searchData = [];
var photoMapping = {};
var countyBoundaryLayer = null;
var countyLabels = {}; // Store county label markers

// Sacred color constants
var SACRED_COLORS = {
  gold: '#D4AF37',
  deepGold: '#B8860B',
  lightGold: '#F4E7B1',
  purple: '#6B46C1',
  deepPurple: '#553C9A',
  lightPurple: '#E0E7FF',
  warmWhite: '#FEFCF8',
  photoGold: '#FFD700',
  crimson: '#DC143C',
  emerald: '#50C878'
};

// Modal instances
var pointPopup = new bootstrap.Modal(document.getElementById('point-popup'));
var settingsPopup = new bootstrap.Modal(document.getElementById('settings-popup'));
var helpPopup = new bootstrap.Modal(document.getElementById('help-popup'));
var fbPopup = new bootstrap.Modal(document.getElementById('fb-popup'));
var content = document.getElementById('infoBox');

// Initialize the map
function initMap() {
  // Create map centered on Taiwan
  map = L.map('map', {
    center: [23.700694, 120.721507],
    zoom: 9,
    zoomControl: false
  });

  // Add custom zoom control
  L.control.zoom({
    position: 'topright'
  }).addTo(map);

  // Add Taiwan base map tiles
  L.tileLayer('https://wmts.nlsc.gov.tw/wmts/EMAP/default/GoogleMapsCompatible/{z}/{y}/{x}', {
    attribution: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>',
    maxZoom: 18,
    opacity: 0.8
  }).addTo(map);

  // Optimized clustering with reduced resource usage
  clusterGroup = L.markerClusterGroup({
    maxClusterRadius: 60,
    iconCreateFunction: function(cluster) {
      return createClusterIcon(cluster);
    },
    spiderfyOnMaxZoom: false,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true,
    disableClusteringAtZoom: 16,
    maxZoom: 15,
    animateAddingMarkers: false,
    chunkedLoading: true,
    chunkInterval: 50,
    chunkProgress: function(processed, total) {
      if (processed === total) {
        console.log('Finished loading ' + total + ' markers');
      }
    }
  });

  map.addLayer(clusterGroup);

  // Load county boundaries
  loadCountyBoundaries();
}

// Optimized cluster icon creation with reduced complexity
function createClusterIcon(cluster) {
  var childCount = cluster.getChildCount();
  var photoCount = 0;
  
  // Simplified analysis - only count photos for performance
  cluster.getAllChildMarkers().forEach(function(marker) {
    if (marker.options.hasPhoto) {
      photoCount++;
    }
  });
  
  var withoutPhoto = childCount - photoCount;
  
  // Simplified size calculation
  var size = Math.min(30 + Math.log(childCount) * 8, 50);
  
  // Simple color scheme - no complex type analysis
  var className = 'marker-cluster';
  if (childCount < 10) {
    className += ' marker-cluster-small';
  } else if (childCount < 100) {
    className += ' marker-cluster-medium';
  } else {
    className += ' marker-cluster-large';
  }
  
  // Simple icon without complex SVG
  return L.divIcon({
    html: `<div class="${className}" style="width: ${size}px; height: ${size}px; line-height: ${size}px;">
             <span class="cluster-count">${withoutPhoto}/${childCount}</span>
           </div>`,
    className: 'marker-cluster-icon',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
}

// Create sacred marker icon
// Optimized marker creation with simple CSS classes
function createSacredIcon(type, hasPhoto, isSelected) {
  var size = isSelected ? 20 : 16;
  
  // Simplified classification
  var typeClass = 'temple';
  if (type === '教會') {
    typeClass = 'church';
  } else if (type === '基金會') {
    typeClass = 'foundation';
  }
  
  var className = `simple-marker marker-${typeClass}`;
  if (hasPhoto) className += ' has-photo';
  if (isSelected) className += ' selected';
  
  return L.divIcon({
    html: `<div class="${className}" style="width: ${size}px; height: ${size}px;"></div>`,
    className: 'marker-icon',
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2]
  });
}

// Load county boundaries - use TopoJSON directly
function loadCountyBoundaries() {
  if (typeof topojson === 'undefined') {
    console.log('TopoJSON library not available, using fallback');
    loadFallbackBoundaries();
    return;
  }
  
  fetch('https://kiang.github.io/taiwan_basecode/county/topo/20200820.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      try {
        // Validate TopoJSON structure
        if (!data || !data.objects) {
          throw new Error('Invalid TopoJSON structure');
        }
        
        // Find the correct object - try common names first, then use first available
        var objectKey = null;
        var possibleKeys = ['county', '20200820', 'counties', 'taiwan', 'boundaries'];
        
        for (var i = 0; i < possibleKeys.length; i++) {
          if (data.objects[possibleKeys[i]]) {
            objectKey = possibleKeys[i];
            break;
          }
        }
        
        // If no known keys found, use the first available object
        if (!objectKey) {
          var availableKeys = Object.keys(data.objects);
          console.log('Available TopoJSON objects:', availableKeys);
          if (availableKeys.length > 0) {
            objectKey = availableKeys[0];
          } else {
            throw new Error('No objects found in TopoJSON');
          }
        }
        
        console.log('Using TopoJSON object:', objectKey);
        
        // Convert TopoJSON to GeoJSON using the found object
        var geojson = topojson.feature(data, data.objects[objectKey]);
        renderCountyBoundaries(geojson);
        
      } catch (conversionError) {
        console.error('Error converting TopoJSON:', conversionError);
        loadFallbackBoundaries();
      }
    })
    .catch(error => {
      console.error('Error loading county boundaries:', error);
      loadFallbackBoundaries();
    });
}

// Render county boundaries with proper error handling
function renderCountyBoundaries(geojson) {
  if (!geojson || !geojson.features) {
    console.error('Invalid GeoJSON for rendering');
    loadFallbackBoundaries();
    return;
  }
  
  // Remove existing boundary layer if it exists
  if (countyBoundaryLayer) {
    map.removeLayer(countyBoundaryLayer);
  }
  
  countyBoundaryLayer = L.geoJSON(geojson, {
    style: function(feature) {
      var countyName = getCountyName(feature);
      var isSelected = selectedCounty === countyName;
      
      return {
        fillColor: isSelected ? SACRED_COLORS.lightGold : SACRED_COLORS.warmWhite,
        weight: isSelected ? 3 : 1,
        opacity: isSelected ? 0.8 : 0.3,
        color: isSelected ? SACRED_COLORS.gold : SACRED_COLORS.lightGold,
        fillOpacity: isSelected ? 0.1 : 0.6
      };
    },
    onEachFeature: function(feature, layer) {
      var countyName = getCountyName(feature);
      if (!countyName) {
        return;
      }
      
      layer.on({
        click: function(e) {
          selectCounty(countyName);
        }
      });
      
      // Create county label
      createCountyLabel(countyName, layer.getBounds().getCenter());
    }
  }).addTo(map);
  
  // If there's already a selected county (from URL hash), update the styling
  if (selectedCounty) {
    console.log('Applying initial county selection styling for:', selectedCounty);
    countyBoundaryLayer.setStyle(function(feature) {
      var fCountyName = getCountyName(feature);
      var isSelected = selectedCounty === fCountyName;
      
      return {
        fillColor: isSelected ? SACRED_COLORS.lightGold : SACRED_COLORS.warmWhite,
        weight: isSelected ? 3 : 1,
        opacity: isSelected ? 0.8 : 0.3,
        color: isSelected ? SACRED_COLORS.gold : SACRED_COLORS.lightGold,
        fillOpacity: isSelected ? 0.1 : 0.6
      };
    });
  }
}

// Create or update county label
function createCountyLabel(countyName, position) {
  // Remove existing label if it exists
  if (countyLabels[countyName]) {
    map.removeLayer(countyLabels[countyName]);
  }
  
  // Only show label if county is not selected
  if (selectedCounty !== countyName) {
    var labelMarker = L.marker(position, {
      icon: L.divIcon({
        html: `<div class="county-label">${countyName}<br/>(請點選)</div>`,
        className: 'county-label-container',
        iconSize: [100, 40],
        iconAnchor: [50, 20]
      })
    });
    
    // Add click handler to the label marker
    labelMarker.on('click', function(e) {
      console.log('County label clicked:', countyName);
      selectCounty(countyName);
    });
    
    countyLabels[countyName] = labelMarker;
    labelMarker.addTo(map);
  }
}

// Unified county selection function
function selectCounty(countyName, skipRouteUpdate) {
  console.log('Selecting county:', countyName, 'skipRouteUpdate:', skipRouteUpdate);
  
  // Check if already selected
  var wasAlreadySelected = selectedCounty === countyName;
  
  // Update selected county
  selectedCounty = countyName;
  
  // Hide the label for selected county
  if (countyLabels[countyName]) {
    map.removeLayer(countyLabels[countyName]);
    delete countyLabels[countyName];
  }
  
  // Update boundary styling
  if (countyBoundaryLayer) {
    countyBoundaryLayer.setStyle(function(feature) {
      var fCountyName = getCountyName(feature);
      var isSelected = selectedCounty === fCountyName;
      
      return {
        fillColor: isSelected ? SACRED_COLORS.lightGold : SACRED_COLORS.warmWhite,
        weight: isSelected ? 3 : 1,
        opacity: isSelected ? 0.8 : 0.3,
        color: isSelected ? SACRED_COLORS.gold : SACRED_COLORS.lightGold,
        fillOpacity: isSelected ? 0.1 : 0.6
      };
    });
  } else {
    // If boundaries aren't loaded yet, wait and retry
    console.log('Boundaries not loaded yet, will retry highlighting');
    setTimeout(function() {
      if (countyBoundaryLayer && selectedCounty === countyName) {
        countyBoundaryLayer.setStyle(function(feature) {
          var fCountyName = getCountyName(feature);
          var isSelected = selectedCounty === fCountyName;
          
          return {
            fillColor: isSelected ? SACRED_COLORS.lightGold : SACRED_COLORS.warmWhite,
            weight: isSelected ? 3 : 1,
            opacity: isSelected ? 0.8 : 0.3,
            color: isSelected ? SACRED_COLORS.gold : SACRED_COLORS.lightGold,
            fillOpacity: isSelected ? 0.1 : 0.6
          };
        });
      }
    }, 1000);
  }
  
  // Load county data only if not already selected
  if (!wasAlreadySelected) {
    loadCountyData(countyName);
  } else {
    console.log('County already selected, skipping data reload');
  }
  
  // Update route only if not already on the correct route and not skipping route update
  if (typeof routie !== 'undefined' && !wasAlreadySelected && !skipRouteUpdate) {
    routie('county/' + countyName);
  }
}

// Helper function to get county name from different property formats
function getCountyName(feature) {
  if (!feature.properties) {
    return null;
  }
  
  return feature.properties.COUNTYNAME || 
         feature.properties.name || 
         feature.properties.Name || 
         feature.properties.县 || 
         feature.properties.縣 ||
         null;
}


// Fallback function to load boundaries or show county list
function loadFallbackBoundaries() {
  console.log('Loading fallback county boundaries...');
  
  // Try alternative GeoJSON source or create simple county list
  var taiwanCounties = [
    '基隆市', '臺北市', '新北市', '桃園市', '新竹市', '新竹縣', 
    '苗栗縣', '臺中市', '彰化縣', '南投縣', '雲林縣', '嘉義市', 
    '嘉義縣', '臺南市', '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', 
    '臺東縣', '澎湖縣', '金門縣', '連江縣'
  ];
  
  // Create a simple county selection interface
  var countyListHtml = '<div class="county-selection"><h3>選擇縣市：</h3><div class="county-grid">';
  taiwanCounties.forEach(function(county, index) {
    console.log('Creating button for county:', county, 'at index:', index);
    countyListHtml += `<button class="county-btn" data-county="${county}" data-index="${index}">${county}</button>`;
  });
  countyListHtml += '</div></div>';
  
  console.log('County selection HTML created:', countyListHtml);
  
  // Add county selection to map
  var countyControl = L.control({position: 'topleft'});
  countyControl.onAdd = function() {
    var div = L.DomUtil.create('div', 'county-control');
    div.innerHTML = countyListHtml;
    
    // Add event listeners to county buttons
    var buttons = div.querySelectorAll('.county-btn');
    console.log('Found', buttons.length, 'county buttons to attach listeners to');
    
    buttons.forEach(function(button, btnIndex) {
      console.log('Attaching listener to button', btnIndex, 'for county:', button.getAttribute('data-county'));
      button.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        var countyName = this.getAttribute('data-county');
        console.log('County button clicked:', countyName);
        
        // Use the unified selection function
        console.log('Using selectCounty function for:', countyName);
        selectCounty(countyName);
        
        // Close the county control after selection
        try {
          map.removeControl(countyControl);
        } catch (removeError) {
          console.log('Could not remove county control:', removeError);
        }
      });
    });
    
    // Prevent map interactions when clicking on the control
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    
    return div;
  };
  countyControl.addTo(map);
}

// Load religious site data for a county
function loadCountyData(countyName) {
  console.log('Loading county data for:', countyName);
  
  if (!pointsPool[countyName]) {
    console.log('Fetching new data for county:', countyName);
    
    fetch(`https://kiang.github.io/religion/data/poi/${countyName}.json`)
      .then(response => {
        console.log('Fetch response status:', response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('County data loaded:', data);
        console.log('Number of features:', data.features ? data.features.length : 'No features property');
        
        pointsPool[countyName] = data;
        addMarkersToMap(data);
        populateSearchData(data.features || []);
      })
      .catch(error => {
        console.error('Error loading county data:', error);
        console.error('Failed URL:', `https://kiang.github.io/religion/data/poi/${countyName}.json`);
        
        // Show user-friendly error message
        alert(`無法載入 ${countyName} 的宗教場所資料。請稍後再試。`);
      });
  } else {
    console.log('Using cached data for county:', countyName);
    console.log('Cached data:', pointsPool[countyName]);
    
    addMarkersToMap(pointsPool[countyName]);
    populateSearchData(pointsPool[countyName].features || []);
  }
}

// Add markers to the map
// Optimized marker loading with chunked processing
function addMarkersToMap(geojsonData) {
  console.log('Adding markers to map. Data:', geojsonData);
  
  if (!geojsonData || !geojsonData.features) {
    console.error('Invalid geojsonData:', geojsonData);
    return;
  }
  
  clusterGroup.clearLayers();
  console.log('Cleared existing layers');
  
  var features = geojsonData.features;
  var batchSize = 50; // Process markers in batches
  var currentIndex = 0;
  var addedCount = 0;
  var skippedCount = 0;
  
  function processBatch() {
    var endIndex = Math.min(currentIndex + batchSize, features.length);
    
    for (var i = currentIndex; i < endIndex; i++) {
      var feature = features[i];
      
      if (!feature || !feature.properties || !feature.geometry) {
        console.warn('Invalid feature at index', i, feature);
        skippedCount++;
        continue;
      }
      
      var props = feature.properties;
      var coords = feature.geometry.coordinates;
      
      if (!coords || coords.length < 2) {
        console.warn('Invalid coordinates for feature:', props.uuid || i);
        skippedCount++;
        continue;
      }
      
      // Skip if filtered by selected god
      if (selectedGod !== '' && (!props['主祀神祇'] || props['主祀神祇'] !== selectedGod)) {
        skippedCount++;
        continue;
      }
      
      try {
        var hasPhoto = photoMapping[props.uuid] ? true : false;
        var icon = createSacredIcon(props['類型'], hasPhoto, false);
        
        var marker = L.marker([coords[1], coords[0]], {
          icon: icon,
          hasPhoto: hasPhoto,
          uuid: props.uuid,
          properties: props
        });
        
        marker.on('click', function(e) {
          var timestamp = Date.now();
          if (typeof routie !== 'undefined') {
            routie('refresh/' + timestamp);
            setTimeout(function() {
              routie('point/' + props['行政區'] + '/' + props.uuid);
            }, 1);
          } else {
            displayPointInfo(selectedCounty, props.uuid);
          }
        });
        
        clusterGroup.addLayer(marker);
        addedCount++;
        
      } catch (markerError) {
        console.error('Error creating marker for feature:', props.uuid || i, markerError);
        skippedCount++;
      }
    }
    
    currentIndex = endIndex;
    
    // Continue processing if there are more features
    if (currentIndex < features.length) {
      setTimeout(processBatch, 10); // Small delay to prevent blocking
    } else {
      // All markers processed
      console.log(`Markers processing complete. Added: ${addedCount}, Skipped: ${skippedCount}`);
      console.log('Total markers in cluster:', clusterGroup.getLayers().length);
      
      // Ensure the map updates
      if (addedCount > 0) {
        try {
          map.fitBounds(clusterGroup.getBounds(), { padding: [20, 20] });
          console.log('Map bounds updated to fit markers');
        } catch (boundsError) {
          console.warn('Could not fit bounds:', boundsError);
        }
      } else {
        console.warn('No markers were added to the map');
      }
    }
  }
  
  // Start processing
  processBatch();
}

// Display point information in popup
function displayPointInfo(county, uuid) {
  // Check if county data is loaded
  if (!pointsPool[county] || !pointsPool[county].features) {
    console.log('County data not loaded yet for:', county);
    // Try again after a delay
    setTimeout(function() {
      displayPointInfo(county, uuid);
    }, 500);
    return;
  }
  
  var features = pointsPool[county].features;
  var feature = features.find(f => f.properties.uuid === uuid);
  
  if (feature) {
    currentFeature = feature;
    var p = feature.properties;
    var coords = feature.geometry.coordinates;
    var message = '';
    
    // Add photo iframe if exists
    if (photoMapping[uuid]) {
      message += '<iframe src="https://drive.google.com/file/d/' + photoMapping[uuid] + '/preview" style="width:100%; height:400px; border:none; margin-bottom:10px; border-radius: 8px;"></iframe>';
    } else {
      message += '<div class="text-center mb-3 p-3" style="background: var(--gradient-light); border-radius: 12px; border: 1px solid var(--primary-gold);">';
      message += '<p style="margin-bottom: 12px; color: var(--text-dark); font-weight: 500;"><i class="fa fa-camera" style="margin-right: 8px; color: var(--primary-gold);"></i>幫助我們記錄這個神聖的地方</p>';
      message += '<a href="https://docs.google.com/forms/d/e/1FAIpQLSdvPybiyuuiTDSk3cuoU_fECQyEqlqCEawzdp12gHkVpLzSmA/viewform?usp=pp_url&entry.2072773208=' + uuid + '" target="_blank" class="btn btn-primary"><i class="fa fa-camera" style="margin-right: 8px;"></i>提供照片</a>';
      message += '</div>';
    }

    message += '<table class="table table-sacred">';
    message += '<tbody>';
    
    // Priority order for religious information
    var priorityFields = ['名稱', '類型', '主祀神祇', '地址', '電話', '負責人', '登記日期'];
    var displayedFields = new Set();
    
    // Display priority fields first
    for (var i = 0; i < priorityFields.length; i++) {
      var field = priorityFields[i];
      if (p[field] && p[field] !== '') {
        var icon = '';
        switch(field) {
          case '名稱': icon = '<i class="fa fa-home" style="margin-right: 8px; color: var(--primary-gold);"></i>'; break;
          case '類型': icon = '<i class="fa fa-tag" style="margin-right: 8px; color: var(--sacred-purple);"></i>'; break;
          case '主祀神祇': icon = '<i class="fa fa-star" style="margin-right: 8px; color: var(--primary-gold);"></i>'; break;
          case '地址': icon = '<i class="fa fa-map-marker" style="margin-right: 8px; color: var(--sacred-purple);"></i>'; break;
          case '電話': icon = '<i class="fa fa-phone" style="margin-right: 8px; color: var(--primary-gold);"></i>'; break;
          case '負責人': icon = '<i class="fa fa-user" style="margin-right: 8px; color: var(--sacred-purple);"></i>'; break;
          case '登記日期': icon = '<i class="fa fa-calendar" style="margin-right: 8px; color: var(--primary-gold);"></i>'; break;
        }
        message += '<tr><th scope="row" style="width: 120px; font-weight: 500;">' + icon + field + '</th><td style="font-weight: 400;">' + p[field] + '</td></tr>';
        displayedFields.add(field);
      }
    }
    
    // Display remaining fields
    for (var k in p) {
      if (k !== 'uuid' && !displayedFields.has(k) && p[k] !== '') {
        message += '<tr><th scope="row" style="width: 120px; font-weight: 500;"><i class="fa fa-info-circle" style="margin-right: 8px; color: var(--text-light);"></i>' + k + '</th><td style="font-weight: 400;">' + p[k] + '</td></tr>';
      }
    }
    
    message += '<tr><td colspan="2" style="border-top: 2px solid var(--primary-gold); padding-top: 20px;">';
    message += '<div class="btn-group-vertical" role="group" style="width: 100%; gap: 8px;">';
    
    message += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + coords[1] + ',' + coords[0] + '&travelmode=driving" target="_blank" class="btn btn-info"><i class="fa fa-google" style="margin-right: 8px;"></i>Google 導航</a>';
    message += '<a href="https://wego.here.com/directions/drive/mylocation/' + coords[1] + ',' + coords[0] + '" target="_blank" class="btn btn-info"><i class="fa fa-location-arrow" style="margin-right: 8px;"></i>Here WeGo 導航</a>';
    message += '<a href="https://bing.com/maps/default.aspx?rtp=~pos.' + coords[1] + '_' + coords[0] + '" target="_blank" class="btn btn-info"><i class="fa fa-compass" style="margin-right: 8px;"></i>Bing 導航</a>';
    message += '</div></td></tr>';
    message += '</tbody></table>';
    
    document.getElementById('pointPopupLabel').innerHTML = '<i class="fa fa-map-marker" style="margin-right: 8px;"></i>' + p['名稱'];
    content.innerHTML = message;
    pointPopup.show();

    // Center the map on the selected point
    map.setView([coords[1], coords[0]], Math.max(map.getZoom(), 14));
    
    // Update marker to show selected state
    updateSelectedMarker(uuid);
  }
}

// Update selected marker styling
function updateSelectedMarker(uuid) {
  clusterGroup.eachLayer(function(marker) {
    if (marker.options.uuid === uuid) {
      var props = marker.options.properties;
      var hasPhoto = marker.options.hasPhoto;
      var selectedIcon = createSacredIcon(props['類型'], hasPhoto, true);
      marker.setIcon(selectedIcon);
    } else {
      var props = marker.options.properties;
      var hasPhoto = marker.options.hasPhoto;
      var normalIcon = createSacredIcon(props['類型'], hasPhoto, false);
      marker.setIcon(normalIcon);
    }
  });
}

// Populate search data
function populateSearchData(features) {
  searchData = [];
  features.forEach(function(feature) {
    var props = feature.properties;
    searchData.push({
      label: props['名稱'] + ' (' + props['地址'] + ') ' + props['電話'],
      value: props['名稱'],
      id: props['uuid']
    });
  });
}

// Load photo mapping from Google Sheets
function loadPhotoMapping() {
  fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vQgdBZV-REAiv3B356dc_IMZcA1ZNoqpXFFvRjzRe0HcNW5dcBc53zyejsWLxpf10Ulp65LuCJUBPnD/pub?gid=681007359&single=true&output=csv')
    .then(response => response.text())
    .then(csvData => {
      const rows = csvData.split('\n');
      rows.shift(); // Remove header row
      rows.forEach(row => {
        const [timestamp, driveUrl, uuid] = row.split(',');
        if (uuid && driveUrl) {
          const idMatch = driveUrl.match(/[-\w]{25,}/);
          const driveId = idMatch ? idMatch[0] : null;
          if (driveId) {
            photoMapping[uuid.trim()] = driveId;
          }
        }
      });

      // Initialize routing after photo mapping is loaded
      initializeRouting();
    });
}

// Initialize routing
function initializeRouting() {
  routie({
    'county/:countyName': function (countyName) {
      selectCounty(countyName);
    },

    'point/:county/:uuid': function (countyName, uuid) {
      // Always use selectCounty to ensure boundary highlighting
      // Pass true to skip route update since we're already on a point route
      if (selectedCounty !== countyName) {
        selectCounty(countyName, true);
      }
      
      // Wait for county data to be loaded before displaying point
      var checkDataAndDisplay = function() {
        if (pointsPool[countyName] && pointsPool[countyName].features) {
          displayPointInfo(countyName, uuid);
        } else {
          // Check again in 200ms
          setTimeout(checkDataAndDisplay, 200);
        }
      };
      
      // Start checking after a short initial delay
      setTimeout(checkDataAndDisplay, 100);
    },

    'refresh/:timestamp': function(timestamp) {
      // Dummy route for refresh functionality
    }
  });
}

// Initialize god selection dropdown
function initializeGodSearch() {
  var gods = '福德正神,釋迦牟尼佛,天上聖母,玄天上帝,關聖帝君,觀世音菩薩,觀音佛祖,保生大帝,五府千歲,池府千歲,三山國王,明明上帝,中壇元帥,清水祖師,三官大帝,神農大帝,李府千歲,觀音菩薩,瑤池金母,北極玄天上帝,阿彌陀佛,廣澤尊王,土地公,開漳聖王,三寶佛,地藏王菩薩,玉皇大帝,朱府千歲,媽祖,吳府千歲,西方三聖,玉皇上帝,大眾爺,真武大帝,文衡聖帝,孚佑帝君,溫府千歲,觀音大士,九天玄女,西王金母,濟公活佛,王母娘娘,三府王爺,池府王爺,太子爺';
  var godsList = gods.split(',');
  var godsOptions = '<option value="">顯示全部</option>';
  for (var k in godsList) {
    godsOptions += '<option value="' + godsList[k] + '">' + godsList[k] + '</option>';
  }
  
  $('#selectGod').html(godsOptions).change(function () {
    $('#findGod').val($(this).val());
    $('#findGod').trigger('change');
  });
  
  $('#findGod').change(function () {
    selectedGod = $(this).val();
    if (selectedCounty && pointsPool[selectedCounty]) {
      addMarkersToMap(pointsPool[selectedCounty]);
    }
  }).val('');
}

// Geolocation functionality
function initializeGeolocation() {
  $('#btn-geolocation').click(function () {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(function(position) {
        var lat = position.coords.latitude;
        var lng = position.coords.longitude;
        map.setView([lat, lng], 14);
        
        // Add current location marker
        L.marker([lat, lng], {
          icon: L.divIcon({
            html: '<div class="current-location-marker"><i class="fa fa-location-arrow"></i></div>',
            className: 'current-location-container',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(map);
      }, function() {
        alert('目前使用的設備無法提供地理資訊');
      });
    } else {
      alert('目前使用的設備無法提供地理資訊');
    }
    return false;
  });
}

// Initialize everything when DOM is ready
$(document).ready(function() {
  // Initialize map
  initMap();
  
  // Load photo mapping
  loadPhotoMapping();
  
  
  // Initialize search functionality
  initializeGodSearch();
  initializeGeolocation();
  
  // Initialize popup interactions (from existing code)
  var fabMenuVisible = false;
  
  $('#main-fab').click(function() {
    var fabMenu = $('#fab-menu');
    if (fabMenuVisible) {
      fabMenu.addClass('d-none');
      $(this).find('i').removeClass('fa-times').addClass('fa-bars');
    } else {
      fabMenu.removeClass('d-none');
      $(this).find('i').removeClass('fa-bars').addClass('fa-times');
    }
    fabMenuVisible = !fabMenuVisible;
  });
  
  $('#fab-settings').click(function() {
    settingsPopup.show();
    $('#fab-menu').addClass('d-none');
    $('#main-fab').find('i').removeClass('fa-times').addClass('fa-bars');
    fabMenuVisible = false;
  });
  
  $('#fab-help').click(function() {
    helpPopup.show();
    $('#fab-menu').addClass('d-none');
    $('#main-fab').find('i').removeClass('fa-times').addClass('fa-bars');
    fabMenuVisible = false;
  });
  
  $(document).click(function(e) {
    if (!$(e.target).closest('#fab-container').length && fabMenuVisible) {
      $('#fab-menu').addClass('d-none');
      $('#main-fab').find('i').removeClass('fa-times').addClass('fa-bars');
      fabMenuVisible = false;
    }
  });

  // Initialize autocomplete
  $('#searchPoint').autocomplete({
    source: function(request, response) {
      var results = $.ui.autocomplete.filter(searchData, request.term);
      response(results.slice(0, 10));
    },
    minLength: 1,
    select: function(event, ui) {
      if (selectedCounty && pointsPool[selectedCounty]) {
        var feature = pointsPool[selectedCounty].features.find(f => f.properties.uuid === ui.item.id);
        if (feature) {
          var county = feature.properties['行政區'];
          var uuid = feature.properties.uuid;
          routie('point/' + county + '/' + uuid);
        }
      }
    }
  });
});