/* global W */
/* global Promise */
/* global OL */
/* global I18n */
/* global unsafeWindow */
/* global GM_info */
/* global WazeWrap */

// // ==UserScript==
// @name         WME FC Layer
// @namespace    https://greasyfork.org/users/45389
// @version      2019.01.29.001
// @description  Adds a Functional Class layer for states that publish ArcGIS FC data.
// @author       MapOMatic
// @include      /^https:\/\/(www|beta)\.waze\.com\/(?!user\/)(.{2,6}\/)?editor\/?.*$/
// @license      GNU GPLv3
// @contributionURL https://github.com/WazeDev/Thank-The-Authors
// @require      https://greasyfork.org/scripts/39002-bluebird/code/Bluebird.js?version=255146
// @require      https://greasyfork.org/scripts/24851-wazewrap/code/WazeWrap.js
// @grant        GM_xmlhttpRequest
// @connect      md.gov
// @connect      in.gov
// @connect      arcgis.com
// @connect      ncdot.gov
// @connect      state.mi.us
// @connect      dc.gov
// @connect      la.gov
// @connect      nd.gov
// @connect      pa.gov
// @connect      oh.us
// @connect      iowadot.gov
// @connect      ksdot.org
// @connect      ky.gov
// @connect      shelbycountytn.gov
// @connect      illinois.gov
// @connect      ny.gov
// @connect      utah.gov
// @connect      idaho.gov
// @connect      wv.gov
// @connect      ga.gov
// @connect      uga.edu
// @connect      nevadadot.com
// ==/UserScript==

