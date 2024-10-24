var sidebar = new ol.control.Sidebar({ element: 'sidebar', position: 'right' });
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
function pointStyle(f) {
  var p = f.getProperties(), color = '', stroke, radius;
  if (selectedGod !== '' && (!p['主祀神祇'] || p['主祀神祇'] !== selectedGod)) {
    return emptyStyle;
  }
  switch (p['類型']) {
    case '寺廟':
    case '宗祠基金會':
    case '宗祠':
      color = '#ceaf30';
      break;
    case '教會':
      color = '#fff';
      break;
    case '基金會':
      color = '#00a6b5';
      break;
    default:
      color = '#ff0000';
      break;
  }
  if (false !== currentFeature && currentFeature.get('uuid') == p.uuid) {
    stroke = new ol.style.Stroke({
      color: '#000',
      width: 5
    });
    radius = 25;
  } else {
    stroke = new ol.style.Stroke({
      color: '#000',
      width: 2
    });
    radius = 10;
  }

  let pointStyle = new ol.style.Style({
    image: new ol.style.Circle({
      radius: radius,
      fill: new ol.style.Fill({
        color: color
      }),
      stroke: stroke
    })
  });
  return pointStyle;
}
var sidebarTitle = document.getElementById('sidebarTitle');
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

// Replace the existing vectorPoints definition with this
var vectorPoints = new ol.layer.Vector({
  source: clusterSource,
  style: function(feature) {
    var size = feature.get('features').length;
    if (size > 1) {
      return new ol.style.Style({
        image: new ol.style.Circle({
          radius: 10 + Math.min(size, 20),
          fill: new ol.style.Fill({
            color: 'rgba(255, 153, 0, 0.8)'
          }),
          stroke: new ol.style.Stroke({
            color: '#fff',
            width: 2
          })
        }),
        text: new ol.style.Text({
          text: size.toString(),
          fill: new ol.style.Fill({
            color: '#fff'
          })
        })
      });
    } else {
      return pointStyle(feature.get('features')[0]);
    }
  }
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

map.addControl(sidebar);
var pointClicked = false;
var selectedCounty = '';
var pointsPool = {};
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
            routie('point/' + p['行政區'] + '/' + p.uuid);
          }
        } else if (features.length > 1) {
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

// Modified routie functions
routie({
  'county/:countyName': function (countyName) {
    selectedCounty = countyName;
    clusterSource.getSource().clear();
    if (!pointsPool[selectedCounty]) {
      $.getJSON('https://kiang.github.io/religion/data/poi/' + selectedCounty + '.json', function (c) {
        pointsPool[selectedCounty] = c;
        clusterSource.getSource().addFeatures(pointFormat.readFeatures(pointsPool[selectedCounty]));
      });
    } else {
      clusterSource.getSource().addFeatures(pointFormat.readFeatures(pointsPool[selectedCounty]));
    }
    county.getSource().refresh();
  },

  'point/:county/:uuid': function (countyName, uuid) {
    if (!pointsPool[countyName]) {
      clusterSource.getSource().clear();
      selectedCounty = countyName;
      county.getSource().refresh();
      $.getJSON('https://kiang.github.io/religion/data/poi/' + countyName + '.json', function (c) {
        pointsPool[countyName] = c;
        clusterSource.getSource().addFeatures(pointFormat.readFeatures(pointsPool[countyName]));
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

function displayPointInfo(county, uuid) {
  var features = pointFormat.readFeatures(pointsPool[county]);
  var feature = features.find(f => f.get('uuid') === uuid);
  
  if (feature) {
    currentFeature = feature;
    
    var p = feature.getProperties();
    var lonLat = ol.proj.toLonLat(p.geometry.getCoordinates());
    var message = '<table class="table table-dark">';
    message += '<tbody>';
    for (k in p) {
      if (k != 'geometry' && k != 'uuid' && k != 'WGS84X' && k != 'WGS84Y') {
        message += '<tr><th scope="row" style="width: 100px;">' + k + '</th><td>' + p[k] + '</td></tr>';
      }
    }
    message += '<tr><td colspan="2">';
    message += '<hr /><div class="btn-group-vertical" role="group" style="width: 100%;">';
    message += '<a href="https://www.google.com/maps/dir/?api=1&destination=' + lonLat[1] + ',' + lonLat[0] + '&travelmode=driving" target="_blank" class="btn btn-info btn-lg btn-block">Google 導航</a>';
    message += '<a href="https://wego.here.com/directions/drive/mylocation/' + lonLat[1] + ',' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Here WeGo 導航</a>';
    message += '<a href="https://bing.com/maps/default.aspx?rtp=~pos.' + lonLat[1] + '_' + lonLat[0] + '" target="_blank" class="btn btn-info btn-lg btn-block">Bing 導航</a>';
    message += '</div></td></tr>';
    message += '</tbody></table>';
    sidebarTitle.innerHTML = p['名稱'];
    content.innerHTML = message;
    sidebar.open('home');

    // Center the map on the selected point
    appView.setCenter(feature.getGeometry().getCoordinates());
    if(appView.getZoom() < 14) {
      appView.setZoom(14);
    }
    clusterSource.refresh();
  }
}

