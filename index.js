var panos = ['Y_bfmAnDto1_f7fjHi-hrA','j-BAx0VVCuM-kz1qbVY4qg','sNuiRgd7Mf7V7BY1U7QmDw','KMd05H5DZ4XC2QTq5NaVsA','y3zvP_VbEKoHw0CTaKfHnQ','W3W7ic6z-Q_Eo8wTUSMY1g','eqdFJG60XnrqTVa4SQ_3eA','hm6jETOX9XMaqNZlh6hcWg','OyZAWt8IophbWlV6s-3V8Q','k58EcPmkQOgFiEgCUCWkGA'];
var DIV_COUNT = 3;
var panoramas = [];
var indexes = [100, 99, 98];
var divs = [];
var panoImgs = [1,2,3];
var index = 0;
var loadedIndex = 0;
var prevIndex = -1;
var g_route_open=0;
var g_fr_autocomplete, g_to_autocomplete, g_wp_autocomplete;
var wpAutocomplete = [];
var g_directionsService;
var gStreetViewService;
var locations = [];
var routeLocations = [];
var headings = [];
var gHelper;
var prevHeading = 0;
var minDistance = 4;
var speed = 1.5;
var pause = false;
var moving = false;
var gMaps, gDirectionsDisplay;
var currentMarker;
var MIN_ANGLE_FOR_ANIMATED_TURN = 15;
var readyCount = 0;
var firstPanoLoaded = false;
var zooming = false;

function initPano() {
   
  include('v3_epoly.js');
  
  for (var i = 0; i < DIV_COUNT; i++) {
    var div = $('#pano' + (i+1));
    div.bind('touchstart click', function(){
      pauseRoute();
      return false;
    });
    
    panorama = new google.maps.StreetViewPanorama(
      document.getElementById('pano' + (i+1)), {
        pano:panos[0],
        pov: {
          heading: 298.47,
          pitch: -7
        },
        zoom: 0,
        disableDefaultUI: true,
        panControl: true,
        visible: true,
        scrollwheel: false,
        clickToGo: false,
        showRoadLabels: false
    });
    panorama._div = div;
    panorama._index = i;
    
    setUpPanoImg(panorama);
   
    divs.push(div);
    panoramas.push(panorama);
  }
    
  var l_input_fr = document.getElementById('from');
  var l_input_to = document.getElementById('to');
  
  g_fr_autocomplete=0, g_to_autocomplete=0, g_wp_autocomplete=0;
  g_directionsService = new google.maps.DirectionsService();
  
  gStreetViewService = new google.maps.StreetViewService();
  
  //gHelper = new GEHelpers(null);
  
  g_fr_autocomplete = new google.maps.places.Autocomplete(l_input_fr);

  g_to_autocomplete = new google.maps.places.Autocomplete(l_input_to);
  
  var latlng = new google.maps.LatLng(45.4634195,-73.6767992);
  var myOptions = {
    zoom: 16,
    fullscreenControl: false,
    center: latlng,
    streetViewControl: false,
    mapTypeControlOptions: {
      mapTypeIds: [google.maps.MapTypeId.ROADMAP]
    },
    mapTypeId: google.maps.MapTypeId.TERRAIN
  };
  gMaps = new google.maps.Map(document.getElementById("map_canvas"),
        myOptions);
        
  var rendererOptions = {
    draggable: false,
    hideRouteList: true
  };
  gDirectionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);;
  gDirectionsDisplay.setMap(gMaps);
  
  currentMarker = new google.maps.Marker({
    map: gMaps,
    position: {lat:36.510071, lng:-4.882447400000046},
    icon: {
      url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
    }
  });
}

