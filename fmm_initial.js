/**
 *   FMM web application
 *   Author: Can Yang
 */
//var center = [59.3293, 18.0686];
var center = [37.5642135, 127.0016985];
var zoom_level = 12;
map = new L.Map('map', {
    center: new L.LatLng(center[0], center[1]),
    zoom: zoom_level,
    minZoom:4,
});
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

var exteriorStyle = {
    "color": "#FF8C00",
    "fill":false,
    "opacity":1.0,
    "weight":5,
    "dashArray":"10 10"
};





var boundary_layer = L.geoJson(boundary, {style: exteriorStyle});

// var optional_layers = {
//   "Network boundary": boundary_layer
// };
// L.control.layers({},optional_layers,{position:'topleft'}).addTo(map);

boundary_layer.addTo(map);

var matched_result_layer;
var current_drawing_data;

var editableLayers = new L.FeatureGroup();
map.addLayer(editableLayers);

var options = {
    position: 'topleft',
    draw: {
        polyline: {
            shapeOptions: {
                color: '#996633', //f357a1
                weight: 4
            },
            repeatMode: false,
            // Increase the icon size
            icon: new L.DivIcon({
                iconSize: new L.Point(20, 20),
                className: 'leaflet-div-icon leaflet-editing-icon my-own-icon'
            }),
        },
        polygon: false,
        circle: false, // Turns off this drawing tool
        rectangle: false,
        marker: false,
    },
    edit: false,
};
var drawControl = new L.Control.Draw(options);
map.addControl(drawControl);

// map.on('load', function() {
// 	console.log("하이");
// });

// map.on('draw:edited', function (e) {
//          var layers = e.layers;
//          layers.eachLayer(function (layer) {
//              	console.log("되는거 맞음?");
// 		console.log(layer);
//          });
// });


// 2번 방법의 전역변수
var lnglatString = "";
map.on('click', function(e) {
	console.log("map.on click");
    
    var longitude = e.latlng.lng;
    var latitude = e.latlng.lat;

    // 1번 방법 (약간 비효율 인것 같음)
    // var lnglatString = longitude + " " + latitude;
    // lnglatList.push(lnglatString);
    // console.log(lnglatList);
    // console.log(lnglatList.join(", "));
    // var LINESTRING = "LINESTRING (" + lnglatList.join(", ") + ")";
    // match_wkt(LINESTRING);
    
    
    L.marker([latitude, longitude], {
        title: 'zzz',
        opacity: 1.0,
    }).addTo(map);
    
    // 2번 방법
    lnglatString = lnglatString + longitude + " " + latitude + ", ";
    // 맨 마지막 space 제거
    lnglatString.slice(0, -1);
    // 맨 마지막 , 제거
    var innerString = lnglatString.slice(0, -1);
    
    var LINESTRING = "LINESTRING (" + innerString + ")";
    match_wkt(LINESTRING);
});

// 1번 방법의 전역변수 
var lnglatList = [];
function appToWeb(lng, lat, origLng, origLat, preLng, preLat) {
    // 전에 날라온 값
    var preLongitude = parseFloat(preLng);
    var preLatitude = parseFloat(preLat);

    // 지금 날라온 값
    var longitude = parseFloat(lng);
    var latitude = parseFloat(lat);

    // 보정안된 날 것의 값
    var origLongitude = parseFloat(origLng);
    var origLatitude = parseFloat(origLat);

    var deltaLng = longitude - preLongitude;
    var deltaLat = latitude - preLatitude;

    var currentDegree = calcAngleDegrees(deltaLng, deltaLat);
    var desiredDegree = 90 - currentDegree;

    onTapMarker.postMessage(desiredDegree);

    // 1번 방법 (약간 비효율 인것 같음)
    var lnglatString = longitude + " " + latitude;
    lnglatList.push(lnglatString);
    var LINESTRING = "LINESTRING (" + lnglatList.join(", ") + ")";
    
    // map.rotateTo(desiredDegree);
    // map.setBearing(desiredDegree);
    // map.panTo([longtitude, latitude], { duration: 1000 });

    // coords.push([longtitude, latitude]);
    // if (coords.length > 50) {
    //   coords.shift();
    // }

    L.marker([latitude, longitude], {
        title: '보정된 값',
        opacity: 0.5,
    }).addTo(map);

    L.marker([origLatitude, origLongitude], {
        title: '보정안된 값',
        opacity: 1.0,
    }).addTo(map);
    match_wkt(LINESTRING);
}


