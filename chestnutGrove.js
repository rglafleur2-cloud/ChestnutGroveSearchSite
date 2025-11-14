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
    'esri/tasks/support/Query',
    'dojo/_base/array',
    'dojo/dom-class',
    'dijit/registry',
    'esri/geometry/Multipoint',
	'esri/PopupTemplate',
    'dijit/layout/BorderContainer',
    'dijit/layout/ContentPane',
    'dijit/form/Select',
    'dojo/domReady!'
  ],
  function(Map, WebMap, MapView, Legend, FeatureLayer, Layer, Graphic, Expand, LayerList, Legend,
    Home, Extent, Viewpoint, watchUtils, on, dom, parser, query, array, domClass, registry,
    Multipoint,PopupTemplate) {
    parser.parse();
    var scope = this

    scope.featureLayer = null;
	scope.featureLayer2 = null;
    scope.searchExpand = null;
    scope.searchArea = null;

    scope.map = new Map({
      basemap: 'hybrid'
    });

    // initial extent of the view and home button
    scope.initialExtent = new Extent({
      xmin: -77.381137,
      xmax: -77.377512,
      ymin: 38.982447,
      ymax: 38.986951,
      spatialReference: 4326
    });

    scope.view = new MapView({
      container: 'viewDiv',
      map: scope.map,
      extent: scope.initialExtent,
	  popup:{dockEnabled: true,
	         dockOptions:{position:'bottom-left'}
	  }
    });
    scope.searchArea = dom.byId('searchAreaDiv');
    scope.searchBtn = dom.byId('btnSearchFeature');
    scope.clearBtn = dom.byId('btnClearResults');
    scope.searchInput = dom.byId('searchInput');
    scope.searchHint = dom.byId('searchHint');
    scope.searchType = registry.byId('searchSelect');
    on(scope.searchBtn, 'click', search);
    on(scope.clearBtn, 'click', unselectFeature);
    on(scope.searchType, 'change', searchTypeChange);


    scope.popupTemplate = {
      title: "{expression/full-name}",
      content: [{
        type: "media",
        mediaInfos: [{
          type: "image",
		  value: {
            sourceURL: "{Picture}"
          }
        }]
      }, {
        type: "text",
        text: "<b>Date of Birth: </b>{Date_of_Birth:DateString(local: false, hideTime: true)}<br>" +
          "<b>Date of Death: </b>{Date_of_Death:DateString(local: false, hideTime: true)}<br>" +
          "<b>Region: </b>{Region} <b>Section: </b>{Section} <b>Plot: </b>{Plot} <b>Grave: </b>{Grave}<br>"
      }, {
        type: "fields",
        fieldInfos: [{
          fieldName: "Headstone",
          label: "Headstone"
        }, {
          fieldName: "Footstone",
          label: "Footstone"
        }, {
          fieldName: "Interred",
          label: "Interred"
        }, {
          fieldName: "Veteran",
          label: "Veteran"
        }, {
          fieldName: "Picture",
          label: "Picture"
        }]
      }],
      expressionInfos: [{
        name: "full-name",
        expression: "IIf($feature.First_Name == 'VACANT', 'Vacant', $feature.First_Name + IIf(IsEmpty($feature.Middle_Name), '', ' ' + $feature.Middle_Name) + ' ' + $feature.Last_Name)"
      }]
    };


	
    //setupView();

    scope.featureLayer = new FeatureLayer({
      url: "https://services3.arcgis.com/eyU1lVcSnKSGItET/arcgis/rest/services/Chestnut_Grove_Cemetery_Database_MAIN2345/FeatureServer/0",
      popupTemplate: scope.popupTemplate,
      outFields: ["*"],
	  minScale:4750,
	  title:"Chestnut Grove Cemetery - Interred Individuals"
	}); 
	//scope.featureLayer.popupTemplate = scope.popupTemplate;
	//scope.featureLayer.minScale=500; //Visible scale
	scope.featureLayer2 = new FeatureLayer({
      url: "https://services3.arcgis.com/eyU1lVcSnKSGItET/arcgis/rest/services/Chestnut_Grove_Cemetery_Database_MAIN23456/FeatureServer/0",
	  minScale:4750,
	  title:"Plot Boundaries"
    });
	
	scope.featureLayer3 = new FeatureLayer({
      url: "https://services3.arcgis.com/eyU1lVcSnKSGItET/arcgis/rest/services/Chestnut_Grove_Cemetery_Database_MAIN23456/FeatureServer/2",
	  minScale:4750,
	  title:"Plot Boundaries"
    });

    //map.add(scope.featureLayer2);
	//map.add(scope.featureLayer);
	map.addMany([scope.featureLayer2, scope.featureLayer3, scope.featureLayer]);
	map.allLayers.on("change", function(event) {
		if (event.added.length > 0) { setupView();}
	})
    function searchTypeChange(val){
      unselectFeature();
      scope.searchInput.value = '';
	  domClass.add(scope.searchHint, 'hidden');
      domClass.add(scope.searchInput, 'hidden');
	  domClass.add(scope.datesInput, 'hidden');
      switch(val){
        case 'veterans':        
          break;
        case 'lastName':
        case 'firstName':
          scope.searchHint.innerHTML = 'Example: Rob';
          domClass.remove(scope.searchHint, 'hidden');
          domClass.remove(scope.searchInput, 'hidden');
          break;
        case 'birthDate':
        case 'deathDate':
          scope.searchHint.innerHTML = 'Example: 05/17/1924 (mm/dd/yyyy)';
          domClass.remove(scope.searchHint, 'hidden');
          domClass.remove(scope.searchInput, 'hidden');
          break;
        case 'plotNumber':
          scope.searchHint.innerHTML = 'Example: 25';
          domClass.remove(scope.searchHint, 'hidden');
          domClass.remove(scope.searchInput, 'hidden');
          break;
		case 'dateRange':
		  scope.searchHint.innerHTML = 'Example: 05/17/1924 to 02/15/1999';
		  domClass.remove(scope.searchHint, 'hidden');
		  domClass.remove(scope.datesInput, 'hidden');
		  break;
      }
    }

    // *****************************************************
    // select Feature function
    // 1. Select an existing feature based in the search criteria
    // 2. Symbolize the feature with cyan rectangle
    // *****************************************************
    function search() {
      unselectFeature();
      var inputText = dom.byId('searchInput').value;
	  var startDateQuery = dom.byId("startDate_of_Birth").value
	  var endDateQuery = dom.byId("endDate_of_Death").value
      var selectionSymbol = {
        type: 'simple-marker', // autocasts as new SimpleMarkerSymbol()
        color: [0, 0, 0, 0],
        style: 'square',
        size: '24px',
        outline: {
          color: [0, 255, 255, 1],
          width: '3px'
        }
      }

      var query = scope.featureLayer.createQuery();
      query.outFields = ["*"];
      switch(scope.searchType.value) {
        case 'lastName':
          query.where = "Upper(Last_Name) LIKE Upper('" + inputText + "%')";
          break;
        case 'firstName':
          query.where = "Upper(First_Name) LIKE Upper('" + inputText + "%')";
          break;
        case 'birthDate':
          query.where = "Date_of_Birth = '" + inputText + " 00:00:00'";
          break;
        case 'deathDate':
          query.where = "Date_of_Death = '" + inputText + " 00:00:00'";
          break;
        case 'plotNumber':
          query.where = "Plot ='" + inputText + "'";
          break;
        case 'veterans':
          query.where = "Upper(Veteran) = 'VETERAN'";
          break;
		case 'dateRange':
		  query.where = "(Date_of_Birth >= '" + startDateQuery + "') AND (Date_of_Death <= '" + endDateQuery + "')";
		  break;
      }
      console.info(query.where);
      scope.featureLayer.queryFeatures(query).then(function(results) {
        if(results.features.length > 0) {
          scope.multiPoint = new Multipoint();
          domClass.remove(scope.clearBtn, 'hidden');
          array.map(results.features, function(feat, index) {
            scope.multiPoint.addPoint(feat.geometry);
            scope.selFeature = feat;
            scope.selFeature.symbol = selectionSymbol;
            scope.view.graphics.add(scope.selFeature);
            scope.selFeature.popupTemplate = scope.popupTemplate;
          });
          view.popup.open({
            location: results.features[0].geometry,
            features: results.features,
            updateLocationEnabled: true
          });
          scope.view.goTo(scope.multiPoint.extent.expand(1.2));
        }
      });
    }

    // *****************************************************
    // remove selection graphics
    // *****************************************************
    function unselectFeature(evt) {
      if(evt){
        evt.target.blur();
      }
      scope.view.graphics.removeAll();
      scope.view.popup.clear();
      scope.view.popup.close();
      domClass.add(scope.clearBtn, 'hidden');
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
      });
      scope.view.ui.add(homeButton, 'top-left');

      //  expand widget
      scope.searchExpand = new Expand({
        expandIconClass: 'esri-icon-search',
        expandTooltip: 'Expand Search',
        expanded: true,
        view: scope.view,
        content: dom.byId('searchAreaDiv')
      });
      scope.view.ui.add(scope.searchExpand, 'top-right');
		/*
      var layerList = new LayerList({
        view: scope.view,
        container: scope.dropdownList,
		listItemCreatedFunction: function (event) {
			const item = event.item;
			item.panel = {
			  content: "legend",
			  open: true
			};
		}
      });*/
	
	  var layerList = new LayerList({
        view: scope.view,
        container: scope.dropdownList		
      });
      var legend = new Legend({
        view: scope.view,
        container: scope.LegendList
      });
      // setTimeout(function(){
      //   document.querySelector('select[name="searchSel"]').onchange=typeChange;
      // }, 500);
    }

    function handleLayerLoadError(err) {
      console.log('Layer failed to load: ', err);
    }
  });
