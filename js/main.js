// Removed sidebar - using popup modals instead
var jsonFiles, filesLength, fileKey = 0;

var projection = ol.proj.get('EPSG:3857');
var projectionExtent = projection.getExtent();
var size = ol.extent.getWidth(projectionExtent) / 256;
var resolutions = new Array(20);
var matrixIds = new Array(20);
for (var z = 0; z < 20; ++z) {
  // generate resolutions and matrixIds arrays for this WMTS
  resolutions[z] = size / Math.pow(2, z);
  matrixIds[z] = z;
}

var cityList = {};
var filterCity = '', filterTown = '';
var filterExtent = false;
var selectedGod = '';
var emptyStyle = new ol.style.Style();

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

function createSacredMarker(type, hasPhoto, isSelected, size) {
  var fillColor, strokeColor, strokeWidth;
  var innerRadius = size * 0.6;
  var outerRadius = size;
  
  // Define colors based on religious site type
  switch (type) {
    case '寺廟':
    case '宗祠基金會':
    case '宗祠':
      fillColor = hasPhoto ? SACRED_COLORS.photoGold : SACRED_COLORS.gold;
      strokeColor = SACRED_COLORS.deepGold;
      break;
    case '教會':
      fillColor = hasPhoto ? SACRED_COLORS.lightPurple : SACRED_COLORS.purple;
      strokeColor = SACRED_COLORS.deepPurple;
      break;
    case '基金會':
      fillColor = hasPhoto ? SACRED_COLORS.emerald : SACRED_COLORS.lightGold;
      strokeColor = SACRED_COLORS.deepGold;
      break;
    default:
      fillColor = hasPhoto ? SACRED_COLORS.crimson : SACRED_COLORS.gold;
      strokeColor = SACRED_COLORS.deepGold;
      break;
  }
  
  strokeWidth = isSelected ? 4 : 2;
  
  // Create gradient effect with multiple circles
  var styles = [];
  
  // Outer glow (largest circle)
  styles.push(new ol.style.Style({
    image: new ol.style.Circle({
      radius: outerRadius + (isSelected ? 8 : 3),
      fill: new ol.style.Fill({
        color: fillColor + '20' // 20% opacity for glow
      })
    })
  }));
  
  // Main marker circle
  styles.push(new ol.style.Style({
    image: new ol.style.Circle({
      radius: outerRadius,
      fill: new ol.style.Fill({
        color: fillColor
      }),
      stroke: new ol.style.Stroke({
        color: strokeColor,
        width: strokeWidth
      })
    })
  }));
  
  // Inner highlight circle
  styles.push(new ol.style.Style({
    image: new ol.style.Circle({
      radius: innerRadius,
      fill: new ol.style.Fill({
        color: SACRED_COLORS.warmWhite + '40' // 40% opacity for inner glow
      })
    })
  }));
  
  // Central sacred symbol based on type
  var symbolColor = strokeColor;
  var symbolSize = innerRadius * 0.6;
  
  if (type === '寺廟' || type === '宗祠基金會' || type === '宗祠') {
    // Create a small golden dot for temples
    styles.push(new ol.style.Style({
      image: new ol.style.Circle({
        radius: symbolSize,
        fill: new ol.style.Fill({
          color: SACRED_COLORS.deepGold
        })
      })
    }));
  } else if (type === '教會') {
    // Create a cross-like symbol for churches
    styles.push(new ol.style.Style({
      image: new ol.style.RegularShape({
        points: 4,
        radius: symbolSize,
        fill: new ol.style.Fill({
          color: SACRED_COLORS.warmWhite
        }),
        stroke: new ol.style.Stroke({
          color: symbolColor,
          width: 1
        })
      })
    }));
  } else {
    // Default sacred symbol
    styles.push(new ol.style.Style({
      image: new ol.style.Circle({
        radius: symbolSize,
        fill: new ol.style.Fill({
          color: SACRED_COLORS.warmWhite
        }),
        stroke: new ol.style.Stroke({
          color: symbolColor,
          width: 1
        })
      })
    }));
  }
  
  // Photo indicator (golden ring)
  if (hasPhoto) {
    styles.push(new ol.style.Style({
      image: new ol.style.Circle({
        radius: outerRadius + 2,
        stroke: new ol.style.Stroke({
          color: SACRED_COLORS.photoGold,
          width: 3
        })
      })
    }));
  }
  
  return styles;
}