map.on(L.Draw.Event.CREATED, function(e) {
	console.log("map.on(L.Draw.Event.CREATED)");
	console.log(e.layer);
    var type = e.layerType,
        layer = e.layer;
    editableLayers.addLayer(layer);
    // Run map matching
    var traj = e.layer.toGeoJSON();
    var wkt = Terraformer.WKT.convert(traj.geometry);
    match_wkt(wkt);
});

var match_wkt = function (wkt) {
    console.log("매개변수 wkt 값은 뭐라고 들어오는 걸까?");
    console.log(wkt);
    console.log(typeof wkt);
    $.getJSON("/match_wkt", {
            "wkt": wkt
        }).done(function(data) {
            // console.log("Result fetched");
            // console.log(data);
            if (data.state==1){
                var geojson = Terraformer.WKT.parse(data.wkt);
                console.log("map match 결과물");
                console.log(geojson);
                var geojson_layer = L.geoJson(
                    geojson,
                    {
                        style: function(feature) {
                            return {
                                color: 'red',
                                "weight": 5,
                                "opacity": 0.85
                            };
                        }
                    }
                );
                editableLayers.addLayer(geojson_layer);
            } else {
                alert("Cannot match the trajectory, try another one")
            }
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            alert("Error with fetching data from server");
            console.log("error " + textStatus);
            console.log("incoming Text " + jqXHR.responseText);
        }).always(function() {
            // console.log("complete");
        });
}

map.on(L.Draw.Event.DRAWSTART, function (e) {
    console.log("L.Draw.Event.DRAWSTART");
    console.log(e);
    editableLayers.clearLayers();
});

L.Control.RemoveAll = L.Control.extend({
    options: {
        position: 'topleft',
    },
    onAdd: function(map) {
        var controlDiv = L.DomUtil.create('div', 'leaflet-control leaflet-bar leaflet-draw-toolbar');
        var controlUI = L.DomUtil.create('a', 'leaflet-draw-edit-remove', controlDiv);
        // var icon = L.DomUtil.create('span', 'fa fa-trash', controlDiv);
        // icon.setAttribute('aria-hidden',true);
        controlUI.title = 'Clean map';
        controlUI.setAttribute('href', '#');
        L.DomEvent
            .addListener(controlUI, 'click', L.DomEvent.stopPropagation)
            .addListener(controlUI, 'click', L.DomEvent.preventDefault)
            .addListener(controlUI, 'click', function() {
                if (editableLayers.getLayers().length == 0) {
                    alert("No features drawn");
                } else {
                    editableLayers.clearLayers();
                    $("#uv-div").empty();
                    //chart.destroy();
                }
            });
        return controlDiv;
    }
});
removeAllControl = new L.Control.RemoveAll();
map.addControl(removeAllControl);

var add_listeners = function() {
    $('#zoom_center').click(function() {
        map.setView(center, zoom_level);
    });
    $('#clean_map').click(function() {
        editableLayers.clearLayers();
    });
};
add_listeners();

var wkt2geojson = function(data) {
    // Generate a MultiLineString
    var multilinestring_json = Terraformer.WKT.parse(data);
    var coordinates = multilinestring_json.coordinates;
    var result = {
        "type": "FeatureCollection",
        "features": []
    };
    var arrayLength = coordinates.length;
    for (var i = 0; i < arrayLength; i++) {
        result.features.push({
            "type": "Feature",
            "properties": {},
            "geometry": {
                "type": "LineString",
                "coordinates": coordinates[i],
            }
        });
    }
    return result;
};