(function() {
    'use strict';

    var _settingsStoreName = 'wme_fc_layer';
    var _alertUpdate = false;
    var _debugLevel = 0;
    var _scriptVersion = GM_info.script.version;
    var _scriptVersionChanges = [
        GM_info.script.name,
        'v' + _scriptVersion,
        '',
        'What\'s New',
        '------------------------------',
        ''  // Add important stuff here when _alertUpdate = true.
    ].join('\n');
    var _mapLayer = null;
    var _isAM = false;
    var _uid;
    var _settings = {};
    var _r;
    var _mapLayerZIndex = 334;
    var _betaIDs = [103400892];
    var _statesHash = {
        'Alabama':'AL','Alaska':'AK','American Samoa':'AS','Arizona':'AZ','Arkansas':'AR','California':'CA','Colorado':'CO','Connecticut':'CT','Delaware':'DE','District of Columbia':'DC',
        'Federated States Of Micronesia':'FM','Florida':'FL','Georgia':'GA','Guam':'GU','Hawaii':'HI','Idaho':'ID','Illinois':'IL','Indiana':'IN','Iowa':'IA','Kansas':'KS',
        'Kentucky':'KY','Louisiana':'LA','Maine':'ME','Marshall Islands':'MH','Maryland':'MD','Massachusetts':'MA','Michigan':'MI','Minnesota':'MN','Mississippi':'MS','Missouri':'MO',
        'Montana':'MT','Nebraska':'NE','Nevada':'NV','New Hampshire':'NH','New Jersey':'NJ','New Mexico':'NM','New York':'NY','North Carolina':'NC','North Dakota':'ND',
        'Northern Mariana Islands':'MP','Ohio':'OH','Oklahoma':'OK','Oregon':'OR','Palau':'PW','Pennsylvania':'PA','Puerto Rico':'PR','Rhode Island':'RI','South Carolina':'SC',
        'South Dakota':'SD','Tennessee':'TN','Texas':'TX','Utah':'UT','Vermont':'VT','Virgin Islands':'VI','Virginia':'VA','Washington':'WA','West Virginia':'WV','Wisconsin':'WI','Wyoming':'WY'
    };

    function reverseStatesHash(stateAbbr) {
        for (var stateName in _statesHash) {
            if (_statesHash[stateName] === stateAbbr) return stateName;
        }
    }
    var _stateSettings = {
        global: {
            roadTypes: ['St','PS','PS2','mH','MH','Ew','Rmp','Fw'], // Ew = Expressway.  For FC's that make it uncertain if they should be MH or FW.
            getFeatureRoadType: function(feature, layer) {
                var fc = feature.attributes[layer.fcPropName];
                return this.getRoadTypeFromFC(fc, layer);
            },
            getRoadTypeFromFC: function(fc, layer) {
                for (var roadType in layer.roadTypeMap) {
                    if (layer.roadTypeMap[roadType].indexOf(fc) !== -1) {
                        return roadType;
                    }
                }
                return null;
            },
            isPermitted: function(stateAbbr) {if(_betaIDs.indexOf(_uid)!==-1)return true;var state=_stateSettings[stateAbbr];if(state.isPermitted){return state.isPermitted();}else{return(_r>=2&&_isAM)||(_r>=3);}},
            getMapLayer: function(stateAbbr, layerID) {
                var returnValue;
                _stateSettings[stateAbbr].fcMapLayers.forEach(function(layer) {
                    if (layer.layerID === layerID) {
                        returnValue = layer;
                    }
                });
                return returnValue;
            }
        },
        DC: {
            baseUrl: 'https://maps2.dcgis.dc.gov/dcgis/rest/services/DCGIS_DATA/Transportation_WebMercator/MapServer/',
            supportsPagination: false,
            defaultColors: {Fw:'#ff00c5',Ew:'#149ece',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [[],[],[],[],[],[],[],[],[],[],[]] },
            fetchAllFC: false,
            fcMapLayers: [
                { layerID:48, fcPropName:'FUNCTIONALCLASS', idPropName:'OBJECTID', outFields:['OBJECTID', 'FUNCTIONALCLASS'], maxRecordCount:1000, supportsPagination:false,
                 roadTypeMap:{Fw:['Interstate'],Ew:['Other Freeway and Expressway'],MH:['Principal Arterial'],mH:['Minor Arterial'],PS:['Collector']} }
            ],
            getFeatureRoadType: function(feature, layer) {
                if (layer.getFeatureRoadType) {
                    return layer.getFeatureRoadType(feature);
                } else {
                    return _stateSettings.global.getFeatureRoadType(feature, layer);
                }
            },
            getWhereClause: function(context) {
                return null;
            }
        },
        FL: {
            baseUrl: 'https://services1.arcgis.com/O1JpcwDW8sjYuddV/ArcGIS/rest/services/Functional_Classification_TDA/FeatureServer/',
            supportsPagination: false,
            defaultColors: {Fw:'#ff00c5',Ew:'#149ece',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [[],[],[],[],[],[],[],[],[],[],[]] },
            fetchAllFC: false,
            fcMapLayers: [
                { layerID:0, fcPropName:'FUNCLASS', idPropName:'OBJECTID', outFields:['OBJECTID', 'FUNCLASS'], maxRecordCount:1000, supportsPagination:false,
                 roadTypeMap:{Fw:['01','11'],Ew:['02','12'],MH:['04','14'],mH:['06','16'],PS:['07','08','17','18']} }
            ],
            getFeatureRoadType: function(feature, layer) {
                if (layer.getFeatureRoadType) {
                    return layer.getFeatureRoadType(feature);
                } else {
                    return _stateSettings.global.getFeatureRoadType(feature, layer);
                }
            },
            getWhereClause: function(context) {
                return null;
            }
        },
        GA: {
            baseUrl: 'https://maps.itos.uga.edu/arcgis/rest/services/GDOT/GDOT_FunctionalClass/mapserver/',
            supportsPagination: true,
            defaultColors: {Fw:'#ff00c5',Ew:'#149ece',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [[],[],[],[],[],[],[],[],[],[],[]] },
            fetchAllFC: false,
            fcMapLayers: [
                { layerID:0, fcPropName:'FUNCTIONAL_CLASS', idPropName:'OBJECTID', outFields:['OBJECTID', 'FUNCTIONAL_CLASS', 'SYSTEM_CODE'], maxRecordCount:1000, supportsPagination:true, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6]} },
                { layerID:1, fcPropName:'FUNCTIONAL_CLASS', idPropName:'OBJECTID', outFields:['OBJECTID', 'FUNCTIONAL_CLASS', 'SYSTEM_CODE'], maxRecordCount:1000, supportsPagination:true, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6]} },
                { layerID:2, fcPropName:'FUNCTIONAL_CLASS', idPropName:'OBJECTID', outFields:['OBJECTID', 'FUNCTIONAL_CLASS', 'SYSTEM_CODE'], maxRecordCount:1000, supportsPagination:true, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6]} },
                { layerID:3, fcPropName:'FUNCTIONAL_CLASS', idPropName:'OBJECTID', outFields:['OBJECTID', 'FUNCTIONAL_CLASS', 'SYSTEM_CODE'], maxRecordCount:1000, supportsPagination:true, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6]} },
                { layerID:4, fcPropName:'FUNCTIONAL_CLASS', idPropName:'OBJECTID', outFields:['OBJECTID', 'FUNCTIONAL_CLASS', 'SYSTEM_CODE'], maxRecordCount:1000, supportsPagination:true, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6]} },
                { layerID:5, fcPropName:'FUNCTIONAL_CLASS', idPropName:'OBJECTID', outFields:['OBJECTID', 'FUNCTIONAL_CLASS', 'SYSTEM_CODE'], maxRecordCount:1000, supportsPagination:true, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6]} },
                { layerID:6, fcPropName:'FUNCTIONAL_CLASS', idPropName:'OBJECTID', outFields:['OBJECTID', 'FUNCTIONAL_CLASS', 'SYSTEM_CODE'], maxRecordCount:1000, supportsPagination:true, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6]} }
            ],
            getFeatureRoadType: function(feature, layer) {
                if (layer.getFeatureRoadType) {
                    return layer.getFeatureRoadType(feature);
                } else {
                    var attr = feature.attributes;
                    var fc = attr.FUNCTIONAL_CLASS;
                    if (attr.SYSTEM_CODE === '1' && fc > 4) {
                        return _stateSettings.global.getRoadTypeFromFC(4, layer);
                    } else {
                        return _stateSettings.global.getFeatureRoadType(feature, layer);
                    }
                }
            },
            getWhereClause: function(context) {
                return null;
            }
        },
        ID: {
            baseUrl: 'https://gis.itd.idaho.gov/arcgisprod/rest/services/IPLAN/Functional_Classification/MapServer/',
            supportsPagination: false,
            defaultColors: {Fw:'#ff00c5',Ew:'#149ece',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [[],[],[],[],[],[],[],[],[],[],[]] },
            fetchAllFC: true,
            fcMapLayers: [
                { layerID:0, fcPropName:'FCCODE', idPropName:'OBJECTID', outFields:['OBJECTID', 'FCCODE'], maxRecordCount:1000, supportsPagination:false, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6]} },
                { layerID:1, fcPropName:'FCCODE', idPropName:'OBJECTID', outFields:['OBJECTID', 'FCCODE'], maxRecordCount:1000, supportsPagination:false, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6]} },
                { layerID:2, fcPropName:'FCCODE', idPropName:'OBJECTID', outFields:['OBJECTID', 'FCCODE'], maxRecordCount:1000, supportsPagination:false, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6]} },
                { layerID:3, fcPropName:'FCCODE', idPropName:'OBJECTID', outFields:['OBJECTID', 'FCCODE'], maxRecordCount:1000, supportsPagination:false, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6]} },
                { layerID:4, fcPropName:'FCCODE', idPropName:'OBJECTID', outFields:['OBJECTID', 'FCCODE'], maxRecordCount:1000, supportsPagination:false, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6]} },
                { layerID:5, fcPropName:'FCCODE', idPropName:'OBJECTID', outFields:['OBJECTID', 'FCCODE'], maxRecordCount:1000, supportsPagination:false, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6]} }
            ],
            getFeatureRoadType: function(feature, layer) {
                if (layer.getFeatureRoadType) {
                    return layer.getFeatureRoadType(feature);
                } else {
                    return _stateSettings.global.getFeatureRoadType(feature, layer);
                }
            },
            getWhereClause: function(context) {
                return null;
            }
        },
        IL: {
            baseUrl: 'https://ags10s1.dot.illinois.gov/ArcGIS/rest/services/AdministrativeData/Roads/MapServer/',
            supportsPagination: false,
            defaultColors: {Fw:'#ff00c5',Ew:'#ff00c5',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee',CH:'#ff5e0e'},
            zoomSettings: { maxOffset:[30,15,8,4,2,1,1,1,1,1] },
            fcMapLayers: [
                { layerID:0, idPropName:'OBJECTID', fcPropName:'FC', outFields:['FC','OBJECTID','MARKED_RT','MARKED_RT2','MARKED_RT3','MARKED_RT4','CH'],
                 roadTypeMap:{Fw:['1'],Ew:['2'],MH:['3'],mH:['4'],PS:['5','6'],St:['7'],CH:['8']}, maxRecordCount:1000, supportsPagination:false },
                { layerID:1, idPropName:'OBJECTID', fcPropName:'FC', outFields:['FC','OBJECTID','MARKED_RT','MARKED_RT2','MARKED_RT3','MARKED_RT4','CH'],
                 roadTypeMap:{Fw:['1'],Ew:['2'],MH:['3'],mH:['4'],PS:['5','6'],St:['7'],CH:['8']}, maxRecordCount:1000, supportsPagination:false },
                { layerID:2, idPropName:'OBJECTID', fcPropName:'FC', outFields:['FC','OBJECTID','MARKED_RT','MARKED_RT2','MARKED_RT3','MARKED_RT4','CH'],
                 roadTypeMap:{Fw:['1'],Ew:['2'],MH:['3'],mH:['4'],PS:['5','6'],St:['7'],CH:['8']}, maxRecordCount:1000, supportsPagination:false },
                { layerID:3, idPropName:'OBJECTID', fcPropName:'FC', outFields:['FC','OBJECTID','MARKED_RT','MARKED_RT2','MARKED_RT3','MARKED_RT4','CH'],
                 roadTypeMap:{Fw:['1'],Ew:['2'],MH:['3'],mH:['4'],PS:['5','6'],St:['7'],CH:['8']}, maxRecordCount:1000, supportsPagination:false },
                { layerID:4, idPropName:'OBJECTID', fcPropName:'FC', outFields:['FC','OBJECTID','MARKED_RT','MARKED_RT2','MARKED_RT3','MARKED_RT4','CH'],
                 roadTypeMap:{Fw:['1'],Ew:['2'],MH:['3'],mH:['4'],PS:['5','6'],St:['7'],CH:['8']}, maxRecordCount:1000, supportsPagination:false },
                { layerID:5, idPropName:'OBJECTID', fcPropName:'FC', outFields:['FC','OBJECTID','MARKED_RT','MARKED_RT2','MARKED_RT3','MARKED_RT4','CH'],
                 roadTypeMap:{Fw:['1'],Ew:['2'],MH:['3'],mH:['4'],PS:['5','6'],St:['7'],CH:['8']}, maxRecordCount:1000, supportsPagination:false },
                { layerID:6, idPropName:'OBJECTID', fcPropName:'FC', outFields:['FC','OBJECTID','MARKED_RT','MARKED_RT2','MARKED_RT3','MARKED_RT4','CH'],
                 roadTypeMap:{Fw:['1'],Ew:['2'],MH:['3'],mH:['4'],PS:['5','6'],St:['7'],CH:['8']}, maxRecordCount:1000, supportsPagination:false },
                { layerID:7, idPropName:'OBJECTID', fcPropName:'FC', outFields:['FC','OBJECTID','MARKED_RT','MARKED_RT2','MARKED_RT3','MARKED_RT4','CH'],
                 roadTypeMap:{Fw:['1'],Ew:['2'],MH:['3'],mH:['4'],PS:['5','6'],St:['7'],CH:['8']}, maxRecordCount:1000, supportsPagination:false },
                { layerID:8, idPropName:'OBJECTID', fcPropName:'FC', outFields:['FC','OBJECTID','MARKED_RT','MARKED_RT2','MARKED_RT3','MARKED_RT4','CH'],
                 roadTypeMap:{Fw:['1'],Ew:['2'],MH:['3'],mH:['4'],PS:['5','6'],St:['7'],CH:['8']}, maxRecordCount:1000, supportsPagination:false }
            ],
            isPermitted: function() { return _r >= 3; },
            getWhereClause: function(context) {
                if(context.mapContext.zoom < 4) {
                    return "FC<>'7' OR (FC='7' AND CH<>'0000')";
                } else {
                    return null;
                }
            },
            getFeatureRoadType: function(feature, layer) {
                var attr = feature.attributes;
                var isUS = false;
                var isState = false;
                var isCounty = attr.CH !== '0000';
                [attr.MARKED_RT, attr.MARKED_RT2, attr.MARKED_RT3, attr.MARKED_RT4].forEach(function(rt) {
                    if (!isUS) {
                        isUS = /U\d+/.test(rt);
                        if (!isUS && !isState) {
                            isState = /S\d+/.test(rt);
                        }
                    }
                });
                var fc = attr.FC;
                fc = (fc > 3 && isUS) ? '3' : (fc > 4 && isState) ? '4' : (fc === '7' && isCounty) ? '8' : fc;
                return _stateSettings.global.getRoadTypeFromFC(fc, layer);
            }
        },
        IN: {
            baseUrl: 'https://gis.in.gov/arcgis/rest/services/DOT/INDOT_LTAP/FeatureServer/',
            supportsPagination: false,
            overrideUrl: '1Sbwc7e6BfHpZWSTfU3_1otXGSxHrdDYcbn7fOf1VjpA',
            defaultColors: {Fw:'#ff00c5',Ew:'#149ece',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [['St'],['St'],['St'],['St'],[],[],[],[],[],[],[]], hideRoadTypes: [['St'],['St'],['St'],['St'],[],[],[],[],[],[],[]] },
            fcMapLayers: [
                { layerID:10, idPropName:'OBJECTID', fcPropName:'FUNCTIONAL_CLASS', outFields:['FUNCTIONAL_CLASS','OBJECTID','TO_DATE'],
                 roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]}, maxRecordCount:100000, supportsPagination:false }
            ],
            isPermitted: function() { return true; },
            getWhereClauses: function(context) {
            },
            getWhereClause: function(context) {
                var whereParts = [];
                if(context.mapContext.zoom < 4) {
                    whereParts.push(context.layer.fcPropName + '<>7');
                }
                whereParts.push('TO_DATE IS NULL');
                return whereParts.join(' AND ');
            },
            getFeatureRoadType: function(feature, layer) {
                if (layer.getFeatureRoadType) {
                    return layer.getFeatureRoadType(feature);
                } else {
                    return _stateSettings.global.getFeatureRoadType(feature, layer);
                }
            }
        },
        IA: {
            baseUrl: 'https://gis.iowadot.gov/public/rest/services/RAMS/Road_Network/MapServer/',
            supportsPagination: false,
            defaultColors: {Fw:'#ff00c5',Ew:'#149ece',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee',PSGr:'#8f5f00',StGr:'#837870'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [[],[],[],[],[],[],[],[],[],[],[]] },
            fetchAllFC: false,
            fcMapLayers: [
                { layerID:0, fcPropName:'FED_FUNCTIONAL_CLASS', idPropName:'OBJECTID', outFields:['OBJECTID', 'FED_FUNCTIONAL_CLASS', 'STATE_ROUTE_NAME_1', 'ACCESS_CONTROL', 'SURFACE_TYPE'], maxRecordCount:1000, supportsPagination:false,
                 roadTypeMap:{Fw:["1"],MH:["2","3"],mH:["4"],PS:["5","6"],St:["7"]} }
            ],
            getWhereClause: function(context) {
                var theclause = "FACILITY_TYPE<>'7'";
                if(context.mapContext.zoom < 4) { theclause += " AND " + context.layer.fcPropName + "<>'7'"; }
                return theclause;
            },
            getFeatureRoadType: function(feature, layer) {
                var attr = feature.attributes;
                var fcName = layer.fcPropName;
                var fc = parseInt(attr[fcName]);
                var isFw = attr.ACCESS_CONTROL === 1;
                var isUS = RegExp('STATE OF IOWA, US').test(attr.STATE_ROUTE_NAME_1);
                var isState = RegExp('STATE OF IOWA, IA').test(attr.STATE_ROUTE_NAME_1);
                fc = isFw ? 1 : ((fc > 3 && isUS) ? Math.min(fc,3) : ((fc > 4 && isState) ? Math.min(fc,4) : fc));
                var roadType = fc === 1 ? 'Fw' : (fc === 2 ? 'MH' : (fc === 3 ? 'MH' : (fc === 4 ? 'mH' : (fc <= 6 ? 'PS' : 'St'))));
                if (fc > 4 && attr.SURFACE_TYPE === 20) { roadType = roadType === 'PS' ? 'PSGr' : 'StGr' ; }
                return roadType;
            }
        },
        KS: {
            baseUrl: 'http://wfs.ksdot.org/arcgis_web_adaptor/rest/services/Transportation/',
            supportsPagination: false,
            defaultColors: {Fw:'#ff00c5',Ew:'#149ece',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1] },
            fcMapLayers: [
                { layerID:0, layerPath:'Non_State_System/MapServer/', idPropName:'ID2', fcPropName:'FUNCLASS', outFields:['FUNCLASS','ID2','ROUTE_ID'],
                  roadTypeMap:{Fw:[1],MH:[2,3],mH:[4],PS:[5,6],St:[7]}, maxRecordCount:1000, supportsPagination:false },
                { layerID:1, layerPath:'National_Highway_System/MapServer/', idPropName:'OBJECTID', fcPropName:'FUN_CLASS_CD', outFields:['FUN_CLASS_CD','OBJECTID', 'PREFIX', 'ACCESS_CONTROL'],
                  roadTypeMap:{Fw:["1"],MH:["2","3"],mH:["4"],PS:["5","6"],St:["7"]}, maxRecordCount:1000, supportsPagination:false },
                { layerID:0, layerPath:'State_System/MapServer/', idPropName:'OBJECTID', fcPropName:'FUN_CLASS_CD', outFields:['FUN_CLASS_CD','OBJECTID', 'PREFIX', 'ACCESS_CONTROL'],
                  roadTypeMap:{Fw:["1"],MH:["2","3"],mH:["4"],PS:["5","6"],St:["7"]}, maxRecordCount:1000, supportsPagination:false }
            ],
            getWhereClause: function(context) {
                if(context.mapContext.zoom < 4) {
                    return context.layer.fcPropName + "<>'7'";
                } else {
                    return null;
                }
            },
            getFeatureRoadType: function(feature, layer) {
                var attr = feature.attributes;
                var fcName = layer.fcPropName;
                var fc = parseInt(attr[fcName]);
                var roadPrefix = attr.PREFIX;
                var isLocal = attr[fcName] === 'FUNCLASS';
                var isFw = false
                var isUS = false;
                var isState = false;
                var isBusiness = false;
                if (!isLocal) {
                    isFw = attr.ACCESS_CONTROL === '1';
                    isUS = roadPrefix === 'U';
                    isState = roadPrefix === 'K';
                }
                if (fc > 4 && isState) {
                    fc = (isBusiness ? Math.min(fc,5) : 4);
                } else if (fc > 3 && isUS) {
                    fc = (isBusiness ? Math.min(fc, 4) : 3 );
                } else if (isFw) {
                    fc = (isBusiness ? Math.min(fc, 3) : 1 );
                }
                var roadType = fc === 1 ? 'Fw' : (fc === 2 ? 'MH' : (fc === 3 ? 'MH' : (fc === 4 ? 'mH' : (fc <= 6 ? 'PS' : 'St'))));
                return roadType;
            },
        },
        KY: {
            baseUrl: 'https://maps.kytc.ky.gov/arcgis/rest/services/BaseMap/System/MapServer/',
            supportsPagination: false,
            defaultColors: {Fw:'#ff00c5',Ew:'#ff00c5',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1] },
            fcMapLayers: [
                { layerID:0, idPropName:'OBJECTID', fcPropName:'FC', outFields:['FC','OBJECTID','RT_PREFIX', 'RT_SUFFIX'],
                 roadTypeMap:{Fw:['1'],Ew:['2'],MH:['3'],mH:['4'],PS:['5','6'],St:['7']}, maxRecordCount:1000, supportsPagination:false }
            ],
            isPermitted: function() { return true; },
            getWhereClause: function(context) {
                if(context.mapContext.zoom < 4) {
                    return context.layer.fcPropName + "<>'7'";
                } else {
                    return null;
                }
            },
            getFeatureRoadType: function(feature, layer) {
                if (feature.attributes.RT_PREFIX === 'US') {
                    var suffix = feature.attributes.RT_SUFFIX;
                    var type = 'MH';
                    if (suffix && suffix.indexOf('X') > -1) type = 'mH';
                    return type;
                } else {
                    return _stateSettings.global.getFeatureRoadType(feature, layer);
                }
            }
        },
        LA: {
            baseUrl: 'https://giswebnew.dotd.la.gov/arcgis/rest/services/Transportation/LA_RoadwayFunctionalClassification/FeatureServer/',
            supportsPagination: false,
            defaultColors: {Fw:'#4094ff',Ew:'#ffbf40',MH:'#fb674d',mH:'#6abe40',PS1:'#bf40ec',PS2:'#ffff40',St:'#a2a2a2'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [['St'],['St'],['St'],['St'],[],[],[],[],[],[],[]] },
            fcMapLayers: [
                { layerID:0, fcPropName:'FunctionalSystem', idPropName:'OBJECTID', outFields:['OBJECTID','FunctionalSystem'], roadTypeMap:{Fw:[1],Ew:['2','2a','2b'],MH:[3],mH:[4],PS1:[5],PS2:[6],St:[7]}, maxRecordCount:1000, supportsPagination:false },
                { layerID:1, fcPropName:'FunctionalSystem', idPropName:'OBJECTID', outFields:['OBJECTID','FunctionalSystem'], roadTypeMap:{Fw:[1],Ew:['2','2a','2b'],MH:[3],mH:[4],PS1:[5],PS2:[6],St:[7]}, maxRecordCount:1000, supportsPagination:false },
                { layerID:2, fcPropName:'FunctionalSystem', idPropName:'OBJECTID', outFields:['OBJECTID','FunctionalSystem'], roadTypeMap:{Fw:[1],Ew:['2','2a','2b'],MH:[3],mH:[4],PS1:[5],PS2:[6],St:[7]}, maxRecordCount:1000, supportsPagination:false },
                { layerID:3, fcPropName:'FunctionalSystem', idPropName:'OBJECTID', outFields:['OBJECTID','FunctionalSystem'], roadTypeMap:{Fw:[1],Ew:['2','2a','2b'],MH:[3],mH:[4],PS1:[5],PS2:[6],St:[7]}, maxRecordCount:1000, supportsPagination:false },
                { layerID:4, fcPropName:'FunctionalSystem', idPropName:'OBJECTID', outFields:['OBJECTID','FunctionalSystem'], roadTypeMap:{Fw:[1],Ew:['2','2a','2b'],MH:[3],mH:[4],PS1:[5],PS2:[6],St:[7]}, maxRecordCount:1000, supportsPagination:false },
                { layerID:5, fcPropName:'FunctionalSystem', idPropName:'OBJECTID', outFields:['OBJECTID','FunctionalSystem'], roadTypeMap:{Fw:[1],Ew:['2','2a','2b'],MH:[3],mH:[4],PS1:[5],PS2:[6],St:[7]}, maxRecordCount:1000, supportsPagination:false },
                { layerID:6, fcPropName:'FunctionalSystem', idPropName:'OBJECTID', outFields:['OBJECTID','FunctionalSystem'], roadTypeMap:{Fw:[1],Ew:['2','2a','2b'],MH:[3],mH:[4],PS1:[5],PS2:[6],St:[7]}, maxRecordCount:1000, supportsPagination:false }
            ],
            getWhereClause: function(context) {
                if(context.mapContext.zoom < 4) {
                    return context.layer.fcPropName + "<>'7'"; // OR State_Route LIKE 'US%' OR State_Route LIKE 'LA%'";
                } else {
                    return null;
                }
            },
            getFeatureRoadType: function(feature, layer) {
                var fc = feature.attributes[layer.fcPropName];
                if (fc === '2a' || fc === '2b') { fc = 2; }
                fc = parseInt(fc);
                // var stateRoute = feature.attributes.State_Route;
                // var isBusiness = /BUS$/.test(stateRoute);
                // if (fc > 3 && /^US\s/.test(stateRoute) && !isBusiness) {
                //     fc = 3;
                // } else if (fc > 4 && /^LA\s/.test(stateRoute) && !isBusiness) {
                //     fc = 4;
                // }
                return _stateSettings.global.getRoadTypeFromFC(fc, layer);
            }
        },
        MD: {
            baseUrl: 'https://geodata.md.gov/imap/rest/services/Transportation/MD_HighwayPerformanceMonitoringSystem/MapServer/',
            defaultColors: {Fw:'#ff00c5',Ew:'#4f33df',MH:'#149ece',mH:'#4ce600',PS:'#ffff00',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [['St'],['St'],['St'],['St'],[],[],[],[],[],[],[]] },
            fcMapLayers: [
                { layerID:2, fcPropName:'FUNCTIONAL_CLASS', idPropName:'OBJECTID', outFields:['OBJECTID','FUNCTIONAL_CLASS','ID_PREFIX','MP_SUFFIX'], roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]}, maxRecordCount:1000, supportsPagination:false }
            ],
            getWhereClause: function(context) {
                if(context.mapContext.zoom < 4) {
                    return "(FUNCTIONAL_CLASS < 7 OR ID_PREFIX IN('MD'))";
                } else {
                    return null;
                }
            },
            getFeatureRoadType: function(feature,layer) {
                var attr = feature.attributes;
                var fc = parseInt(attr.FUNCTIONAL_CLASS);
                var isState = attr.ID_PREFIX === 'MD';
                var isUS = attr.ID_PREFIX === 'US';
                var isBusiness = attr.MP_SUFFIX === 'BU';
                if (fc > 4 && isState) { fc = (isBusiness ? Math.min(fc,5) : 4); }
                else if (fc > 3 && isUS) { fc = (isBusiness ? Math.min(fc, 4) : 3 );}
                return _stateSettings.global.getRoadTypeFromFC(fc, layer);
            }
        },
        MI: {
            baseUrl: 'https://gisp.mcgi.state.mi.us/arcgis/rest/services/MDOT/NFC/MapServer/',
            defaultColors: {Fw:'#ff00c5',Ew:'#149ece',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [['St'],['St'],['St'],['St'],[],[],[],[],[],[],[]] },
            fcMapLayers: [
                { layerID:2, idPropName:'OBJECTID', fcPropName:'NFC', outFields:['NFC'], roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]}, maxRecordCount:1000, supportsPagination:false }
            ],
            isPermitted: function() { return true; },
            getWhereClause: function(context) {
                if(context.mapContext.zoom < 4) {
                    return context.layer.fcPropName + '<>7';
                } else {
                    return null;
                }
            },
            getFeatureRoadType: function(feature, layer) {
                if (layer.getFeatureRoadType) {
                    return layer.getFeatureRoadType(feature);
                } else {
                    return _stateSettings.global.getFeatureRoadType(feature, layer);
                }
            }
        },
        NV: {
            baseUrl: 'https://gis.nevadadot.com/arcgis/rest/services/ArcGISOnline/PublicMaintenanceMap/MapServer/',
            defaultColors: {Fw:'#ff00c5',Ew:'#149ece',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [['St'],['St'],['St'],['St'],[],[],[],[],[],[],[]] },
            fcMapLayers: [
                { layerID:3, fcPropName:'FUNC_CODE', idPropName:'OBJECTID', outFields:['OBJECTID','FUNC_CODE'], roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]}, maxRecordCount:1000, supportsPagination:false }
            ],
            getWhereClause: function(context) {
                return null;
            },
            getFeatureRoadType: function(feature, layer) {
                return _stateSettings.global.getFeatureRoadType(feature, layer);
            }
        },
        NY: {//https://gis3.dot.ny.gov/arcgis/rest/services/Basemap/MapServer/21
            baseUrl: 'https://gis3.dot.ny.gov/arcgis/rest/services/',
            defaultColors: {Fw:'#ff00c5',Ew:'#5f33df',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1] },
            fcMapLayers: [
                { layerID:'FC/MapServer/1', fcPropName:'FUNC_CLASS', idPropName:'OBJECTID', outFields:['OBJECTID','FUNC_CLASS','SEGMENT_NAME','ROUTE_NO'], roadTypeMap:{Fw:[1,11],Ew:[2,12],MH:[4,14],mH:[6,16],PS:[7,8,17,18]},
                 maxRecordCount:1000, supportsPagination:false },
                { layerID:'Basemap/MapServer/21', idPropName:'OBJECTID', outFields:['OBJECTID','SHIELD'], maxRecordCount:1000, supportsPagination:false }
            ],
            getWhereClause: function(context) {
                if (context.layer.layerID === 'Basemap/MapServer/21') {
                    return ("SHIELD IN ('C','CT')");
                } else {
                    return null;
                }
            },
            getFeatureRoadType: function(feature, layer) {
                var roadType;
                if (layer.layerID === 'Basemap/MapServer/21') {
                    roadType = 'PS';
                } else {
                    roadType = _stateSettings.global.getFeatureRoadType(feature, layer);
                    var routeNo = feature.attributes.ROUTE_NO;
                    if (/^NY.*/.test(routeNo)) {
                        if (roadType === 'PS') roadType = 'mH';
                    } else if (/^US.*/.test(routeNo)) {
                        if (roadType === 'PS' || roadType === 'mH') roadType = 'MH';
                    }
                }
                return roadType;
            }
        },
        NC: {
            baseUrl: 'https://gis11.services.ncdot.gov/arcgis/rest/services/NCDOT_FunctionalClass/MapServer/',
            defaultColors: {Fw:'#ff00c5',Rmp:'#999999',Ew:'#5f33df',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [['St'],['St'],['St'],['St'],[],[],[],[],[],[],[]] },
            fcMapLayers: [
                { layerID:0, fcPropName:'FC_TYP_CD', idPropName:'OBJECTID', outFields:['OBJECTID','FC_TYP_CD','RTE_1_CLSS_CD'], roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]}, zoomLevels:[3,4,5,6,7,8,9,10], maxRecordCount:1000, supportsPagination:false }
                //{ layerID:2, fcPropName:'FC_TYP_CD', idPropName:'OBJECTID', outFields:['OBJECTID','FC_TYP_CD','RTE_1_CLSS_CD'], roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]}, zoomLevels:[2], maxRecordCount:1000, supportsPagination:false },
                //{ layerID:3, fcPropName:'FC_TYP_CD', idPropName:'OBJECTID', outFields:['OBJECTID','FC_TYP_CD','RTE_1_CLSS_CD'], roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]}, zoomLevels:[0,1], maxRecordCount:1000, supportsPagination:false },
                //{ layerID:4, fcPropName:'FC_TYP_CD', idPropName:'OBJECTID', outFields:['OBJECTID','FC_TYP_CD','RTE_1_CLSS_CD'], roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]}, zoomLevels:[], maxRecordCount:1000, supportsPagination:false },
                //{ layerID:5, fcPropName:'FC_TYP_CD', idPropName:'OBJECTID', outFields:['OBJECTID','FC_TYP_CD','RTE_1_CLSS_CD'], roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]}, zoomLevels:[], maxRecordCount:1000, supportsPagination:false },
                //{ layerID:6, fcPropName:'FC_TYP_CD', idPropName:'OBJECTID', outFields:['OBJECTID','FC_TYP_CD','RTE_1_CLSS_CD'], roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]}, zoomLevels:[], maxRecordCount:1000, supportsPagination:false }
            ],
            isPermitted: function() { return _r > 1; },
            getWhereClause: function(context) {
                if(context.mapContext.zoom < 4) {
                    var clause = '(' + context.layer.fcPropName + " < 7 OR RTE_1_CLSS_CD IN ('I','FED','NC','RMP','US'))";
                    return clause;
                } else {
                    return null;
                }
            },
            getFeatureRoadType: function(feature, layer) {
                var fc = feature.attributes[layer.fcPropName];
                var roadType;
                switch (this.getHwySys(feature)) {
                    case 'interstate':
                        roadType = 'Fw';
                        break;
                    case 'us':
                        roadType = fc <= 2 ? 'Ew' : 'MH';
                        break;
                    case 'state':
                        roadType = fc === 2 ? 'Ew' : (fc === 3 ? 'MH' : 'mH');
                        break;
                    case 'ramp':
                        roadType = 'Rmp';
                        break;
                    default:
                        roadType = fc === 2 ? 'Ew' : (fc === 3 ? 'MH' : (fc === 4 ? 'mH' : (fc <= 6 ? 'PS' : 'St')));
                }
                return roadType;
            },
            getHwySys: function(feature) {
                var hwySys;
                switch (feature.attributes.RTE_1_CLSS_CD) {
                    case 'I':
                        hwySys = 'interstate';
                        break;
                    case 'FED':
                    case 'US':
                        hwySys = 'us';
                        break;
                    case 'NC':
                        hwySys = 'state';
                        break;
                    case 'RMP':
                        hwySys = 'ramp';
                        break;
                    default:
                        hwySys = 'local';
                }
                return hwySys;
            }
        },
        ND: {
            baseUrl: 'https://gis.dot.nd.gov/arcgis/rest/services/external/transinfo/MapServer/',
            defaultColors: {Fw:'#ff00c5',Ew:'#149ece',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [['St'],['St'],['St'],['St'],[],[],[],[],[],[],[]] },
            fcMapLayers: [
                { layerID:10, fcPropName:'FUNCTION_CLASS', idPropName:'OBJECTID', outFields:['OBJECTID','FUNCTION_CLASS'], roadTypeMap:{Fw:['Interstate'],MH:['Principal Arterial'],mH:['Minor Arterial'],PS:['Major Collector','Collector'],St:['Local']},
                 maxRecordCount:1000, supportsPagination:false},
                { layerID:11, fcPropName:'FUNCTION_CLASS', idPropName:'OBJECTID', outFields:['OBJECTID','FUNCTION_CLASS'], roadTypeMap:{Fw:['Interstate'],MH:['Principal Arterial'],mH:['Minor Arterial'],PS:['Major Collector','Collector'],St:['Local']},
                 maxRecordCount:1000, supportsPagination:false},
                { layerID:12, fcPropName:'FUNCTION_CLASS', idPropName:'OBJECTID', outFields:['OBJECTID','FUNCTION_CLASS'], roadTypeMap:{PS:['Major Collector','Collector']},
                 maxRecordCount:1000, supportsPagination:false},
                { layerID:16, fcPropName:'SYSTEM_CD', idPropName:'OBJECTID', outFields:['OBJECTID','SYSTEM_CD','SYSTEM_DESC','HIGHWAY'], roadTypeMap:{Fw:[1,11],MH:[2,14],mH:[6,7,16,19]},
                 maxRecordCount:1000, supportsPagination:false}
            ],
            getWhereClause: function(context) {
                if(context.mapContext.zoom < 4) {
                    if (context.layer.layerID !== 16) return context.layer.fcPropName + "<>'Local'";
                } else {
                    return null;
                }
            },
            getFeatureRoadType: function(feature, layer) {
                return _stateSettings.global.getFeatureRoadType(feature, layer);
            }
        },
        OH: {
            baseUrl: 'https://gis.dot.state.oh.us/arcgis/rest/services/TIMS/Roadway_Information/MapServer/',
            defaultColors: {Fw:'#ff00c5',Ew:'#4f33df',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [['St'],['St'],['St'],['St'],[],[],[],[],[],[],[]] },

            fcMapLayers: [
                { layerID:8, fcPropName:'FUNCTION_CLASS', idPropName:'ObjectID', outFields:['FUNCTION_CLASS','ROUTE_TYPE','ROUTE_NBR','ObjectID'],
                 maxRecordCount:1000, supportsPagination:false, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]} }
            ],
            isPermitted: function() { return true; },
            getWhereClause: function(context) {
                if(context.mapContext.zoom < 4) {
                    var clause = '(' + context.layer.fcPropName + " < 7 OR ROUTE_TYPE IN ('CR','SR','US'))";
                    return clause;
                } else {
                    return null;
                }
            },
            getFeatureRoadType: function(feature, layer) {
                var fc = feature.attributes[layer.fcPropName];
                var prefix = feature.attributes.ROUTE_TYPE;
                var isUS = prefix === 'US';
                var isState = prefix === 'SR';
                var isCounty = prefix === 'CR';
                if (isUS && fc > 3) { fc = 3; }
                if (isState && fc > 4) { fc = 4; }
                if (isCounty && fc > 6) { fc = 6; }
                return _stateSettings.global.getRoadTypeFromFC(fc, layer);
            }
        },
        OK: {
            baseUrl: 'https://services6.arcgis.com/RBtoEUQ2lmN0K3GY/arcgis/rest/services/Roadways/FeatureServer/',
            defaultColors: {Fw:'#ff00c5',Ew:'#4f33df',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [['St'],['St'],['St'],['St'],[],[],[],[],[],[],[]] },
            fcMapLayers: [
                { layerID:0, fcPropName:'NFC', idPropName:'OBJECTID', outFields:['F_PRIMARY_','NFC','OBJECTID','ROUTE_CLAS'],
                 maxRecordCount:1000, supportsPagination:false, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]} }
            ],
            getWhereClause: function(context) {
                if(context.mapContext.zoom < 4) {
                    var clause = '(' + context.layer.fcPropName + " < 7 OR ROUTE_CLAS IN ('U','S','I'))";
                    return clause;
                } else {
                    return null;
                }
            },
            getFeatureRoadType: function(feature, layer) {
                var fc = feature.attributes[layer.fcPropName];
                var route = (feature.attributes.F_PRIMARY_ || '').trim();
                var isBusinessOrSpur = /BUS$|SPR$/i.test(route);
                var prefix = isBusinessOrSpur ? route.substring(0,1) : feature.attributes.ROUTE_CLAS;
                var isInterstate = prefix === 'I';
                var isUS = prefix === 'U';
                var isState = prefix === 'S';
                if (((isUS && !isBusinessOrSpur) || (isInterstate && isBusinessOrSpur)) && fc > 3) { fc = 3; }
                if (((isUS && isBusinessOrSpur) || (isState && !isBusinessOrSpur)) && fc > 4) { fc = 4; }
                if (isState && isBusinessOrSpur && fc > 5) { fc = 5; }
                return _stateSettings.global.getRoadTypeFromFC(fc, layer);
            }
        },
        PA: {
            baseUrl: 'https://www.pdarcgissvr.pa.gov/penndotgis/rest/services/PennShare/PennShare/MapServer/',
            supportsPagination: false,
            defaultColors: {Fw:'#00ffff',Ew:'#732500',MH:'#ff0000',mH:'#00ff00',PS:'#b724ff',PS2:'#f3f300',St:'#ff9700'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [['St'],['St'],['St'],['St'],[],[],[],[],[],[],[]] },
            isPermitted: function() { return _r >= 3; },
            fcMapLayers: [
                { layerID:3, features:new Map(), fcPropName:'FUNC_CLS', idPropName:'MSLINK', outFields:['MSLINK','FUNC_CLS'],
                 maxRecordCount:1000, supportsPagination:false, roadTypeMap:{Fw:['01','11'],Ew:['12'],MH:['02','14'],mH:['06','16'],PS:['07','08','17'],St:['09','19']} }
            ],
            getWhereClause: function(context) {
                return null;
            },
            getFeatureRoadType: function(feature, layer) {
                if (layer.getFeatureRoadType) {
                    return layer.getFeatureRoadType(feature);
                } else {
                    var fc = feature.attributes[layer.fcPropName];
                    return _stateSettings.global.getRoadTypeFromFC(fc, layer);
                }
            }
        },
        TN: {
            // NOTE: DUE TO ERRORS FROM THE SHELBY COUNTY SERVER, FC IS NOT WORKING PROPERLY HERE YET (9/23/2016)
            baseUrl: 'https://testuasiportal.shelbycountytn.gov/arcgis/rest/services/MPO/Webmap_2015_04_20_TMPO/MapServer/',

            // TODO: UPDATE COLORS TO MATCH ORIGINAL TN FC MAP COLORS.
            defaultColors: {Fw:'#ff00c5',Ew:'#4f33df',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',PS2:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset:[30,15,8,4,2,1,1,1,1,1] },
            fcMapLayers: [
                { layerID:17, fcPropName:'FuncClass', idPropName:'OBJECTID', outFields:['OBJECTID','FuncClass'], maxRecordCount:1000, supportsPagination:false, roadTypeMap:{Fw:[1,11],Ew:[2,12],MH:[4,14],mH:[6,16],PS:[7,17],PS2:[8,18],St:[9,19]} }
            ],
            getWhereClause: function(context) {
                if(context.mapContext.zoom < 4) {
                    return context.layer.fcPropName + ' NOT IN (9,19)';
                } else {
                    return null;
                }
            },
            getFeatureRoadType: function(feature, layer) {
                if (layer.getFeatureRoadType) {
                    return layer.getFeatureRoadType(feature);
                } else {
                    var fc = feature.attributes[layer.fcPropName];
                    return _stateSettings.global.getRoadTypeFromFC(fc, layer);
                }
            }
        },
        TX: {
            baseUrl: 'https://services.arcgis.com/KTcxiTD9dsQw4r7Z/ArcGIS/rest/services/TxDOT_Functional_Classification/FeatureServer/',
            defaultColors: {Fw:'#ff00c5',Ew:'#4f33df',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset:[30,15,8,4,2,1,1,1,1,1] },
            fcMapLayers: [
                { layerID:0, fcPropName:'F_SYSTEM', idPropName:'OBJECTID', outFields:['OBJECTID','F_SYSTEM', 'RTE_PRFX'], maxRecordCount:1000, supportsPagination:false, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]} }
            ],
            getWhereClause: function(context) {
                var where = " F_SYSTEM IS NOT NULL AND RTE_PRFX IS NOT NULL";
                if(context.mapContext.zoom < 4) {
                    where += ' AND ' + context.layer.fcPropName + " <> 7";
                }
                return where;
            },
            getFeatureRoadType: function(feature, layer) {
                // On-System:
                // IH=Interstate BF=Business FM
                // US=US Highway FM=Farm to Mkt
                // UA=US Alt. RM=Ranch to Mkt
                // UP=US Spur RR=Ranch Road
                // SH=State Highway PR=Park Road
                // SA=State Alt. RE=Rec Road
                // SL=State Loop RP=Rec Rd Spur
                // SS=State Spur FS=FM Spur
                // BI=Business IH RS=RM Spur
                // BU=Business US RU=RR Spur
                // BS=Business State PA=Principal Arterial
                // Off-System:
                // TL=Off-System Tollroad CR=County Road
                // FC=Func. Classified St. LS=Local Street
                if (layer.getFeatureRoadType) {
                    return layer.getFeatureRoadType(feature);
                } else {
                    var fc = feature.attributes[layer.fcPropName];
                    var type = feature.attributes.RTE_PRFX.substring(0,2).toUpperCase();
                    if (type === 'IH' && fc > 1) {
                        fc = 1;
                    } else if ((type === 'US' || type === 'BI' || type === 'UA') && fc > 3) {
                        fc = 3;
                    } else if ((type === 'UP' || type === 'BU' || type === 'SH' || type === 'SA') && fc > 4) {
                        fc = 4;
                    } else if ((type === 'SL' || type === 'SS' || type === 'BS') && fc > 6) {
                        fc = 6;
                    }
                    return _stateSettings.global.getRoadTypeFromFC(fc, layer);
                }
            },
            isPermitted: function() { return _r >= 1; }
        },
        UT: {
            baseUrl: 'https://maps.udot.utah.gov/arcgis/rest/services/Functional_Class/MapServer/',
            defaultColors: {Fw:'#ff00c5',Ew:'#4f33df',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [['St'],['St'],['St'],['St'],[],[],[],[],[],[],[]] },
            fcMapLayers: [
                { layerID:0, fcPropName:'FC_CODE', idPropName:'OBJECTID', outFields:['*'/*'OBJECTID','FC_CODE'*/], roadTypeMap:{Fw:[1],Ew:[2,20],MH:[3,30],mH:[4,40],PS:[5,50,6,60],St:[7,77]},
                 maxRecordCount:1000, supportsPagination:false }
            ],
            getWhereClause: function(context) {
                var clause = context.layer.fcPropName + '<=7';
                if(context.mapContext.zoom < 4) {
                    clause += ' OR ' + context.layer.fcPropName + '<7';
                }
                return clause;
            },
            getFeatureRoadType: function(feature, layer) {
                var routeId = feature.attributes.ROUTE_ID;
                var fc = feature.attributes.FC_CODE;
                if ([6,40,50,89,91,163,189,191,491].indexOf(routeId) > -1 && fc > 3) {
                    // US highway
                    fc = 3;
                } else if (routeId <= 491 && fc > 4) {
                    // State highway
                    fc = 4;
                }
                return _stateSettings.global.getRoadTypeFromFC(fc, layer);
            }
        },
        VA: {
            baseUrl: 'https://services.arcgis.com/p5v98VHDX9Atv3l7/arcgis/rest/services/FC_2014_FHWA_Submittal1/FeatureServer/',
            defaultColors: {Fw:'#ff00c5',Ew:'#ff00c5',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [['St'],['St'],['St'],['St'],[],[],[],[],[],[],[]] },
            fcMapLayers: [
                { layerID:0, fcPropName:'FUNCTIONAL_CLASS_ID', idPropName:'OBJECTID', outFields:['OBJECTID','FUNCTIONAL_CLASS_ID','RTE_NM'], maxRecordCount:2000, supportsPagination:true, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]} },
                { layerID:1, fcPropName:'STATE_FUNCT_CLASS_ID', idPropName:'OBJECTID', outFields:['OBJECTID','STATE_FUNCT_CLASS_ID','RTE_NM','ROUTE_NO'], maxRecordCount:2000, supportsPagination:true, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]} },
                { layerID:3, fcPropName:'TMPD_FC', idPropName:'OBJECTID', outFields:['OBJECTID','TMPD_FC','RTE_NM'], maxRecordCount:2000, supportsPagination:true, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]} }
            ],
            srExceptions: [217,302,303,305,308,310,313,314,315,317,318,319,320,321,322,323,324,325,326,327,328,329,330,331,332,333,334,335,336,339,341,342,343,344,345,346,347,348,350,353,355,357,358,361,362,363,364,365,366,367,368,369,370,371,372,373,374,375,376,377,378,379,382,383,384,385,386,387,388,389,390,391,392,393,394,396,397,398,399,785,895],
            getWhereClause: function(context) {
                if(context.mapContext.zoom < 4) {
                    return context.layer.fcPropName + '<>7';
                } else {
                    //NOTE: As of 9/14/2016 there does not appear to be any US/SR/VA labeled routes with FC = 7.
                    return null;
                }
            },
            getFeatureRoadType: function(feature, layer) {
                if (layer.getFeatureRoadType) {
                    return layer.getFeatureRoadType(feature);
                } else {
                    var fc = parseInt(feature.attributes[layer.fcPropName]);
                    var rtName = feature.attributes.RTE_NM;
                    var match = /^R-VA\s*(US|VA|SR)(\d{5})..(BUS)?/.exec(rtName);
                    var isBusiness = (match && (match !== null) && (match[3] === 'BUS'));
                    var isState = (match && (match !== null) && (match[1] === 'VA' || match[1] === 'SR'));
                    var rtNum = parseInt((layer.layerID === 1) ? feature.attributes.ROUTE_NO : (match ? match[2] : 99999));
                    var rtPrefix = match && match[1];
                    if (fc > 3 && rtPrefix === 'US') {
                        fc = isBusiness ? 4 : 3;
                    } else if (isState && fc > 4 && this.srExceptions.indexOf(rtNum) === -1 && rtNum < 600) {
                        fc = isBusiness ? 5 : 4;
                    }
                    return _stateSettings.global.getRoadTypeFromFC(fc, layer);
                }
            }
        },
        WV: {
            baseUrl: 'https://gis.transportation.wv.gov/arcgis/rest/services/Roads_And_Highways/Publication_LRS/MapServer/',
            defaultColors: {Fw:'#ff00c5',Ew:'#ff00c5',MH:'#149ece',mH:'#4ce600',PS:'#cfae0e',St:'#eeeeee'},
            zoomSettings: { maxOffset: [30,15,8,4,2,1,1,1,1,1], excludeRoadTypes: [['St'],['St'],['St'],['St'],[],[],[],[],[],[],[]] },
            fcMapLayers: [
                { layerID:35, fcPropName:'NAT_FUNCTIONAL_CLASS', idPropName:'OBJECTID', outFields:['OBJECTID','NAT_FUNCTIONAL_CLASS','ROUTE_ID'], maxRecordCount:1000, supportsPagination:true, roadTypeMap:{Fw:[1],Ew:[2],MH:[3],mH:[4],PS:[5,6],St:[7]} }
            ],
            getWhereClause: function(context) {
                if(context.mapContext.zoom < 4) {
                    return context.layer.fcPropName + ' NOT IN(9,19)';
                } else {
                    return null;
                }
            },
            getFeatureRoadType: function(feature, layer) {
                if (layer.getFeatureRoadType) {
                    return layer.getFeatureRoadType(feature);
                } else {
                    var fcCode = feature.attributes[layer.fcPropName];
                    var fc = fcCode;
                    if (fcCode===11) fc = 1;
                    else if (fcCode===4 || fcCode===12) fc = 2;
                    else if (fcCode===2 || fcCode===14) fc = 3;
                    else if (fcCode===6 || fcCode===16) fc = 4;
                    else if (fcCode===7 || fcCode===17 || fcCode===8 || fcCode===18) fc = 5;
                    else fc = 7;
                    var id = feature.attributes.ROUTE_ID;
                    var prefix = id.substr(2,1);
                    var isInterstate = false;
                    var isUS = false;
                    var isState = false;
                    switch (prefix) {
                        case '1':
                            isInterstate = true;
                            break;
                        case '2':
                            isUS = true;
                            break;
                        case '3':
                            isState = true;
                            break;
                    }
                    if (fc > 1 && isInterstate)
                        fc = 1;
                    else if (fc > 3 && isUS)
                        fc = 3;
                    else if (fc > 4 && isState)
                        fc = 4;
                    return _stateSettings.global.getRoadTypeFromFC(fc, layer);
                }
            }
        }
    };

    function log(message, level) {
        if (message && (!level || (level <= _debugLevel))) {
            console.log('FC Layer: ', message);
        }
    }

    function dynamicSort(property) {
        var sortOrder = 1;
        if(property[0] === "-") {
            sortOrder = -1;
            property = property.substr(1);
        }
        return function (a,b) {
            var props = property.split('.');
            props.forEach(function(prop) {
                a = a[prop];
                b = b[prop];
            });
            var result = (a < b) ? -1 : (a > b) ? 1 : 0;
            return result * sortOrder;
        };
    }

    function dynamicSortMultiple() {
        /*
     * save the arguments object as it will be overwritten
     * note that arguments object is an array-like object
     * consisting of the names of the properties to sort by
     */
        var props = arguments;
        if (arguments[0] && Array.isArray(arguments[0])) {
            props = arguments[0];
        }
        return function (obj1, obj2) {
            var i = 0, result = 0, numberOfProperties = props.length;
            /* try getting a different result from 0 (equal)
         * as long as we have extra properties to compare
         */
            while(result === 0 && i < numberOfProperties) {
                result = dynamicSort(props[i])(obj1, obj2);
                i++;
            }
            return result;
        };
    }

    function generateUUID() {
        var d = new Date().getTime();
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c==='x' ? r : (r&0x3|0x8)).toString(16);
        });
        return uuid;
    }

    function loadSettingsFromStorage() {
        var loadedSettings = $.parseJSON(localStorage.getItem(_settingsStoreName));
        var defaultSettings = {
            lastVersion:null,
            layerVisible:true,
            activeStateAbbr:'ALL',
            hideStreet:false
        };
        _settings = loadedSettings ? loadedSettings : defaultSettings;
        for (var prop in defaultSettings) {
            if (!_settings.hasOwnProperty(prop)) {
                _settings[prop] = defaultSettings[prop];
            }
        }
    }

    function saveSettingsToStorage() {
        if (localStorage) {
            _settings.lastVersion = _scriptVersion;
            _settings.layerVisible = _mapLayer.visibility;
            localStorage.setItem(_settingsStoreName, JSON.stringify(_settings));
            log('Settings saved', 1);
        }
    }

    function getLineWidth() {
        return 12 * Math.pow(1.15, (W.map.getZoom()-1));
    }

    function sortArray(array) {
        array.sort(function(a, b){if (a < b)return -1;if (a > b)return 1;else return 0;});
    }

    function getVisibleStateAbbrs() {
        var visibleStates = [];
        W.model.states.additionalInfo.forEach(function(state) {
            var stateAbbr = _statesHash[state.name];
            var activeStateAbbr = _settings.activeStateAbbr;
            if(_stateSettings[stateAbbr] && _stateSettings.global.isPermitted(stateAbbr) && (!activeStateAbbr || activeStateAbbr === 'ALL' || activeStateAbbr === stateAbbr)) {
                visibleStates.push(stateAbbr);
            }
        });
        return visibleStates;
    }

    function getAsync(url, context) {
        return new Promise(function(resolve, reject) {
            GM_xmlhttpRequest({
                context:context, method:"GET", url:url,
                onload:function(res) {
                    if (res.status.toString() === '200') {
                        resolve({responseText: res.responseText, context:context});
                    } else {
                        reject({responseText: res.responseText, context:context});
                    }
                },
                onerror: function() {
                    reject(Error("Network Error"));
                }
            });
        });
    }
    function wait(ms){
        var start = new Date().getTime();
        var end = start;
        while(end < start + ms) {
            end = new Date().getTime();
        }
    }
    function getUrl(context, queryType, queryParams) {
        var extent = context.mapContext.extent,
            zoom = context.mapContext.zoom,
            layer = context.layer,
            state = context.state;

        var whereParts = [];
        var geometry = { xmin:extent.left, ymin:extent.bottom, xmax:extent.right, ymax:extent.top, spatialReference: {wkid: 102100, latestWkid: 3857} };
        var geometryStr = JSON.stringify(geometry);
        var stateWhereClause = state.getWhereClause(context);
        var layerPath = layer.layerPath || '';
        var url = state.baseUrl + layerPath + layer.layerID + '/query?geometry=' + encodeURIComponent(geometryStr);

        if (queryType === 'countOnly') {
            url += '&returnCountOnly=true';
        } else if (queryType === 'idsOnly') {
            url += '&returnIdsOnly=true';
        } else if (queryType === 'paged') {
            // TODO
        } else {
            url += '&returnGeometry=true&maxAllowableOffset=' + state.zoomSettings.maxOffset[zoom];
            url += '&outFields=' + encodeURIComponent(layer.outFields.join(','));
            if (queryType === 'idRange') {
                var idPropName = context.layer.idPropName;
                whereParts.push('(' + queryParams.idFieldName + '>=' + queryParams.range[0] + ' AND ' + queryParams.idFieldName + '<=' + queryParams.range[1] + ')');
            }
        }
        if (stateWhereClause) whereParts.push(stateWhereClause);
        if (whereParts.length > 0 ) url += '&where=' + encodeURIComponent(whereParts.join(' AND '));
        url += '&spatialRel=esriSpatialRelIntersects&geometryType=esriGeometryEnvelope&inSR=102100&outSR=3857&f=json';
        //wait(500);  // I don't know why this was in the code.  Leaving it commented here just in case it was a hack to solve some issue.
        return url;
    }

    function convertFcToRoadTypeVectors(feature, state, stateAbbr, layer, zoom) {
        var roadType = state.getFeatureRoadType(feature, layer);
        log(feature,3);
        var zIndex = _stateSettings.global.roadTypes.indexOf(roadType) * 100;
        var vectors = [];
        var lineFeatures = [];
        var attr = {
            //fcFeatureUniqueId: stateAbbr + '-' + layer.layerID + '-' + feature.attributes[layer.idPropName],
            //fcFeatureId: feature.attributes[layer.idPropName],
            state: stateAbbr,
            layerID: layer.layerID,
            roadType: roadType,
            dotAttributes: $.extend({}, feature.attributes),
            color: state.defaultColors[roadType],
            strokeWidth: getLineWidth,
            zIndex: zIndex
        };

        feature.geometry.paths.forEach(function(path){
            var pointList = [];
            var newPoint = null;
            var lastPoint = null;
            path.forEach(function(point){
                pointList.push(new OL.Geometry.Point(point[0],point[1]));
            });
            var vectorFeature = new OL.Feature.Vector(new OL.Geometry.LineString(pointList),attr);
            vectors.push(vectorFeature);
        });

        return vectors;
    }

    function fetchLayerFC(context) {
        var url = getUrl(context, 'idsOnly');
        log(url,2);
        if (!context.parentContext.cancel) {
            return getAsync(url, context).bind(context).then(function(res) {
                var ids = $.parseJSON(res.responseText);
                if(!ids.objectIds) ids.objectIds = [];
                sortArray(ids.objectIds);
                log(ids,2);
                return ids;
            }).then(function(res) {
                var context = this;
                var idRanges = [];
                if (res.objectIds) {
                    var len = res.objectIds ? res.objectIds.length : 0;
                    var currentIndex = 0;
                    var offset = Math.min(this.layer.maxRecordCount,1000);
                    while (currentIndex < len) {
                        var nextIndex = currentIndex + offset;
                        if (nextIndex >= len) nextIndex = len - 1;
                        idRanges.push({range:[res.objectIds[currentIndex], res.objectIds[nextIndex]], idFieldName:res.objectIdFieldName});
                        currentIndex = nextIndex + 1;
                    }
                    log(context.layer.layerID, 2);
                    log(idRanges,2);
                }
                return idRanges;
            }).map(function(idRange) {
                var context = this;
                if(!context.parentContext.cancel) {
                    var url = getUrl(this, 'idRange', idRange);
                    log(url,2);
                    return getAsync(url, context).then(function(res) {
                        var context = res.context;
                        if(!context.parentContext.cancel) {
                            var features = $.parseJSON(res.responseText).features;
                            // if (context.parentContext.callCount === 0 ) {
                            //     _mapLayer.removeAllFeatures();
                            // }
                            context.parentContext.callCount++;
                            log('Feature Count=' + (features ? features.length : 0),2);
                            features = features ? features : [];
                            var vectors = [];
                            features.forEach(function(feature) {
                                if(!res.context.parentContext.cancel) {
                                    var vector = convertFcToRoadTypeVectors(feature, context.state, context.stateAbbr, context.layer, context.mapContext.zoom);
                                    //var fcFeatureUniqueId = vector[0].attributes.fcFeatureUniqueId;
                                    //context.parentContext.addedFcFeatureUniqueIds.push(fcFeatureUniqueId);
                                    if (/*!context.parentContext.existingFcFeatureUniqueIds[fcFeatureUniqueId] &&*/ !(vector[0].attributes.roadType === 'St' && _settings.hideStreet)) {
                                        vectors.push(vector);
                                    }
                                }
                            });
                            return vectors;
                        }
                    });
                } else {
                    log('Async call cancelled',1);
                }
            });
        }
    }

    function fetchStateFC(context) {
        var state = _stateSettings[context.stateAbbr];
        var contexts = [];
        state.fcMapLayers.forEach(function(layer) {
            contexts.push({parentContext:context.parentContext, layer:layer, state:state, stateAbbr:context.stateAbbr, mapContext:context.mapContext});
        });
        return Promise.map(contexts, function(context) {
            return fetchLayerFC(context);
        });
    }

    var _lastPromise = null;
    var _lastContext = null;
    var _fcCallCount = 0;
    function fetchAllFC() {
        if (!_mapLayer.visibility) return;

        if (_lastPromise) { _lastPromise.cancel(); }
        $('#fc-loading-indicator').text('Loading FC...');

        var mapContext = { zoom:W.map.getZoom(), extent:W.map.getExtent() };
        var contexts = [];
        var parentContext = {callCount:0,/*existingFcFeatureUniqueIds:{}, addedFcFeatureUniqueIds:[],*/ startTime:Date.now()};
        // _mapLayer.features.forEach(function(vectorFeature) {
        //     var fcFeatureUniqueId = vectorFeature.attributes.fcFeatureUniqueId;
        //     var existingFcFeatureUniqueIdArray = parentContext.existingFcFeatureUniqueIds[fcFeatureUniqueId];
        //     if (!existingFcFeatureUniqueIdArray) {
        //         existingFcFeatureUniqueIdArray = [];
        //         parentContext.existingFcFeatureUniqueIds[fcFeatureUniqueId] = existingFcFeatureUniqueIdArray;
        //     }
        //     existingFcFeatureUniqueIdArray.push(vectorFeature);
        // });
        if (_lastContext) _lastContext.cancel = true;
        _lastContext = parentContext;
        getVisibleStateAbbrs().forEach(function(stateAbbr) {
            contexts.push({ parentContext:parentContext, stateAbbr:stateAbbr, mapContext:mapContext});
        });
        var map = Promise.map(contexts, function(context) {
            return fetchStateFC(context);
        }).bind(parentContext).then(function(statesVectorArrays) {
            if (!this.cancel) {
                _mapLayer.removeAllFeatures();
                statesVectorArrays.forEach(function(vectorsArray) {
                    vectorsArray.forEach(function(vectors) {
                        vectors.forEach(function(vector) {
                            vector.forEach(function(vectorFeature) {
                                _mapLayer.addFeatures(vectorFeature);
                            });
                        });
                    });
                });
                //buildTable();
                // for(var fcFeatureUniqueId in this.existingFcFeatureUniqueIds) {
                //     if(this.addedFcFeatureUniqueIds.indexOf(fcFeatureUniqueId) === -1) {
                //         if (!this.cancel) _mapLayer.removeFeatures(this.existingFcFeatureUniqueIds[fcFeatureUniqueId]);
                //     }
                // }
                log('TOTAL RETRIEVAL TIME = ' + (Date.now() - parentContext.startTime),1);
                log(statesVectorArrays,1);
            }
            return statesVectorArrays;
        }).catch(function(e) {
            $('#fc-loading-indicator').text('FC Error! (check console for details)');
            log(e,0);
        }).finally(function() {
            _fcCallCount -= 1;
            if (_fcCallCount === 0) {
                $('#fc-loading-indicator').text('');
            }
        });

        _fcCallCount += 1;
        _lastPromise = map;
    }

    function onLayerCheckboxChanged(checked) {
        _mapLayer.setVisibility(checked);
    }

    function onLayerVisibilityChanged(evt) {
        _settings.layerVisible = _mapLayer.visibility;
        saveSettingsToStorage();
        if (_mapLayer.visibility) {
            fetchAllFC();
        }
    }

    function onModeChanged(model, modeId, context) {
        if(!modeId || modeId === 1) {
            initUserPanel();
        }
    }

    function showScriptInfoAlert() {
        /* Check version and alert on update */
        if (_alertUpdate && _scriptVersion !== _settings.lastVersion) {
            alert(_scriptVersionChanges);
        }
    }

    function initLayer(){
        var _drawingContext = {
            getZIndex: function(feature) {
                return feature.attributes.zIndex;
            },
            getStrokeWidth: function() { return getLineWidth(); }
        };
        var defaultStyle = new OL.Style({
            strokeColor: '${color}', //'#00aaff',
            strokeDashstyle: "solid",
            strokeOpacity: 1.0,
            strokeWidth: '${strokeWidth}',
            graphicZIndex: '${zIndex}'
        });

        var selectStyle = new OL.Style({
            //strokeOpacity: 1.0,
            strokeColor: '#000000'
        });

        _mapLayer = new OL.Layer.Vector("FC Layer", {
            uniqueName: "__FCLayer",
            displayInLayerSwitcher: false,
            rendererOptions: { zIndexing: true },
            styleMap: new OL.StyleMap({
                'default': defaultStyle,
                'select': selectStyle
            })
        });

        _mapLayer.setOpacity(0.5);

        I18n.translations[I18n.locale].layers.name.__FCLayer = "FC Layer";

        _mapLayer.displayInLayerSwitcher = true;
        _mapLayer.events.register('visibilitychanged',null,onLayerVisibilityChanged);
        _mapLayer.setVisibility(_settings.layerVisible);

        W.map.addLayer(_mapLayer);
        _mapLayer.setZIndex(_mapLayerZIndex);
        WazeWrap.Interface.AddLayerCheckbox('Display', 'FC Layer', _settings.layerVisible, onLayerCheckboxChanged);
        // Hack to fix layer zIndex.  Some other code is changing it sometimes but I have not been able to figure out why.
        // It may be that the FC layer is added to the map before some Waze code loads the base layers and forces other layers higher. (?)

        var checkLayerZIndex = function() {
            if (_mapLayer.getZIndex() != _mapLayerZIndex)  {
                log("ADJUSTED FC LAYER Z-INDEX " + _mapLayerZIndex + ', ' + _mapLayer.getZIndex(),1);
                _mapLayer.setZIndex(_mapLayerZIndex);
            }
        };

        setInterval(function(){checkLayerZIndex();}, 200);

        W.map.events.register("moveend",W.map,function(e){
            fetchAllFC();
            return true;
        },true);
    }

    function initUserPanel() {
        var $tab = $('<li>').append($('<a>', {'data-toggle':'tab', href:'#sidepanel-fc-layer'}).text('FC'));
        var $panel = $('<div>', {class:'tab-pane', id:'sidepanel-fc-layer'});
        var $stateSelect = $('<select>', {id:'fcl-state-select',class:'form-control disabled',style:'disabled'}).append($('<option>', {value:'ALL'}).text('All'));
        // $stateSelect.change(function(evt) {
        //     _settings.activeStateAbbr = evt.target.value;
        //     saveSettingsToStorage();
        //     _mapLayer.removeAllFeatures();
        //     fetchAllFC();
        // });
        for (var stateAbbr in _stateSettings) {
            if (stateAbbr !== 'global') {
                $stateSelect.append($('<option>', {value:stateAbbr}).text(reverseStatesHash(stateAbbr)));
            }
        }

        var $hideStreet =  $('<div>',{id: 'fcl-hide-street-container', class:'controls-container'})
        .append($('<input>', {type:'checkbox',name:'fcl-hide-street',id:'fcl-hide-street'}).prop('checked', _settings.hideStreet).click(function() {
            _settings.hideStreet = $(this).is(':checked');
            saveSettingsToStorage();
            _mapLayer.removeAllFeatures();
            fetchAllFC();
        }))
        .append($('<label>', {for:'fcl-hide-street'}).text('Hide street highlights'));

        $stateSelect.val(_settings.activeStateAbbr ? _settings.activeStateAbbr : 'ALL');

        $panel.append(
            $('<div>', {class:'form-group'}).append(
                $('<label>', {class:'control-label'}).text('Select a state')
            ).append(
                $('<div>', {class:'controls', id:'fcl-state-select-container'}).append(
                    $('<div>').append($stateSelect)
                )
            ),
            $hideStreet ,
            $('<div>', {id:'fcl-table-container'})
        );

        $panel.append(
            $('<div>',{style:'margin-top:10px;font-size:10px;color:#999999;'})
            .append($('<div>').text('version ' + _scriptVersion))
            .append(
                $('<div>').append(
                    $('<a>',{href:'#' /*, target:'__blank'*/}).text('Discussion Forum (currently n/a)')
                )
            )
        );

        $('#user-tabs > .nav-tabs').append($tab);
        $('#user-info > .flex-parent > .tab-content').append($panel);
        $('#fcl-state-select').change(function () {
            _settings.activeStateAbbr = this.value;
            saveSettingsToStorage();
            fetchAllFC();
        });
    }

    function addLoadingIndicator() {
        $('.loading-indicator').after($('<div class="loading-indicator" style="margin-right:10px" id="fc-loading-indicator">'));
    }

    function initGui() {
        addLoadingIndicator();
        initLayer();
        initUserPanel();
        showScriptInfoAlert();
    }

    function processText(text) {
        return new Promise(function(resolve, reject) {
            var newText = text.replace(/(e)/,'E');
            resolve(newText);
        });
    }

    function init() {
        if (_debugLevel > 0 && Promise.config) {
            Promise.config({
                warnings: true,
                longStackTraces: true,
                cancellation: true,
                monitoring: false
            });
        } else {
            Promise.config({
                warnings: false,
                longStackTraces: false,
                cancellation: true,
                monitoring: false
            });
        }

        var u = W.loginManager.user;
        _uid = u.id;
        _r = u.rank;
        _isAM = u.isAreaManager;
        loadSettingsFromStorage();
        String.prototype.replaceAll = function(search, replacement) {
            var target = this;
            return target.replace(new RegExp(search, 'g'), replacement);
        };
        initGui();
        W.app.modeController.model.bind('change:mode', onModeChanged);
        W.prefs.on("change:isImperial", function() {initUserPanel();loadSettingsFromStorage();});
        fetchAllFC();
        log('Initialized.', 0);
    }

    function bootstrap() {
        if (W && W.loginManager &&
            W.loginManager.events &&
            W.loginManager.events.register &&
            W.model && W.model.states && W.model.states.additionalInfo &&
            W.map && W.loginManager.user &&
            WazeWrap.Version) {
            log('Initializing...', 0);

            init();
        } else {
            log('Bootstrap failed. Trying again...', 0);
            unsafeWindow.setTimeout(function () {
                bootstrap();
            }, 1000);
        }
    }

    log('Bootstrap...', 0);
    bootstrap();
})();
