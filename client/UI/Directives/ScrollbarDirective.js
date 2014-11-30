/**
 * Scrollbar directive
 * Based on jQuery plugin SlimScroll v1.3.3
 */
(function () {
    'use strict';

    angular.module('UIModule').directive('uiScrollbar', [
        '$window',
        function ($window) {
            var defaults = {
                width            : 'auto',         // width in pixels of the visible scroll area
                height           : 'auto',         // height in pixels of the visible scroll area
                size             : '7px',          // width in pixels of the scrollbar and rail
                color            : '#000',         // scrollbar color, accepts any hex/color value
                position         : 'right',        // scrollbar position - left/right
                distance         : '1px',          // distance in pixels between the side edge and the scrollbar
                start            : 'top',          // default scroll position on load - top / bottom / $('selector')
                opacity          : .4,             // sets scrollbar opacity
                alwaysVisible    : false,          // enables always-on mode for the scrollbar
                disableFadeOut   : false,          // check if we should hide the scrollbar when user is hovering over
                railVisible      : false,          // sets visibility of the rail
                railColor        : '#333',         // sets rail color
                railOpacity      : .2,             // sets rail opacity
                railDraggable    : true,           // whether  we should use jQuery UI Draggable to enable bar dragging
                railClass        : 'uiScrollRail', // default CSS class of the scroll rail
                barClass         : 'uiScrollBar',  // default CSS class of the scroll bar
                wrapperClass     : 'uiScrollDiv',  // default CSS class of the scroll wrapper
                allowPageScroll  : false,          // check if mouse wheel should scroll the window if we reach top/bottom
                wheelStep        : 20,             // scroll amount applied to each mouse wheel step
                touchScrollStep  : 200,            // scroll amount applied when user is using gestures
                borderRadius     : '0px',          // sets border radius
                railBorderRadius : '0px'           // sets border radius of the rail
            };

            return {
                restrict: 'A',
                scope: {},
                link: function (scope, element, attrs) {
                    // used in event handlers and for better minification
                    var me = $(element);

                    // Merge default options with user options
                    var o = angular.extend({}, defaults);
                    if (typeof attrs.uiScrollbar === 'object') {
                        o = angular.extend(options, attrs.uiScrollbar);
                    }

                    var isOverPanel, isOverBar, isDrag, queueHide, touchDif,
                        barHeight, percentScroll, lastScroll,
                        divS = '<div></div>',
                        minBarHeight = 30,
                        releaseScroll = false,
                        heightAuto = false;

                    // optionally set height to the parent's height
                    if ('auto' == o.height) {
                        o.height = me.parent().height();
                        heightAuto = true;
                    }

                    // wrap content
                    var wrapper = $(divS)
                        .addClass(o.wrapperClass)
                        .css({
                            position: 'relative',
                            overflow: 'hidden',
                            width: o.width,
                            height: o.height
                        });

                    // update style for the div
                    me.css({
                        overflow: 'hidden',
                        width: o.width,
                        height: o.height
                    });

                    // create scrollbar rail
                    var rail = $(divS)
                        .addClass(o.railClass)
                        .css({
                            width: o.size,
                            height: '100%',
                            position: 'absolute',
                            top: 0,
                            display: (o.alwaysVisible && o.railVisible) ? 'block' : 'none',
                            'border-radius': o.railBorderRadius,
                            background: o.railColor,
                            opacity: o.railOpacity,
                            zIndex: 90
                        });

                    // create scrollbar
                    var bar = $(divS)
                        .addClass(o.barClass)
                        .css({
                            background: o.color,
                            width: o.size,
                            position: 'absolute',
                            top: 0,
                            opacity: o.opacity,
                            display: o.alwaysVisible ? 'block' : 'none',
                            'border-radius' : o.borderRadius,
                            BorderRadius: o.borderRadius,
                            MozBorderRadius: o.borderRadius,
                            WebkitBorderRadius: o.borderRadius,
                            zIndex: 99
                        });

                    // set position
                    var posCss = (o.position == 'right') ? { right: o.distance } : { left: o.distance };
                    rail.css(posCss);
                    bar.css(posCss);

                    // wrap it
                    me.wrap(wrapper);

                    // append to parent div
                    me.parent().append(bar);
                    me.parent().append(rail);

                    // make it draggable and no longer dependent on the jqueryUI
                    if (o.railDraggable){
                        bar.bind("mousedown", function(e) {
                            var $doc = $(document);
                            isDrag = true;
                            var t = parseFloat(bar.css('top'));
                            var pageY = e.pageY;

                            $doc.bind("mousemove.slimscroll", function(e){
                                var currTop = t + e.pageY - pageY;
                                bar.css('top', currTop);
                                scrollContent(0, bar.position().top, false);// scroll content
                            });

                            $doc.bind("mouseup.slimscroll", function(e) {
                                isDrag = false;hideBar();
                                $doc.unbind('.slimscroll');
                            });
                            return false;
                        }).bind("selectstart.slimscroll", function(e){
                            e.stopPropagation();
                            e.preventDefault();
                            return false;
                        });
                    }

                    // on rail over
                    rail.hover(function(){
                        showBar();
                    }, function(){
                        hideBar();
                    });

                    // on bar over
                    bar.hover(function(){
                        isOverBar = true;
                    }, function(){
                        isOverBar = false;
                    });

                    // show on parent mouseover
                    me.hover(function(){
                        isOverPanel = true;
                        showBar();
                        hideBar();
                    }, function(){
                        isOverPanel = false;
                        hideBar();
                    });

                    // support for mobile
                    me.bind('touchstart', function(e,b){
                        if (e.originalEvent.touches.length) {
                            // record where touch started
                            touchDif = e.originalEvent.touches[0].pageY;
                        }
                    });

                    me.bind('touchmove', function(e){
                        // prevent scrolling the page if necessary
                        if(!releaseScroll) {
                            e.originalEvent.preventDefault();
                        }
                        if (e.originalEvent.touches.length) {
                            // see how far user swiped
                            var diff = (touchDif - e.originalEvent.touches[0].pageY) / o.touchScrollStep;
                            // scroll content
                            scrollContent(diff, true);
                            touchDif = e.originalEvent.touches[0].pageY;
                        }
                    });

                    // set up initial height
                    getBarHeight();

                    // check start position
                    if (o.start === 'bottom') {
                        // scroll content to bottom
                        bar.css({ top: me.outerHeight() - bar.outerHeight() });
                        scrollContent(0, true);
                    }
                    else if (o.start !== 'top') {
                        // assume jQuery selector
                        scrollContent($(o.start).position().top, null, true);

                        // make sure bar stays hidden
                        if (!o.alwaysVisible) { bar.hide(); }
                    }

                    // attach scroll events
                    attachWheel();

                    // If height of scroll is "auto" resize scroll on element resize
                    $window.addEventListener('resize', resize);

                    // Destroy the scrollbar when directive is destroyed
                    scope.$on('$destroy', function() {
                        // Remove wrapper
                        me.unwrap();

                        // Remove rail
                        rail.remove();

                        // Remove bar
                        bar.remove();

                        $window.removeEventListener('resize', resize);
                    });

                    function resize() {
                        if (heightAuto) {
                            var height = me.parent().parent().height();
                            me.parent().css('height', height);
                            me.css('height', height);
                        }
                    }

                    function _onWheel(e) {
                        // use mouse wheel only when mouse is over
                        if (!isOverPanel) { return; }

                        var e = e || window.event;

                        var delta = 0;
                        if (e.wheelDelta) { delta = -e.wheelDelta/120; }
                        if (e.detail) { delta = e.detail / 3; }

                        var target = e.target || e.srcTarget || e.srcElement;
                        if ($(target).closest('.' + o.wrapperClass).is(me.parent())) {
                            // scroll content
                            scrollContent(delta, true);
                        }

                        // stop window scroll
                        if (e.preventDefault && !releaseScroll) { e.preventDefault(); }
                        if (!releaseScroll) { e.returnValue = false; }
                    }

                    function scrollContent(y, isWheel, isJump) {
                        releaseScroll = false;
                        var delta = y;
                        var maxTop = me.outerHeight() - bar.outerHeight();

                        if (isWheel)
                        {
                            // move bar with mouse wheel
                            delta = parseInt(bar.css('top')) + y * parseInt(o.wheelStep) / 100 * bar.outerHeight();

                            // move bar, make sure it doesn't go out
                            delta = Math.min(Math.max(delta, 0), maxTop);

                            // if scrolling down, make sure a fractional change to the
                            // scroll position isn't rounded away when the scrollbar's CSS is set
                            // this flooring of delta would happened automatically when
                            // bar.css is set below, but we floor here for clarity
                            delta = (y > 0) ? Math.ceil(delta) : Math.floor(delta);

                            // scroll the scrollbar
                            bar.css({ top: delta + 'px' });
                        }

                        // calculate actual scroll amount
                        percentScroll = parseInt(bar.css('top')) / (me.outerHeight() - bar.outerHeight());
                        delta = percentScroll * (me[0].scrollHeight - me.outerHeight());

                        if (isJump)
                        {
                            delta = y;
                            var offsetTop = delta / me[0].scrollHeight * me.outerHeight();
                            offsetTop = Math.min(Math.max(offsetTop, 0), maxTop);
                            bar.css({ top: offsetTop + 'px' });
                        }

                        // scroll content
                        me.scrollTop(delta);

                        // fire scrolling event
                        me.trigger('slimscrolling', ~~delta);

                        // ensure bar is visible
                        showBar();

                        // trigger hide when scroll is stopped
                        hideBar();
                    }

                    function attachWheel() {
                        if (window.addEventListener) {
                            element[0].addEventListener('DOMMouseScroll', _onWheel, false );
                            element[0].addEventListener('mousewheel', _onWheel, false );
                        } else {
                            document.attachEvent("onmousewheel", _onWheel)
                        }
                    }

                    function getBarHeight() {
                        // calculate scrollbar height and make sure it is not too small
                        barHeight = Math.max((me.outerHeight() / me[0].scrollHeight) * me.outerHeight(), minBarHeight);
                        bar.css({ height: barHeight + 'px' });

                        // hide scrollbar if content is not long enough
                        var display = barHeight == me.outerHeight() ? 'none' : 'block';
                        bar.css({ display: display });
                    }

                    function showBar() {
                        // recalculate bar height
                        getBarHeight();
                        clearTimeout(queueHide);

                        // when bar reached top or bottom
                        if (percentScroll == ~~percentScroll) {
                            //release wheel
                            releaseScroll = o.allowPageScroll;

                            // publish approporiate event
                            if (lastScroll != percentScroll) {
                                var msg = (~~percentScroll == 0) ? 'top' : 'bottom';
                                me.trigger('slimscroll', msg);
                            }
                        } else {
                            releaseScroll = false;
                        }
                        lastScroll = percentScroll;

                        // show only when required
                        if (barHeight >= me.outerHeight()) {
                            //allow window scroll
                            releaseScroll = true;
                            return;
                        }

                        bar.stop(true,true).fadeIn('fast');

                        if (o.railVisible) {
                            rail.stop(true,true).fadeIn('fast');
                        }
                    }

                    function hideBar() {
                        // only hide when options allow it
                        if (!o.alwaysVisible) {
                            queueHide = setTimeout(function() {
                                if (!(o.disableFadeOut && isOverPanel) && !isOverBar && !isDrag) {
                                    bar.fadeOut('slow');
                                    rail.fadeOut('slow');
                                }
                            }, 1000);
                        }
                    }
                }
            };
        }
    ]);
})();