function addWaypoint() {
  let tableRef = document.getElementById("from_table");
  
  let newRow = tableRef.insertRow(-1);

  let newCell = newRow.insertCell(0);
  newCell.colSpan = 2;
  newCell.align = "center";

  let newInput = document.createElement("INPUT");
  newInput.setAttribute("class", "input_field");
  newInput.setAttribute("type", "text");
  newInput.setAttribute("style", "font-size: 18px; margin: 5px; width: 95%;");
  newCell.appendChild(newInput);

  wpAutocomplete.push(new google.maps.places.Autocomplete(newInput));
}

function setUpPanoImg(pano) {
  google.maps.event.addListenerOnce(pano, 'links_changed', function() {
      
    panoImgs[pano._index] = $($(pano._div).find("canvas")[0]);
  });
}

var scale = 1.0;

function stopRoute() {
  pause = true;
  document.getElementById("dialog").style.display = "block";
}

function resumeRoute() {
  pause = false;
  animateNext();
  //element.style.webkitAnimationPlayState = "running";
}

function pauseRoute() {
  pause = true;
  //element.style.webkitAnimationPlayState = "paused";
}

function animateNext() {
  
  if (pause) {
    return;
  }
  
  index++;
  if (index < locations.length) {
    
    if (index < locations.length - 1
                && (!locations[index].next_heading || !locations[index].next_dist)) {
      index--;
      setTimeout(animateNext, 1000);
      return;
    }
    
    ////console.log("index: " + index);
    for (var i = 0; i < DIV_COUNT; i++) {
      
      indexes[i] = 100 - i + (index % DIV_COUNT);
      if (indexes[i] > 100) {
        indexes[i] = indexes[i] - DIV_COUNT;
      }

      divs[i].css("z-index", indexes[i] + "");
    }
    
    var toLoadIndex = (index - 1) % DIV_COUNT;
  
    //console.log('pano ' + (index % DIV_COUNT) + ' status: ' + panoramas[index % DIV_COUNT].getStatus());
    if (panoramas[index % DIV_COUNT].getStatus() === google.maps.StreetViewStatus.OK) {
      // this handles zoom, pov, fade
      handleSwitch(panoImgs[index % DIV_COUNT], locations[index], panoramas[index % DIV_COUNT], index);
    } else {
      setTimeout(animateNext, 1000);
    }
  
    // this handles loading
    var panoToBeLoaded = (index + DIV_COUNT - 1);
    if (panoToBeLoaded < locations.length) {
      //console.log("Setting pano: " + locations[panoToBeLoaded].pano_id + ", panoToBeLoaded: " + panoToBeLoaded + ", to pano" + toLoadIndex);
      handleLoadingPano(panoramas[toLoadIndex], locations[panoToBeLoaded]);
    }
    
  } else if (loadedIndex < routeLocations.length) {
    index--;
    setTimeout(animateNext, 1000);

  } else {
    document.getElementById("dialog").style.display = "block";
  }
}

function handleLoadingPano(pano, loc) {

  //console.log("loading for pano" + pano._index + ", with " + loc.pano_id);

  google.maps.event.addListenerOnce(pano, 'pano_changed', function() {
    //console.log('pano ' + pano._index + 'changed after route');
    
    pano.setVisible(true); 
  });

  pano.setVisible(false);
  pano.setPano(loc.pano_id);
  //pano.setPosition(loc);
    
  if (loc.prev_heading && loc.next_heading
      && Math.abs(loc.prev_heading - loc.next_heading) >= MIN_ANGLE_FOR_ANIMATED_TURN) {
    pano.setPov({heading: loc.prev_heading, pitch:-7});
  } else if (loc.next_heading) {
    pano.setPov({heading: loc.next_heading, pitch:-7});
  } else if (loc.prev_heading) {
    pano.setPov({heading: loc.prev_heading, pitch:-7});
  }
  
}