function pointStyle(f, resolution) {
  var p = f.getProperties();
  if (selectedGod !== '' && (!p['主祀神祇'] || p['主祀神祇'] !== selectedGod)) {
    return emptyStyle;
  }

  // Check if this point has a photo in photoMapping
  var hasPhoto = photoMapping[p.uuid] ? true : false;
  var isSelected = false !== currentFeature && currentFeature.get('uuid') == p.uuid;
  var size = isSelected ? 18 : 12;
  
  // Get the sacred marker styles
  var styles = createSacredMarker(p['類型'], hasPhoto, isSelected, size);
  
  // Add label if zoom level > 14 and 主祀神祇 is available
  var zoom = map.getView().getZoomForResolution(resolution);
  if (zoom > 14 && p['主祀神祇']) {
    var labelStyle = new ol.style.Style({
      text: new ol.style.Text({
        text: p['主祀神祇'],
        font: 'bold 13px "Noto Sans TC", sans-serif',
        fill: new ol.style.Fill({color: SACRED_COLORS.deepGold}),
        stroke: new ol.style.Stroke({color: SACRED_COLORS.warmWhite, width: 3}),
        offsetY: -(size + 15),
        textAlign: 'center',
        textBaseline: 'bottom'
      })
    });
    styles.push(labelStyle);
  }

  return styles;
}
var pointPopup = new bootstrap.Modal(document.getElementById('point-popup'));
var settingsPopup = new bootstrap.Modal(document.getElementById('settings-popup'));
var helpPopup = new bootstrap.Modal(document.getElementById('help-popup'));
var fbPopup = new bootstrap.Modal(document.getElementById('fb-popup'));
var content = document.getElementById('infoBox');

var appView = new ol.View({
  center: ol.proj.fromLonLat([120.721507, 23.700694]),
  zoom: 9
});

var pointFormat = new ol.format.GeoJSON({
  featureProjection: appView.getProjection()
});

// Add this near the top of the file, with other imports or global variables
var clusterSource = new ol.source.Cluster({
  distance: 40,
  source: new ol.source.Vector({
    format: pointFormat
  })
});

function vectorPointsStyle(feature, resolution) {
  var size = feature.get('features').length;
  if (size > 1) {
    // For clusters, check if any feature matches the selected god
    if (selectedGod !== '') {
      var matchingFeatures = feature.get('features').filter(function(f) {
        var mainGod = f.getProperties()['主祀神祇'];
        return mainGod && mainGod === selectedGod;
      });
      if (matchingFeatures.length === 0) {
        return emptyStyle;
      }
      size = matchingFeatures.length; // Update size to show only matching features
    }

    // Count features without photos
    var countWithoutPhoto = feature.get('features').filter(function(f) {
      return !photoMapping[f.get('uuid')];
    }).length;
    
    var clusterRadius = Math.min(15 + (size * 2), 35);
    var styles = [];
    
    // Outer glow for cluster
    styles.push(new ol.style.Style({
      image: new ol.style.Circle({
        radius: clusterRadius + 6,
        fill: new ol.style.Fill({
          color: SACRED_COLORS.gold + '30' // 30% opacity glow
        })
      })
    }));
    
    // Main cluster circle with sacred gradient effect
    styles.push(new ol.style.Style({
      image: new ol.style.Circle({
        radius: clusterRadius,
        fill: new ol.style.Fill({
          color: SACRED_COLORS.gold
        }),
        stroke: new ol.style.Stroke({
          color: SACRED_COLORS.deepGold,
          width: 3
        })
      })
    }));
    
    // Inner highlight
    styles.push(new ol.style.Style({
      image: new ol.style.Circle({
        radius: clusterRadius * 0.7,
        fill: new ol.style.Fill({
          color: SACRED_COLORS.warmWhite + '50' // 50% opacity inner glow
        })
      })
    }));
    
    // Text style for cluster count
    styles.push(new ol.style.Style({
      text: new ol.style.Text({
        text: countWithoutPhoto + '/' + size,
        font: 'bold 12px "Noto Sans TC", sans-serif',
        fill: new ol.style.Fill({
          color: SACRED_COLORS.deepGold
        }),
        stroke: new ol.style.Stroke({
          color: SACRED_COLORS.warmWhite,
          width: 2
        }),
        textAlign: 'center',
        textBaseline: 'middle'
      })
    }));

    return styles;
  } else {
    return pointStyle(feature.get('features')[0], resolution);
  }
}

// Define vectorPoints before using it in map configuration
var vectorPoints = new ol.layer.Vector({
  source: clusterSource,
  style: vectorPointsStyle
});

