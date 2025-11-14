require([
    'esri/Map',
    'esri/WebMap',
    'esri/views/MapView',
    'esri/widgets/Legend',
    'esri/layers/FeatureLayer',
    'esri/layers/Layer',
    'esri/Graphic',
    'esri/widgets/Expand',
    'esri/widgets/LayerList',
    'esri/widgets/Legend',
    'esri/widgets/Home',
    'esri/geometry/Extent',
    'esri/Viewpoint',
    'esri/core/watchUtils',
    'dojo/on',
    'dojo/dom',
    'dojo/parser',
    'dijit/layout/BorderContainer',
    'dijit/layout/ContentPane',
    'dojo/domReady!'
  ],
  function(Map, WebMap, MapView, Legend, FeatureLayer, Layer, Graphic, Expand, LayerList, Legend,
    Home, Extent, Viewpoint, watchUtils, on, dom, parser) {
    parser.parse();
    var scope = this

    scope.featureLayer = {}
    scope.editExpand = {}
    scope.editArea = {}
    // feature edit area domNodes
    scope.attributeEditing
    scope.inputLast_Name
    scope.inputFirst_Name
    scope.inputMiddle_Name
	scope.inputInterred
    scope.inputDate_of_Birth
    scope.inputDate_of_Death
    scope.inputRegion
    scope.inputSection
    scope.inputPlot
    scope.inputGrave
	scope.inputVeteran
    scope.inputHeadstone
    scope.inputFootstone
    scope.inputPicture
    scope.updateInstructionDiv

    scope.map = new Map({
      basemap: 'hybrid'
    })

    // initial extent of the view and home button
    scope.initialExtent = new Extent({
      xmin: -77.381137,
      xmax: -77.377512,
      ymin: 38.982447,
      ymax: 38.986951,
      spatialReference: 4326
    })

    scope.view = new MapView({
      container: 'viewDiv',
      map: scope.map,
      extent: scope.initialExtent
    })

    //  add an editable scope.featureLayer from portal
    Layer.fromPortalItem({
        portalItem: { // autocasts as new PortalItem()
          id: '169ca61fb09349208baaa6306997d334',
		  title:"Interred Individuals"
        }
      }).then(addLayer)
      .otherwise(handleLayerLoadError)

    setupEditing()
    setupView()

    var featureLayer = new FeatureLayer({
      url: "https://services3.arcgis.com/eyU1lVcSnKSGItET/arcgis/rest/services/Chestnut_Grove_Cemetery_Database_MAIN23456/FeatureServer/0",
	  title:"Plot Boundaries"
    });

    map.add(featureLayer);

    function addLayer(lyr) {
      scope.map.add(lyr)
      scope.featureLayer = lyr
    }

    function applyEdits(params) {
      unselectFeature()
      var promise = scope.featureLayer.applyEdits(params)
      editResultsHandler(promise)
    }

    // *****************************************************
    // applyEdits promise resolved successfully
    // query the newly created feature from the scope.featureLayer
    // set the scope.editFeature object so that it can be used
    // to update its features.
    // *****************************************************
    function editResultsHandler(promise) {
      promise
        .then(function(editsResult) {
          var extractObjectId = function(result) {
            return result.objectId
          }

          // get the objectId of the newly added feature
          if(editsResult.addFeatureResults.length > 0) {
            var adds = editsResult.addFeatureResults.map(extractObjectId)
            var newIncidentId = adds[0]

            selectFeature(newIncidentId)
          }
        })
        .otherwise(function(error) {
          console.log('===============================================')
          console.error('[ applyEdits ] FAILURE: ', error.code, error.name,
            error.message)
          console.log('error = ', error)
        })
    }

    // *****************************************************
    // listen to click event on the view
    // 1. select if there is an intersecting feature
    // 2. set the instance of scope.editFeature
    // 3. scope.editFeature is the feature to update or delete
    // *****************************************************
    scope.view.on('click', function(evt) {
      unselectFeature()
      scope.view.hitTest(evt).then(function(response) {
        if(response.results.length > 0 && response.results[0].graphic) {
          var feature = response.results[0].graphic
          selectFeature(feature.attributes[scope.featureLayer.objectIdField])

          scope.inputLast_Name.value = feature.attributes['Last_Name']
          scope.inputFirst_Name.value = feature.attributes['First_Name']
          scope.inputMiddle_Name.value = feature.attributes['Middle_Name']
		  scope.inputInterred.value = feature.attributes['Interred']
          if(feature.attributes['Date_of_Birth']){
            scope.inputDate_of_Birth.value = new Date(feature.attributes['Date_of_Birth']).toISOString().substr(0, 10);
          }
          if(feature.attributes['Date_of_Death']){
            scope.inputDate_of_Death.value = new Date(feature.attributes['Date_of_Death']).toISOString().substr(0, 10);
          }
          scope.inputRegion.value = feature.attributes['Region']
          scope.inputSection.value = feature.attributes['Section']
          scope.inputPlot.value = feature.attributes['Plot']
          scope.inputGrave.value = feature.attributes['Grave']
		  scope.inputVeteran.value = feature.attributes['Veteran']
          scope.inputHeadstone.value = feature.attributes['Headstone']
          scope.inputFootstone.value = feature.attributes['Footstone']
          scope.inputPicture.value = feature.attributes['Picture']
          scope.attributeEditing.style.display = 'block'
          scope.updateInstructionDiv.style.display = 'none'
        }
      })
    })

    // *****************************************************
    // select Feature function
    // 1. Select the newly created feature on the view
    // 2. or select an existing feature when user click on it
    // 3. Symbolize the feature with cyan rectangle
    // *****************************************************
    function selectFeature(objectId) {
      // symbol for the selected feature on the view
      var selectionSymbol = {
        type: 'simple-marker', // autocasts as new SimpleMarkerSymbol()
        color: [0, 0, 0, 0],
        style: 'square',
        size: '40px',
        outline: {
          color: [0, 255, 255, 1],
          width: '3px'
        }
      }
      var query = scope.featureLayer.createQuery()
      query.where = scope.featureLayer.objectIdField + ' = ' + objectId

      scope.featureLayer.queryFeatures(query).then(function(results) {
        if(results.features.length > 0) {
          scope.editFeature = results.features[0]
          scope.editFeature.symbol = selectionSymbol
          scope.view.graphics.add(scope.editFeature)
        }
      })
    }

    // *****************************************************
    // hide attributes update and delete part when necessary
    // *****************************************************
    function unselectFeature() {
      scope.attributeEditing.style.display = 'none'
      scope.updateInstructionDiv.style.display = 'block'

      scope.inputLast_Name.value = null
      scope.inputFirst_Name.value = null
      scope.inputMiddle_Name.value = null
	  scope.inputInterred.value = null
      scope.inputDate_of_Birth.value = null
      scope.inputDate_of_Death.value = null
      scope.inputRegion.value = null
      scope.inputSection.value = null
      scope.inputPlot.value = null
      scope.inputGrave.value = null
	  scope.inputVeteran.value = null
      scope.inputHeadstone.value = null
      scope.inputFootstone.value = null
      scope.inputPicture.value = null
      scope.view.graphics.removeAll()
    }

    // *****************************************************
    // add homeButton and expand widgets to UI
    // *****************************************************
    function setupView() {
      // set home buttone view point to initial extent
      var homeButton = new Home({
        view: scope.view,
        viewpoint: new Viewpoint({
          targetGeometry: scope.initialExtent
        })
      })
      scope.view.ui.add(homeButton, 'top-left')

      //  expand widget
      scope.editExpand = new Expand({
        expandIconClass: 'esri-icon-edit',
        expandTooltip: 'Expand Edit',
        expanded: true,
        view: scope.view,
        content: scope.editArea
      })
      scope.view.ui.add(scope.editExpand, 'top-right')

      var layerList = new LayerList({
        view: scope.view,
        container: scope.dropdownList
      });

      var legend = new Legend({
        view: scope.view,
        container: scope.LegendList
      });
    }

    // *****************************************************
    // set up for editing
    // *****************************************************
    function setupEditing() {
      // input boxes for the attribute editing
      scope.editArea = dom.byId('editArea')
      scope.updateInstructionDiv = dom.byId('updateInstructionDiv')
      scope.attributeEditing = dom.byId('featureUpdateDiv')
      scope.inputLast_Name = dom.byId('inputLast_Name')
      scope.inputFirst_Name = dom.byId('inputFirst_Name')
      scope.inputMiddle_Name = dom.byId('inputMiddle_Name')
	  scope.inputInterred = dom.byId('inputInterred')
      scope.inputDate_of_Birth = dom.byId('inputDate_of_Birth')
      scope.inputDate_of_Death = dom.byId('inputDate_of_Death')
      scope.inputRegion = dom.byId('inputRegion')
      scope.inputSection = dom.byId('inputSection')
      scope.inputPlot = dom.byId('inputPlot')
      scope.inputGrave = dom.byId('inputGrave')
	  scope.inputVeteran = dom.byId('inputVeteran')
      scope.inputHeadstone = dom.byId('inputHeadstone')
      scope.inputFootstone = dom.byId('inputFootstone')
      scope.inputPicture = dom.byId('inputPicture')
      scope.dropdownList = dom.byId('dropdownList')
      scope.LegendList = dom.byId('LegendList')

      // *****************************************************
      // btnUpdate click event
      // update attributes of selected feature
      // *****************************************************
      on(dom.byId('btnUpdate'), 'click', function(evt) {
        if(scope.editFeature) {
          scope.editFeature.attributes['Last_Name'] = scope.inputLast_Name.value
          scope.editFeature.attributes['First_Name'] = scope.inputFirst_Name.value
          scope.editFeature.attributes['Middle_Name'] = scope.inputMiddle_Name.value
		  scope.editFeature.attributes['Interred'] = scope.inputInterred.value
          scope.editFeature.attributes['Date_of_Birth'] = new Date(scope.inputDate_of_Birth.value).getTime()
          scope.editFeature.attributes['Date_of_Death'] = new Date(scope.inputDate_of_Death.value).getTime()
          scope.editFeature.attributes['Region'] = scope.inputRegion.value
          scope.editFeature.attributes['Section'] = scope.inputSection.value
          scope.editFeature.attributes['Plot'] = scope.inputPlot.value
          scope.editFeature.attributes['Grave'] = scope.inputGrave.value
		  scope.editFeature.attributes['Veteran'] = scope.inputVeteran.value
          scope.editFeature.attributes['Headstone'] = scope.inputHeadstone.value
          scope.editFeature.attributes['Footstone'] = scope.inputFootstone.value
          scope.editFeature.attributes['Picture'] = scope.inputPicture.value
          var edits = {
            updateFeatures: [scope.editFeature]
          }
          applyEdits(edits)
        }
      })

      // *****************************************************
      // btnAddFeature click event
      // create a new feature at the click location
      // *****************************************************
      on(dom.byId('btnAddFeature'), 'click', function() {
        unselectFeature()
        on.once(scope.view, 'click', function(event) {
          event.stopPropagation()

          if(event.mapPoint) {
            var point = event.mapPoint.clone()
            point.z = undefined
            point.hasZ = false

            var newRecord = new Graphic({
              geometry: point,
              attributes: {}
            })

            var edits = {
              addFeatures: [newRecord]
            }
            applyEdits(edits)

            // ui changes in response to creating a new feature
            // display feature update and delete portion of the edit area
            scope.attributeEditing.style.display = 'block'
            scope.updateInstructionDiv.style.display = 'none'
            dom.byId('viewDiv').style.cursor = 'auto'
          } else {
            console.error('event.mapPoint is not defined')
          }
        })

        // change the view's mouse cursor once user selects
        // a new incident type to create
        dom.byId('viewDiv').style.cursor = 'crosshair'
        scope.editArea.style.cursor = 'auto'
      })

      // *****************************************************
      // delete button click event. ApplyEdits is called
      // with the selected feature to be deleted
      // *****************************************************
      on(dom.byId('btnDelete'), 'click', function() {
        var edits = {
          deleteFeatures: [scope.editFeature]
        }
        applyEdits(edits)
      })

      // *****************************************************
      // watch for view LOD change. Display Feature editing
      // area when view.zoom level is 14 or higher
      // otherwise hide the feature editing area
      // *****************************************************
      scope.view.then(function() {
        watchUtils.whenTrue(scope.view, 'stationary', function() {
          if(scope.editExpand) {
            if(scope.view.zoom <= 13) {
              scope.editExpand.domNode.style.display = 'none'
            } else {
              scope.editExpand.domNode.style.display = 'block'
            }
          }
        })
      })
    }

    function handleLayerLoadError(err) {
      console.log('Layer failed to load: ', err)
    }
  })