function handleSwitch(panoImg, loc, pano, index) {
  var toLoadIndex = (index) % DIV_COUNT;
  ////console.log("prev head: " + loc.prev_heading + ", head: " + loc.next_heading + ", for: " + (index - 1) + ", next_dist: " + loc.next_dist);
  currentMarker.setPosition(loc);
  
  var className = 'animate';
  //console.log('animating ' + (toLoadIndex + 1) + ' for ' + 2 + ', dist: ' + loc.next_dist);
  //console.log(panoImg.get(0).toDataURL("image/png"));
  if (panoImg.hasClass(className)) {
    panoImg.removeClass(className);
  }
  
  panoImg.one("transitionend", function() {
    ////console.log("animation end: pano" + (toLoadIndex + 1));

    panoImg.removeClass(className);
    
    animateNext();    
  });

  if (!loc.prev_heading) {
    if (loc.next_heading) {
      pano.setPov({heading: loc.next_heading, pitch: -7});
    }
    panoImg.toggleClass(className);
    
     // animate to next heading if diff more than 5
  } else if (loc.next_heading
              && Math.abs(loc.prev_heading 
                  - loc.next_heading) < MIN_ANGLE_FOR_ANIMATED_TURN) {
    
    
    pano.setPov({heading: loc.next_heading, pitch: -7});    
    panoImg.toggleClass(className);
    
  } else if (!loc.next_heading) {
    
    pano.setPov({heading: loc.prev_heading, pitch: -7});
    panoImg.toggleClass(className);
    
  } else {
    
    // start animating to next_heading
    pano.setPov({heading: loc.prev_heading, pitch: -7});
    animatePov(pano, loc, function(){
      ////console.log('animatePov callback called');
      panoImg.toggleClass(className);
    });
    
  }
  //printDate();
}

function printDate() {
    var currentdate = new Date(); 
    //console.log("now: " + currentdate.getDate() + "/"
                    // + (currentdate.getMonth()+1)  + "/" 
                    // + currentdate.getFullYear() + " @ "  
                    // + currentdate.getHours() + ":"  
                    // + currentdate.getMinutes() + ":" 
                    // + currentdate.getSeconds() + "."
                    // + currentdate.getMilliseconds());
}

function getMatrixForNextDistance(loc) {

  var scale = 1.8;  
  //if (loc.next_dist > 8) {
  //  scale += loc.next_dist / 20;
  //}
  
  scale = Math.min(scale, 1.7);
  scale = Math.max(scale, 1.3);
  return 'matrix(' + scale + ',0,0,' + scale + ',0,10);';
}

function getTimeForNextDistance() {
    
  var time = 1.75;
  if (speed == 0.5) {
    time = 2;
  } else if (speed == 1.5) {
    time = 1;
  }
  
  return time;
}

function animatePov(panorama, loc, callback){
  
  var currentHeading = panorama.getPov().heading;
  //console.log("animatePov: currentHeading "+ currentHeading + ", next: " + loc.next_heading);
  if (Math.abs(loc.next_heading - currentHeading) < MIN_ANGLE_FOR_ANIMATED_TURN) {
    panorama.setPov({heading: loc.next_heading, pitch: -7});
    callback();
    return;
  }

  var factor = 1;
  if (loc.prev_heading < loc.next_heading) {
    var diff = loc.next_heading - loc.prev_heading;
    if (diff > 180) {
      // keep subracting till we reach next_heading, rollover on 0
      factor = -1;
    } else {
      factor = 1;
    }
    
  } else {
    var diff = loc.prev_heading - loc.next_heading;
    if (diff > 180) {
      // keep adding till we reach prev_heading, rollover on 360
      factor = 1;
    } else {
      factor = -1;
    }
    
  }
  
  currentHeading += factor * 5;
  if (currentHeading < 0) {
    currentHeading += 360;
  } else if (currentHeading > 360) {
    currentHeading %= 360;
  }
  //console.log("new heading: " + currentHeading);
  panorama.setPov({heading: currentHeading, pitch: -7});
  setTimeout(function() {
    animatePov(panorama, loc, callback);
  }, 100);
  
}

