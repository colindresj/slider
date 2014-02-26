;(function($, window, document, Reajs, undefined){
  'use strict';

  window.TNY = window.TNY || {};

  // Leave if Rea.js isn't home
  if (!Reajs) return;

  TNY.Slider = function(){
    this.defaults = {
      jsonUrl: 'seeds.json',
      beforeInit: $.noop(),
      beforeLoad: $.noop(),
      beforeSlide: $.noop(),
      afterSlide: $.noop(),
      afterLazyLoad: $.noop(),
      justOne: false,
      numItems: 1,
      tabletBreakpoint: 600,
      tabletNumItems: 2,
      desktopBreakpoint: 850,
      desktopNumItems: 3,
      showArrows: true,
      showPagination: true,
      itemsToSlide: 1,
      slideSpeed: 200,
      slideAsGroup: true,
      cssTransform: true,
      auto: false,
      autoDelay: 5000,
      replayAtEnd: false,
      lazyLoad: true,
      lazyFadeIn: true,
      easing: 'swing'
    };
  };

  var sliderProto = TNY.Slider.prototype;

  sliderProto.init = function(element, options){
    var i;

    // Quit early if no element
    if (!element) return;

    this.opts = $.extend(true, {}, this.defaults, options);

    // Check for before init hook(s) and invoke
    if (typeof this.opts.beforeInit === 'function') {
      this.opts.beforeInit.call(this);
    } else if (this.opts.beforeInit instanceof Array) {
      for (i = 0; i < this.opts.beforeInit.length; i++) {
        this.opts.beforeInit[i].call(this);
      }
    }

    this.$el = $(element);
    this.el = this.$el[0];

    this.setUpReajs();
    this.loadContent();
  };

  sliderProto.setUpReajs = function(){
    Reajs.addBreakpoint('mobile', { max: this.opts.tabletBreakpoint - 1 });
    Reajs.addBreakpoint('tablet', { min: this.opts.tabletBreakpoint, max: this.opts.desktopBreakpoint - 1 });
    Reajs.addBreakpoint('desktop', { min: this.opts.desktopBreakpoint });

    Reajs.onBreakpoint('mobile', function(){
      this.updateItemLayout();
      this.resizeAll();
    }, this);

    Reajs.onBreakpoint('tablet', function(){
      this.updateItemLayout();
      this.resizeAll();
    }, this);

    Reajs.onBreakpoint('desktop', function(){
      this.updateItemLayout();
      this.resizeAll();
    }, this);
  };

  sliderProto.loadContent = function(){
    var url = this.opts.jsonUrl,
        i, xhrSuccess, xhrError, errorClass;

    // Check for before load hook(s) and invoke
    if (typeof this.opts.beforeLoad === 'function') {
      this.opts.beforeLoad.call(this);
    } else if (this.opts.beforeLoad instanceof Array) {
      for (i = 0; i < this.opts.beforeLoad.length; i++) {
        this.opts.beforeLoad[i].call(this);
      }
    }

    // AJAX success callback
    xhrSuccess = function(data){
      var content = "", i, markup;

        // JSON must be organized within a wrapper 'slides' object
        for (i in data.slides) {
          if (data.slides.hasOwnProperty(i)) {
            markup = data.slides[i].markup;
            content += markup;
          }
        }

        this.$el.html(content);

        this.getStarted();
      };

      xhrError = function(response) {
        errorClass = 'error';
        if (this.el.classList) this.el.classList.add(errorClass);
        this.el.textContent = 'Something went wrong...';
      };

    // Grab the data using AJAX if a url is
    // specified in the options
    if (typeof url === 'string') {
      $.ajax({
        url: url,
        type: 'get'
      })
      .done(xhrSuccess.bind(this))
      .error(xhrError.bind(this));
    } else {
      this.getStarted();
    }
  };

  sliderProto.getStarted = function(){

    // check browser support for CSS transforms and touch events
    this.checkSupport();

    // set the mobile number of items equal to the configuration
    // number in order to maintain a mobile-first approach
    this.opts.mobileNumItems = this.opts.numItems;

    this.organizeSlides();
  };

  sliderProto.checkSupport = function() {
    var tempEl = document.createElement('div'),
        transitions, i, transitionsSupport, touchDevice;

        transitions = ['transitionProperty', 'WebkitTransition', 'MozTransition', 'OTransition', 'msTransition'];

        for (i in transitions){
          if (tempEl.style[transitions[i]] !== undefined) {
            transitionsSupport = true;
            break;
          }
          transitionsSupport = false;
        }

        // Check for touch events
        // touchDevice = ('touchend' in window) || window.DocumentTouch && document instanceof DocumentTouch;
        touchDevice = document.createTouch !== undefined && document.createTouch !== null;

        this.compatability = {
          'touch': touchDevice,
          'supportCSSAnim': transitionsSupport
        };
  };

  sliderProto.organizeSlides = function(){
    this.$contentItems = this.$el.children();
    this.contentCount = this.$contentItems.length;
    this.setWrapper();
    this.startSlider();
    this.lazyLoad();
  };

  sliderProto.setWrapper = function() {

    // TODO make this a native wrap?
    this.$slidesWrapper = this.$contentItems.wrapAll('<div class="tnySlider-wrapper">')
                                            .wrap('<div class="slide"></div>')
                                            .parents('.tnySlider-wrapper');

    this.$slidesContainer = this.$slidesWrapper.wrap('<div class="tnySlider-container">')
                                               .parent();

    this.el.style.display = 'block';
  };

  sliderProto.startSlider = function(){
    this.updateItemLayout();
    this.resizeAll();
    this.currItem = this.opts.numItems;
    this.createNavigation();
    this.createEventListeners();

    if (this.compatability.touch) this.createSwipeEventListener();

    // Start autoplay if set in options and bind context
    if (this.opts.auto) {
      this.autoPlayer = setInterval(this.autoPlay.bind(this), this.opts.autoDelay);
    }
  };

  sliderProto.updateItemLayout = function () {
    var winWidth = $(window).width();

    if (this.opts.justOne === true) {

      // Use this block to reset all the other options that might affect
      //the way a single slide is displayed

      // Reset all the number of items at ever viewport to just one
      this.opts.numItems =
      this.opts.mobileNumItems =
      this.opts.tabletNumItems =
      this.opts.desktopNumItems = 1;

      this.opts.itemsToSlide = 1;
      this.opts.slideAsGroup = true;

      // Return early
      return;
    }

    if (winWidth < this.opts.tabletBreakpoint) {
      this.opts.numItems = this.opts.mobileNumItems;
    } else if (winWidth < this.opts.desktopBreakpoint) {
      this.opts.numItems = this.opts.tabletNumItems;
    } else if (winWidth >= this.opts.desktopBreakpoint) {
      this.opts.numItems = this.opts.desktopNumItems;
    }

    // if number of items is less than declared
    if (this.opts.numItems > this.contentCount) this.opts.numItems = this.contentCount;
  };

  sliderProto.resizeAll = function(){
    var def;

    this.itemWidth = Math.round(this.$el.width() / this.opts.numItems);

    // Set the width for wrapper
    this.wrapperWidth = this.contentCount * this.itemWidth;
    this.$slidesWrapper[0].style.width = this.wrapperWidth + 'px';

    if (!this.compatability.supportCSSAnim) {
      this.$slidesWrapper[0].style.left = 0;
    }

    // Set the width and display for each item
    this.$contentItems.parent().css({
      'width': this.itemWidth + 'px',
      'display': 'block'
    });

  };

  sliderProto.createNavigation = function(){
    var eventType, arrowEvents, $arrowsContainer, paginationEvents, $paginationContainer, $pager, numPages, i;

    arrowEvents = function(e){
      var $target = $(e.target);
      e.preventDefault();

      if (this.opts.auto) this.stopAutoPlay();

      if ($target.hasClass('tnySlider-arrow-left')) {
        this.goPrevious();
      } else if ($target.hasClass('tnySlider-arrow-right')) {
        this.goNext();
      }
    };

    paginationEvents = function(e){
      var $target = $(e.target);

      if (this.opts.auto) this.stopAutoPlay();

        // Change the current item and keep track of
        // the last current item
        this.previousCurrItem = this.currItem;
        this.currItem = ($target.data('slide-to'));

        // Go to the correct location
        this.goToSlide(this.currItem);
      };

    eventType = this.compatability.touch ? 'touchend' : 'click';

    if (this.opts.showArrows === true) {

      // Create the navigational elements
      $arrowsContainer = $('<div class="tnySlider-arrows">');
      this.$leftArrow = $('<span class="tnySlider-arrow-left no-click">').appendTo($arrowsContainer);
      this.$rightArrow = $('<span class="tnySlider-arrow-right">').appendTo($arrowsContainer);

      $arrowsContainer.on(eventType, 'span', arrowEvents.bind(this));

      // Add the navigation buttons to the page
      $arrowsContainer.appendTo(this.$el);
    }

    if (this.opts.showPagination === true) {

      // Create the pagiation elements
      $paginationContainer = $('<div class="tnySlider-pagination">');

      numPages = Math.ceil(this.contentCount / this.opts.numItems);

      for (i = 0; i < numPages; i++) {
        $pager = $('<span class="pager">').appendTo($paginationContainer);

        // Apply slide-to data to each pager
        if (i === numPages - 1) {
          $pager.data('slide-to', this.contentCount);
        } else if (i === 0) {
          $pager.data('slide-to', this.opts.numItems);
        } else {
          $pager.data('slide-to', this.opts.numItems * (i + 1));
        }
      }

      $paginationContainer.on(eventType, 'span', paginationEvents.bind(this));

      $paginationContainer.appendTo(this.$el);
    }
  };

  sliderProto.createSwipeEventListener = function(){
    var swipeSliderRight, swipeSliderLeft,
        startTime, endTime, timeMin = 100,
        distanceMin = 100, distance = 0, swipeDirection,
        initTouchPoint, initX, exitTouchPoint;

    swipeSliderRight = function (e){
      this.goPrevious(this.currItem);
    };

    swipeSliderLeft = function (e){
      this.goNext(this.currItem);
    };

    this.el.addEventListener('touchstart', function(e){
      e.preventDefault();
      startTime = new Date().getTime();

      initTouchPoint = e.changedTouches[0];
      initX = initTouchPoint.pageX;
    });

    this.el.addEventListener('touchmove', function(e){

      // prevent scrolling while swiping inside the slider
      e.preventDefault();
    });

    this.el.addEventListener('touchend', function(e){
      e.preventDefault();
      endTime = new Date().getTime();

      exitTouchPoint = e.changedTouches[0];
      distance = exitTouchPoint.pageX - initX;

      swipeDirection = distance > 0 ? 'right' : 'left';

      if (endTime - startTime > timeMin) {
        if (swipeDirection === 'right') {
          this.triggerCustomEvent('tnySlider:swipe:right');
        } else {
          this.triggerCustomEvent('tnySlider:swipe:left');
        }
      }
    }.bind(this));

    this.el.addEventListener('tnySlider:swipe:right', swipeSliderRight.bind(this));
    this.el.addEventListener('tnySlider:swipe:left', swipeSliderLeft.bind(this));
  };

  sliderProto.createEventListeners = function(){

    this.el.addEventListener('tnySlider:reach:end', function(e){

      if (this.opts.replayAtEnd) {

        // Go back to start
        this.currItem = 0;
      } else {
        this.$rightArrow.addClass('no-click');
        if (this.opts.auto) this.stopAutoPlay();
      }

      console.log('end reached');
    }.bind(this));

    this.el.addEventListener('tnySlider:reach:start', function(e){
      this.$leftArrow.addClass('no-click');

      console.log('start reached');
    }.bind(this));

    this.el.addEventListener('tnySlider:leave:end', function(e){
      this.$rightArrow.removeClass('no-click');

      console.log('end left');
    }.bind(this));

    this.el.addEventListener('tnySlider:leave:start', function(e){
      this.$leftArrow.removeClass('no-click');

      console.log('start left');
    }.bind(this));

  };

  sliderProto.triggerCustomEvent = function(eventName, data){
    var customEvent;

    // Check if the browser supports the new constructor function
    if (window.CustomEvent) {
      customEvent = new CustomEvent(eventName, {detail: data});
    } else {
      customEvent = document.createEvent('CustomEvent');

      // initCustomEvent( eventType, canItBubble, isItCancelable, detailAboutEvent);
      customEvent.initCustomEvent(eventName, true, true, data);
    }

    // Trigger the event
    this.el.dispatchEvent(customEvent);
  };

  sliderProto.autoPlay = function(){
    this.goNext();
  };

  sliderProto.stopAutoPlay = function(){
    console.log('auto stopped');
    clearInterval(this.autoPlayer);
    this.opts.auto = false;
  };

  sliderProto.goPrevious = function(){
    this.opts.itemsToSlide = this.opts.slideAsGroup ? this.opts.numItems : (this.opts.itemsToSlide || 1);
    var toBeLeft = this.currItem - this.opts.itemsToSlide;

    if (toBeLeft) {

      this.previousCurrItem = this.currItem;

      if (toBeLeft <= 1 || toBeLeft <= this.opts.numItems) {
        this.currItem = this.opts.numItems;
      } else {
        this.currItem -= this.opts.itemsToSlide;
      }

      this.goToSlide(this.currItem);
    }
  };

  sliderProto.goNext = function(){
    var itemsLeft = this.contentCount - this.currItem;
    this.opts.itemsToSlide = this.opts.slideAsGroup ? this.opts.numItems : (this.opts.itemsToSlide || 1);

    if (itemsLeft) {

      this.previousCurrItem = this.currItem;

      if (((this.contentCount % this.opts.itemsToSlide) && (itemsLeft < this.opts.itemsToSlide)) || itemsLeft === 1) {
        this.currItem = this.contentCount;

      } else {
        this.currItem += this.opts.itemsToSlide;
      }

      this.goToSlide(this.currItem);
    }

  };

  sliderProto.goToSlide = function(slide){
    var position = (slide - this.opts.numItems) * this.itemWidth * -1,
        fullWidth = this.itemWidth * this.contentCount * -1,
        customEvent, i, j;

    // Check for before slide hook(s) and invoke
    if (typeof this.opts.beforeSlide === 'function') {
      this.opts.beforeSlide.call(this);
    } else if (this.opts.beforeSlide instanceof Array) {
      for (i = 0; i < this.opts.beforeSlide.length; i++) {
        this.opts.beforeSlide[i].call(this);
      }
    }

    // Load up the images
    this.lazyLoad();

    // Use CSS transform if supported and set as option, else
    // fallback to jQuery.animate
    if (this.compatability.supportCSSAnim === true && this.opts.cssTransform === true) {
      var style = this.$slidesWrapper[0].style;

      style.webkitTransitionDuration = style.MozTransitionDuration =
      style.msTransitionDuration = style.OTransitionDuration =
      style.transitionDuration = this.opts.slideSpeed * 4 + 'ms';

      style.webkitTransitionTimingFunction = style.MozTransitionTimingFunction =
      style.msTransitionTimingFunction = style.OTransitionTimingFunction =
      style.transitionTimingFunction = 'cubic-bezier(.58, .13, .51, .88)';

      style.webkitTransform = 'translate(' + position + 'px, 0)' + 'translateZ(0)';
      style.msTransform = style.MozTransform =
      style.OTransform = 'translateX(' + position + 'px)';

    } else {

      // Stop any current animations and slide to position
      this.$slidesWrapper.stop(true, true)
                         .animate({
                           'left': position
                         }, this.opts.slideSpeed, this.opts.easing, function(){

                          // Check for afterSlide hook(s) and invoke
                          if (typeof this.opts.afterSlide === 'function') {
                            this.opts.afterSlide.call(this);
                          } else if (this.opts.afterSlide instanceof Array) {
                            for (j = 0; j < this.opts.afterSlide.length; j++) {
                              this.opts.afterSlide[j].call(this);
                            }
                          }

                         }.bind(this));

    }

    // Trigger bookend events
    if (this.previousCurrItem !== this.currItem) {

      if (this.previousCurrItem === this.contentCount) {
        this.triggerCustomEvent('tnySlider:leave:end');
      }

      if (this.previousCurrItem === this.opts.numItems) {
        this.triggerCustomEvent('tnySlider:leave:start');
      }

      if (this.currItem === this.contentCount) {
        this.triggerCustomEvent('tnySlider:reach:end');
      }

      if ((this.currItem - this.opts.numItems) === 0) {
        this.triggerCustomEvent('tnySlider:reach:start');
      }

    }


  };

  sliderProto.lazyLoad = function(){
    var i, j, $item, $lazyImage;

    // Break out if not set to lazy load
    if (!this.opts.lazyLoad) return;

    // Break if all the images have been loaded
    if (this.$slidesWrapper.find('.lazyLoaded').length >= this.contentCount) return;

    for (i = this.contentCount - 1; i >= 0; i--) {
      $item = $(this.$contentItems[i]);

      // Move on to the next if the item is already loaded
      if ($item.data('load-status') === 'loaded') continue;

      // Move on to the next if the item is not in the viewport
      if (!this.readyForLazyLoad(i)) continue;

      // Find the image within the markup
      // Go up to the parent because the element itself may be an image
      $lazyImage = $item.parent().children('img');

      // Move on
      if (typeof $lazyImage.data('load-src') !== 'string') {
        $item.data('load-status', 'loaded');
        continue;
      }

      // Load up the image if the status is not set
      if ($item.data('load-status') === undefined) {
        $lazyImage[0].style.display = 'none';
        $item.addClass('loading').data('load-status', 'attempted');
        this.loadImage($item, $lazyImage);

        // Check for after lazyload hook(s) and invoke
        if (typeof this.opts.afterLazyLoad === 'function') {
          this.opts.afterLazyLoad.call(this);
        } else if (this.opts.afterLazyLoad instanceof Array) {
          for (j = 0; j < this.opts.afterLazyLoad.length; j++) {
            this.opts.afterLazyLoad[j].call(this);
          }
        }
      }
    }
  };

  sliderProto.readyForLazyLoad = function(index){
    return ++index <= this.currItem;
  };

  sliderProto.loadImage = function($item, $lazyImage){
    $lazyImage.attr('src', $lazyImage.data('load-src'));
    $item.data('load-status', 'loaded');
    $lazyImage.removeAttr('data-load-src').addClass('lazyLoaded');

    return this.opts.lazyFadeIn ? $lazyImage.fadeIn(800) : $lazyImage[0].style.display = 'inline';
  };

})(jQuery, window, document, Reajs);