var baseLayer = new ol.layer.Tile({
  source: new ol.source.WMTS({
    matrixSet: 'EPSG:3857',
    format: 'image/png',
    url: 'https://wmts.nlsc.gov.tw/wmts',
    layer: 'EMAP',
    tileGrid: new ol.tilegrid.WMTS({
      origin: ol.extent.getTopLeft(projectionExtent),
      resolutions: resolutions,
      matrixIds: matrixIds
    }),
    style: 'default',
    wrapX: true,
    attributions: '<a href="http://maps.nlsc.gov.tw/" target="_blank">國土測繪圖資服務雲</a>'
  }),
  opacity: 0.8
});

function countyStyle(f) {
  var p = f.getProperties();
  if (selectedCounty === p.COUNTYNAME) {
    return null;
  }
  var color = 'rgba(255,255,255,0.6)';
  var strokeWidth = 1;
  var strokeColor = 'rgba(0,0,0,0.3)';
  var cityKey = p.COUNTYNAME;
  var textColor = '#000000';
  var baseStyle = new ol.style.Style({
    stroke: new ol.style.Stroke({
      color: strokeColor,
      width: strokeWidth
    }),
    fill: new ol.style.Fill({
      color: color
    }),
    text: new ol.style.Text({
      font: '14px "Open Sans", "Arial Unicode MS", "sans-serif"',
      text: p.COUNTYNAME + "\n(請點選)",
      fill: new ol.style.Fill({
        color: textColor
      })
    })
  });
  return baseStyle;
}

var county = new ol.layer.Vector({
  source: new ol.source.Vector({
    url: 'https://kiang.github.io/taiwan_basecode/county/topo/20200820.json',
    format: new ol.format.TopoJSON({
      featureProjection: appView.getProjection()
    })
  }),
  style: countyStyle,
  zIndex: 50
});


var map = new ol.Map({
  layers: [baseLayer, county, vectorPoints],
  target: 'map',
  view: appView
});

// Removed sidebar control - using popup modals instead
var pointClicked = false;
var selectedCounty = '';
var pointsPool = {};
// Add hover effects for markers
map.on('pointermove', function(evt) {
  var hit = map.hasFeatureAtPixel(evt.pixel);
  map.getTargetElement().style.cursor = hit ? 'pointer' : '';
  
  // Change marker appearance on hover
  if (hit) {
    map.forEachFeatureAtPixel(evt.pixel, function(feature, layer) {
      if (feature.get('features')) {
        // This is a point feature, add hover effect
        vectorPoints.getSource().changed();
      }
    });
  }
});

map.on('singleclick', function (evt) {
  content.innerHTML = '';
  pointClicked = false;
  map.forEachFeatureAtPixel(evt.pixel, function (feature, layer) {
    if (false === pointClicked) {
      if (feature.get('features')) {
        // This is a cluster or a point from vectorPoints layer
        var features = feature.get('features');
        if (features.length === 1) {
          pointClicked = true;
          var p = features[0].getProperties();
          if (p.uuid) {
            // Force route refresh by adding and removing a timestamp
            var timestamp = Date.now();
            routie('refresh/' + timestamp);
            setTimeout(function() {
              routie('point/' + p['行政區'] + '/' + p.uuid);
            }, 1);
          }
        } else if (features.length > 1) {
          // Clear popup content and close it when clicking on a cluster
          content.innerHTML = '';
          pointPopup.hide();
          
          // Zoom in when clicking on a cluster
          var extent = ol.extent.createEmpty();
          features.forEach(function(f) {
            ol.extent.extend(extent, f.getGeometry().getExtent());
          });
          
          var currentZoom = map.getView().getZoom();
          var newZoom = currentZoom + Math.log2(features.length);
          newZoom = Math.min(newZoom, 20); // Limit max zoom level
          
          map.getView().fit(extent, {
            duration: 1000,
            padding: [50, 50, 50, 50],
            maxZoom: newZoom
          });
          
          pointClicked = true;
        }
      } else if (feature.get('COUNTYNAME')) {
        // This is a county feature
        pointClicked = true;
        routie('county/' + feature.get('COUNTYNAME'));
      }
    }
  });
  if(false === pointClicked) {
    content.innerHTML = '';
    pointPopup.hide();
  }
});

// Add a dummy route for refresh
routie('refresh/:timestamp', function(timestamp) {
  // Do nothing, this is just for forcing route refresh
});

var previousFeature = false;
var currentFeature = false;

var geolocation = new ol.Geolocation({
  projection: appView.getProjection()
});

geolocation.setTracking(true);

geolocation.on('error', function (error) {
  console.log(error.message);
});

var positionFeature = new ol.Feature();