function startScaleDiv() {
  var toLoadIndex = 0;
  var loc = locations[toLoadIndex];
  var panoImg = panoImgs[toLoadIndex];
  handleSwitch(panoImg, loc, panoramas[toLoadIndex], 0);
}

function calculateRoute() {
  if (g_fr_autocomplete.getPlace()) {
    var org = g_fr_autocomplete.getPlace().geometry.location;
  } else {
    var org = $('#from').attr("value");
  }
  
  if (g_to_autocomplete.getPlace()) {
    var dest = g_to_autocomplete.getPlace().geometry.location;
  } else {
    var dest = $('#to').attr("value");
  }

  var waypts = [];
  for (var i = 0; i < wpAutocomplete.length; i++) {
    waypts.push({location: wpAutocomplete[i].getPlace().formatted_address });
  }
  
  //console.log("from: " + org + ", dest: " + dest);
  
  var travelMode = google.maps.DirectionsTravelMode.BICYCLING;
  // var radioValue = $("input[name='travelMode']:checked").val();
  // if (radioValue === 'DRIVING') {
    // travelMode = google.maps.DirectionsTravelMode.DRIVING;
  // }

  var request = {
    origin: org , 
    destination: dest,
    waypoints: waypts,
    avoidHighways: true,
    travelMode: travelMode
  };
  
  g_directionsService.route(request, function(response, status) {
    if (status == google.maps.DirectionsStatus.OK) {
      handleRoute(response);
      document.getElementById("dialog").style.display = "none";

    } else {
      //console.log("route not found");
      alert("route not found");
    }
  });
}

function handleRoute(response) {
  //console.log("route received");
  if (response && response.routes && response.routes[0] && response.routes[0].overview_path) {
    
    gDirectionsDisplay.setDirections(response);
    
    routeLocations = [];
    locations = [];
    
    index = 0;
    loadedIndex = 0;
    moving = false;
    firstPanoLoaded = false;

    readyCount = 0;
    
    for (var i = 0; i < DIV_COUNT; i++) {
      
      indexes[i] = 100 - i;
      divs[i].css("z-index", indexes[i] + "");
    }

    // push all points to an array
    var route = response.routes[0];
    for (var l = 0; l < route.legs.length; l++) {
      var leg = route.legs[l];
      for (var s = 0; s < leg.steps.length; s++) {
        var step = leg.steps[s];
        var line = step.polyline.points;

        var path = [];
        
        routeLocations.push(step.start_location);
        
        var geo = google.maps.geometry.encoding.decodePath(line);
        for (var g = 0; g < geo.length; g++) {
            path.push(geo[g]);
        }
        
        var polyline = new google.maps.Polyline( {path: path} );
        var tempLocations = polyline.GetPointsAtDistance(minDistance);
        for (var m = 0; m < tempLocations.length; m++) {
          routeLocations.push(tempLocations[m]);
        }
        
        routeLocations.push(step.end_location);
      }
    }

    panoramas[0].setPosition(routeLocations[0]);

    var routePolyline = new google.maps.Polyline( {path: routeLocations} );

    resolvePanoIds(routePolyline);  
    
  }
}

function startRouteMovement() {
  //console.log('start route movement, locations size: ' + locations.length);
  moving = true;
  pause = false;
  
  var zIndex = 100;
  for (var i = 0; i < DIV_COUNT; i++) {
    divs[i].css("z-index", zIndex);
    zIndex--;
  }
  
  currentMarker.setPosition(locations[0].pano_loc);
  
  index = 0;
  
  //handleLoadingPano(panoramas[0], locations[0]);
  panoramas[0].setPano(locations[0].pano_id);
  
  panoramas[0].setPov({heading: locations[0].next_heading, pitch: -7});
  
  readyCount = 0;
  for (var k = 1; k < locations.length && k < DIV_COUNT; k++) {
    let panoToLoad = panoramas[k];
    let locationToLoad = locations[k];
    addListenerToPano(panoToLoad);
    
    setTimeout(function(){
      handleLoadingPano(panoToLoad, locationToLoad);  
    }, 2000 * k);
    
  }
}

