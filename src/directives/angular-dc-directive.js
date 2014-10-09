/**
 * @description dc.js directive for AngularJS
 * @version 0.0.1
 * @author Iheb KHEMISSI <iheb.khemissi@gmail.com>
 * @author GitHub contributors
 * @license MIT
 * @year 2014
 */
(function (document, window, angular) {
    'use strict';

    angular.module('dimensionalCharting', [])

        .value('dcApiConfig', {
            version: '2.0.0-alpha.2',
            loadCallback: undefined
        })
        
    
        // TODO CHECK : Should we also load D3 ??
        .provider('dcResources', function () {
            var protocol = 'https:',
                jsUrl = '//cdnjs.cloudflare.com/ajax/libs/dc/_VERSION_/dc.min.js',
                cssUrl = '//cdnjs.cloudflare.com/ajax/libs/dc/_VERSION_/dc.css';

            this.setProtocol = function(newProtocol) {
                protocol = newProtocol;
            };

            this.setJsUrl = function(newUrl) {
                jsUrl = newUrl;
            };
      
            this.setCssUrl = function(newUrl) {
                cssUrl = newUrl;
            };

            this.$get = ["dcApiConfig", function (dcApiConfig) {
                var prefix = protocol ? protocol : '';
                return {
                  js: prefix + jsUrl.replace(/_VERSION_/g, dcApiConfig.version),
                  css: prefix + cssUrl.replace(/_VERSION_/g, dcApiConfig.version)
                };
            };
        })
        .factory('dcJsApiPromise', ['$rootScope', '$q', 'dcApiConfig', 'dcResources', function ($rootScope, $q, apiConfig, dcResources) {
            var apiReady = $q.defer();
            var onLoad = function () {
                         
                var loadCallback = apiConfig.loadCallback;
                $rootScope.$apply(function () {
                    apiReady.resolve();
                });

                if (angular.isFunction(loadCallback)) {
                    loadCallback.call(this);
                }
            };
            
            var resources = dcResources;
                         
            var head = document.getElementsByTagName('head')[0];
      
      
            // Injecting CSS
            // TODO CLEANUP : Check for a better way to do this https://github.com/filamentgroup/loadCSS/blob/master/loadCSS.js
            var stylesheet = document.createElement('link');
            stylesheet.setAttribute('rel', 'stylesheet');
            stylesheet.href = resources.css;
            head.appendChild(stylesheet);
      
      
      
            // Injecting JS
            var script = document.createElement('script');

            script.setAttribute('type', 'text/javascript');
            script.src = resources.js;
            
            if (script.addEventListener) { // Standard browsers (including IE9+)
                script.addEventListener('load', onLoad, false);
            } else { // IE8 and below
                script.onreadystatechange = function () {
                    if (script.readyState === 'loaded' || script.readyState === 'complete') {
                        script.onreadystatechange = null;
                        onLoad();
                    }
                };
            }
            
            head.appendChild(script);

            return apiReady.promise;
        }])
        .directive('dcChart', ['$timeout', '$window', '$rootScope', 'dcJsApiPromise', function ($timeout, $window, $rootScope, dcJsApiPromise) {
            return {
                restrict: 'A',
                scope: {
                    chart: '=',
                    preRender: '&',
                    postRender: '&'
                },
                link: function ($scope, $elm, $attrs) {                  
                  
                    /* Watches, to refresh the chart when its data, formatters, options, or type change.
                        All other values intentionally disregarded to avoid double calls to the draw
                        function. Please avoid making changes to these objects directly from this directive.*/
                    $scope.$watch(function () {
                        return $scope.chart;
                      
                    }, function () {
                        drawAsync();
                      
                    }, true); // true is for deep object equality checking

                    // Redraw the chart if the window is resized
                    var resizeHandler = $rootScope.$on('resizeMsg', function () {
                        $timeout(function () {
                            // Not always defined yet in IE so check
                            if($scope.chart) {
                                drawAsync();
                            }
                        });
                    });

                    // Cleanup resize handler.
                    $scope.$on('$destroy', function () {
                        resizeHandler();
                    });
                  
                    
                    // TODO : managing redraw (in addition to rendering)
                    function draw() {
                        if (!draw.triggered && ($scope.chart != undefined)) {
                            draw.triggered = true;
                            $timeout(function () {


                              
                              var chartType = $scope.chart.type || 'lineChart';
            
                              if (dc && dc[chartType]) { // This chart type is available

                                var chart = dc[chartType]($elm[0], $scope.chart.chartGroupName);

                                var width = $scope.chart.width || 900;

                                chart
                                .dimension($scope.chart.dataDimension)
                                .group($scope.chart.dataGroup, $scope.chart.dataGroupLabel)
                                .title($scope.chart.tooltipValue)
                          //      .renderHorizontalGridLines(true)
                                .x(d3.time.scale().domain([$scope.chart.scaleMin, $scope.chart.scaleMax]))
                                .round(d3.time.minute.round)
                                .xUnits(d3.time.minute)
                                .elasticY(true)
                                //.legend(dc.legend().x(width-300).y(0).itemHeight(13).gap(5))
                                .brushOn(false)
                                ;

                                var colors = $scope.chart.colors;
                                if (typeof(colors) != 'undefined' && colors.length) {
                                    chart.ordinalColors(colors);
                                }
                                  
                                var margins = $scope.chart.margins;
                                if (typeof(margins) != 'undefined') {
                                    chart.margins(margins);
                                }

                                var width = $scope.chart.width;
                                if (typeof(width) != 'undefined') {
                                    chart.width(width);
                                }

                                var height = $scope.chart.height;
                                if (typeof(height) != 'undefined') {
                                    chart.height(height);
                                }
                                  
                                var tickFormat = $scope.chart.tickFormat;
                                if (typeof(tickFormat) != 'undefined') {
                                    chart.xAxis().tickFormat(tickFormat);
                                }
                                
                                
                                var preRenderCallback = $scope.preRender;
                                if (angular.isFunction(preRenderCallback)) {
                                    chart.on('preRender', preRenderCallback);
                                }
                                
                                var postRenderCallback = $scope.postRender;
                                if (angular.isFunction(postRenderCallback)) {
                                    chart.on('postRender', postRenderCallback);
                                }

                                chart.render();

                              }
                              

                            }, 0, true);
                        }
                    }

                    function drawAsync() {
                        dcJsApiPromise.then(function () {
                            draw();
                        })
                    }
                }
            };
        }])

        .run(['$rootScope', '$window', function ($rootScope, $window) {
            angular.element($window).bind('resize', function () {
                $rootScope.$emit('resizeMsg');
            });
        }]);

})(document, window, window.angular);