positionFeature.setStyle(new ol.style.Style({
  image: new ol.style.Circle({
    radius: 6,
    fill: new ol.style.Fill({
      color: '#3399CC'
    }),
    stroke: new ol.style.Stroke({
      color: '#fff',
      width: 2
    })
  })
}));

var firstPosDone = false;
geolocation.on('change:position', function () {
  var coordinates = geolocation.getPosition();
  positionFeature.setGeometry(coordinates ? new ol.geom.Point(coordinates) : null);
  if (false === firstPosDone) {
    map.dispatchEvent({
      type: 'singleclick',
      coordinate: coordinates,
      pixel: map.getPixelFromCoordinate(coordinates)
    });
    appView.setCenter(coordinates);
    firstPosDone = true;
  }
});

new ol.layer.Vector({
  map: map,
  source: new ol.source.Vector({
    features: [positionFeature]
  })
});

$('#btn-geolocation').click(function () {
  var coordinates = geolocation.getPosition();
  if (coordinates) {
    appView.setCenter(coordinates);
  } else {
    alert('目前使用的設備無法提供地理資訊');
  }
  return false;
});

var gods = '福德正神,釋迦牟尼佛,天上聖母,玄天上帝,關聖帝君,觀世音菩薩,觀音佛祖,保生大帝,五府千歲,池府千歲,三山國王,明明上帝,中壇元帥,清水祖師,三官大帝,神農大帝,李府千歲,觀音菩薩,瑤池金母,北極玄天上帝,阿彌陀佛,廣澤尊王,土地公,開漳聖王,三寶佛,地藏王菩薩,玉皇大帝,朱府千歲,媽祖,吳府千歲,西方三聖,玉皇上帝,大眾爺,真武大帝,文衡聖帝,孚佑帝君,溫府千歲,觀音大士,九天玄女,西王金母,濟公活佛,王母娘娘,三府王爺,池府王爺,太子爺';
var godsList = gods.split(',');
var godsOptions = '<option value="">顯示全部</option>';
for (k in godsList) {
  godsOptions += '<option value="' + godsList[k] + '">' + godsList[k] + '</option>';
}
$('#selectGod').html(godsOptions).change(function () {
  $('#findGod').val($(this).val());
  $('#findGod').trigger('change');
});
$('#findGod').change(function () {
  selectedGod = $(this).val();
  clusterSource.refresh();
}).val('');

// Add this near the top of the file, after other variable declarations
var searchData = [];

// Add near the top with other variable declarations
var photoMapping = {};

// Move routie configuration into the success callback of loadPhotoMapping
function loadPhotoMapping() {
  $.ajax({
    url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQgdBZV-REAiv3B356dc_IMZcA1ZNoqpXFFvRjzRe0HcNW5dcBc53zyejsWLxpf10Ulp65LuCJUBPnD/pub?gid=681007359&single=true&output=csv',
    success: function(csvData) {
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

      // Initialize routie after photoMapping is loaded
      routie({
        'county/:countyName': function (countyName) {
          selectedCounty = countyName;
          clusterSource.getSource().clear();
          searchData = []; // Clear previous search data
          if (!pointsPool[selectedCounty]) {
            $.getJSON('https://kiang.github.io/religion/data/poi/' + selectedCounty + '.json', function (c) {
              pointsPool[selectedCounty] = c;
              var features = pointFormat.readFeatures(pointsPool[selectedCounty]);
              clusterSource.getSource().addFeatures(features);
              populateSearchData(features);
            });
          } else {
            var features = pointFormat.readFeatures(pointsPool[selectedCounty]);
            clusterSource.getSource().addFeatures(features);
            populateSearchData(features);
          }
          county.getSource().refresh();
        },

        'point/:county/:uuid': function (countyName, uuid) {
          if (!pointsPool[countyName]) {
            searchData = []; // Clear previous search data
            clusterSource.getSource().clear();
            selectedCounty = countyName;
            county.getSource().refresh();
            $.getJSON('https://kiang.github.io/religion/data/poi/' + countyName + '.json', function (c) {
              pointsPool[countyName] = c;
              var features = pointFormat.readFeatures(pointsPool[selectedCounty]);
              clusterSource.getSource().addFeatures(features);
              populateSearchData(features);
              displayPointInfo(countyName, uuid);
            });
          } else if(selectedCounty != countyName) {
            clusterSource.getSource().clear();
            selectedCounty = countyName;
            county.getSource().refresh();
            clusterSource.getSource().addFeatures(pointFormat.readFeatures(pointsPool[countyName]));
            displayPointInfo(countyName, uuid);
          } else {
            displayPointInfo(countyName, uuid);
          }
        }
      });
    }
  });
}

// Call loadPhotoMapping immediately
loadPhotoMapping();