function addListenerToPano(pano) {
  google.maps.event.addListenerOnce(pano, 'links_changed', function() {
    //console.log('panorama ' + pano._index + 'changed after route');
    
    checkIfReadyToStart();      
  });
}

function checkIfReadyToStart() {
  readyCount++;
  if ((readyCount > (DIV_COUNT - 2))
      || (readyCount > (locations.length - 2))) {
    //console.log('ready to move');
    setTimeout(function() {
      startScaleDiv();
    }, 4000);
  }
}

function resolvePanoIdsByLocation(routePolyline, toFetchIndex) {
  
    var locationRequest = {location: routeLocations[toFetchIndex]};
    locationRequest.preference = google.maps.StreetViewPreference.NEAREST;
    locationRequest.radius = 10;
    locationRequest.source = google.maps.StreetViewSource.OUTDOOR;
    gStreetViewService.getPanorama(locationRequest, function(data, status) {
      if (status === google.maps.StreetViewStatus.OK) {
          
        //if (loadedIndex < routeLocations.length) {

          //if (
          handlePanoData(data, routePolyline, toFetchIndex);
          //) {
          //  return;
          //}
          
        //}
      }
    
         
    });

    if ((toFetchIndex + 1) < routeLocations.length) {
      setTimeout(function(){
        resolvePanoIdsByLocation(routePolyline, toFetchIndex + 1);
      }, 20);
    }

    resolveHeadings();
 
}

function resolvePanoIds(routePolyline) {
  
  $.get('https://maps.googleapis.com/maps/api/streetview/metadata?location=' 
          + routeLocations[loadedIndex].toUrlValue() + '&key=AIzaSyBKLnln1EJHcjN66Qci1x3FDqFS8GiRMZ4', function(data) {

    if (data["copyright"] && data["copyright"].includes("Google")) {
      
      routeLocations[loadedIndex].pano_id = data["pano_id"];
      routeLocations[loadedIndex].pano_loc = new google.maps.LatLng(
                                    data["location"]["lat"],
                                    data["location"]["lng"]
                                  );
        
      if (loadedIndex < (routeLocations.length - 1)) {
        
        if (loadedIndex == 0) {
          locations.push(routeLocations[loadedIndex]);
          markerForLocation(routeLocations[loadedIndex].pano_loc, locations.length + "");
        
        } else if ((routeLocations[loadedIndex - 1].pano_id !== routeLocations[loadedIndex].pano_id)
              && google.maps.geometry.poly.isLocationOnEdge(routeLocations[loadedIndex].pano_loc, routePolyline, 0.001)
              && google.maps.geometry.spherical.computeDistanceBetween(routeLocations[loadedIndex].pano_loc, routeLocations[loadedIndex]) < minDistance + 2) {
          locations.push(routeLocations[loadedIndex]);
          markerForLocation(routeLocations[loadedIndex].pano_loc, locations.length + "");
        }
        
      }
    }
    
    loadedIndex++;
    
    if (loadedIndex > DIV_COUNT
          || loadedIndex >= routeLocations.length) {
      resolveHeadings();        
    }

    if (loadedIndex < routeLocations.length) {
      setTimeout(function() {
        resolvePanoIds(routePolyline);
      }, 10);
    }
  });
  
}

function nextPano(routePolyline) {

  loadedIndex++;
    
  if (loadedIndex < routeLocations.length) {
    resolvePanoIdsByLocation(routePolyline); 
  }

  resolveHeadings();

}

function resolvePanoIdsByPanoID(routePolyline, panoID) {
    
    var panoRequest = {pano: panoID};
    gStreetViewService.getPanorama(panoRequest, function(data, status) {
      if (status === google.maps.StreetViewStatus.OK) {
         
        handlePanoData(data, routePolyline);
      }

      nextPano(routePolyline);
    });
 
}

function handlePanoData(data, routePolyline, toFetchIndex) {
  var distFromNextLocation = google.maps.geometry.spherical.computeDistanceBetween(routeLocations[toFetchIndex], data.location.latLng);

  routeLocations[toFetchIndex].pano_id = data.location.pano;
  routeLocations[toFetchIndex].pano_loc = data.location.latLng;
  
  if (google.maps.geometry.poly.isLocationOnEdge(routeLocations[toFetchIndex].pano_loc, routePolyline, 0.01)
        && distFromNextLocation < minDistance + 2) {

    if (toFetchIndex < routeLocations.length - 1 && locations.length > 0) {

      var distFromPrevPano = google.maps.geometry.spherical.computeDistanceBetween(data.location.latLng, 
                                                                                        locations[locations.length - 1]);

      if (distFromNextLocation < distFromPrevPano) {
        locations.push(routeLocations[toFetchIndex]);
        //markerForLocation(routeLocations[loadedIndex].pano_loc, locations.length + "");
        //markerForLocationGreen(routeLocations[loadedIndex], loadedIndex + "");
      }

    } else {
      locations.push(routeLocations[toFetchIndex]);
      //markerForLocation(routeLocations[loadedIndex].pano_loc, locations.length + "");
      //markerForLocationGreen(routeLocations[loadedIndex], loadedIndex + "");
    }
  }
}

function markerForLocation(loc, label) {
  
  let marker = new google.maps.Marker({
    map: gMaps,
    label: label,
    position: loc,
    icon: {
      url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
    }
  });    
  
}

function markerForLocationGreen(loc, label) {
  let marker = new google.maps.Marker({
    map: gMaps,
    position: loc,
    label: label,
    icon: {
      url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
    }
  });
  
}

function resolveHeadings() {
  
  var prevHeading = -1;
  for (var i = 0; i < (locations.length); i++) {
    if (prevHeading != -1) {
      locations[i].prev_heading = prevHeading;
    }
    
    if (i < locations.length - 1) {
      // var newHead = google.maps.geometry.spherical.computeHeading(locations[i].pano_loc, locations[i+1].pano_loc);
      var newHead = google.maps.geometry.spherical.computeHeading(locations[i].pano_loc, locations[i+1].pano_loc);
      
      if (newHead < 0) {
        newHead += 360;
      }
      locations[i].next_heading = newHead;
      prevHeading = newHead;
    }

    // calculate next distance
    if (i > 0 && !locations[i-1].next_dist) {
      var dist = google.maps.geometry.spherical.computeDistanceBetween(locations[i-1], locations[i]);
      locations[i-1].next_dist = dist;
    }

  }

  //console.log("resolved headings for: " + locations.length + " panos");

  if (!firstPanoLoaded && locations.length > 2) {
    firstPanoLoaded = true;
    handleLoadingPano(panoramas[0], locations[0]);
  }
  
  if (index == 0 && !moving 
      && (locations.length > (DIV_COUNT)
          || (loadedIndex > routeLocations.length))) {
    startRouteMovement();  
  }
}

function driveCtrl(option) {
  if (option == 3) {
    if (speed > 1) {
      speed--;
    }

  } else if (option == 4) {
    if (speed < 5) {
      speed++;
    }
  }
}

function include(filename) {
    var head = document.getElementsByTagName('head')[0];

    script = document.createElement('script');
    script.src = filename;
    script.type = 'text/javascript';

    head.appendChild(script);
}

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires=" + d.toGMTString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function checkCookie() {
  var panoCount = getCookie("pano_count");
  if (!panoCount) {
    panoCount = 0;
  }
  panoCount++;
  setCookie("pano_count", panoCount, 300);
}