// Initialize popup interactions
$(document).ready(function() {
  // Floating Action Button interactions
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
  
  // Settings popup
  $('#fab-settings').click(function() {
    settingsPopup.show();
    // Close fab menu
    $('#fab-menu').addClass('d-none');
    $('#main-fab').find('i').removeClass('fa-times').addClass('fa-bars');
    fabMenuVisible = false;
  });
  
  // Help popup
  $('#fab-help').click(function() {
    helpPopup.show();
    // Close fab menu
    $('#fab-menu').addClass('d-none');
    $('#main-fab').find('i').removeClass('fa-times').addClass('fa-bars');
    fabMenuVisible = false;
  });
  
  
  // Close fab menu when clicking outside
  $(document).click(function(e) {
    if (!$(e.target).closest('#fab-container').length && fabMenuVisible) {
      $('#fab-menu').addClass('d-none');
      $('#main-fab').find('i').removeClass('fa-times').addClass('fa-bars');
      fabMenuVisible = false;
    }
  });
});

// Wrap the autocomplete initialization in a jQuery ready function
$(document).ready(function() {
  $('#searchPoint').autocomplete({
    source: function(request, response) {
      var results = $.ui.autocomplete.filter(searchData, request.term);
      response(results.slice(0, 10)); // Limit to 10 results
    },
    minLength: 1,
    select: function(event, ui) {
      var features = clusterSource.getSource().getFeatures();
      var feature = features.find(f => f.get('uuid') === ui.item.id);
      if (feature) {
        var county = feature.get('行政區');
        var uuid = feature.get('uuid');
        routie('point/' + county + '/' + uuid);
      }
    }
  });
});

// Add this function to populate searchData
function populateSearchData(features) {
  features.forEach(function(feature) {
    var props = feature.getProperties();
    searchData.push({
      label: props['名稱'] + ' (' + props['地址'] + ') ' + props['電話'],
      value: props['名稱'],
      id: props['uuid']
    });
  });
}

// Modify the displayPointInfo function to set feature ID
function displayPointInfo(county, uuid) {
  var features = pointFormat.readFeatures(pointsPool[county]);
  var feature = features.find(f => f.get('uuid') === uuid);
  
  if (feature) {
    feature.setId(uuid); // Set feature ID for later retrieval
    currentFeature = feature;
    
    var p = feature.getProperties();
    var lonLat = ol.proj.toLonLat(p.geometry.getCoordinates());
    var message = '';
    // Add photo iframe if exists
    if (photoMapping[uuid]) {
      message += '<iframe src="https://drive.google.com/file/d/' + photoMapping[uuid] + '/preview" style="width:100%; height:400px; border:none; margin-bottom:10px;"></iframe>';
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
    for (k in p) {
      if (k != 'geometry' && k != 'uuid' && k != 'WGS84X' && k != 'WGS84Y' && !displayedFields.has(k) && p[k] !== '') {
        message += '<tr><th scope="row" style="width: 120px; font-weight: 500;"><i class="fa fa-info-circle" style="margin-right: 8px; color: var(--text-light);"></i>' + k + '</th><td style="font-weight: 400;">' + p[k] + '</td></tr>';
      }
    }
    
    message += '<tr><td colspan="2" style="border-top: 2px solid var(--primary-gold); padding-top: 20px;">';
    message += '<div class="btn-group-vertical" role="group" style="width: 100%; gap: 8px;">';
    
    message += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + lonLat[1] + ',' + lonLat[0] + '&travelmode=driving" target="_blank" class="btn btn-info"><i class="fa fa-google" style="margin-right: 8px;"></i>Google 導航</a>';
    message += '<a href="https://wego.here.com/directions/drive/mylocation/' + lonLat[1] + ',' + lonLat[0] + '" target="_blank" class="btn btn-info"><i class="fa fa-location-arrow" style="margin-right: 8px;"></i>Here WeGo 導航</a>';
    message += '<a href="https://bing.com/maps/default.aspx?rtp=~pos.' + lonLat[1] + '_' + lonLat[0] + '" target="_blank" class="btn btn-info"><i class="fa fa-compass" style="margin-right: 8px;"></i>Bing 導航</a>';
    message += '</div></td></tr>';
    message += '</tbody></table>';
    document.getElementById('pointPopupLabel').innerHTML = p['名稱'];
    content.innerHTML = message;
    pointPopup.show();

    // Center the map on the selected point
    appView.setCenter(feature.getGeometry().getCoordinates());
    if(appView.getZoom() < 14) {
      appView.setZoom(14);
    }
    clusterSource.refresh();
  }
}

