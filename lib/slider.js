(function($, window, document, undefined){
  'use strict';

  window.TNY = window.TNY || {};


  TNY.Slider = function(){
    this.defaults = {
      jsonUrl: 'seeds.json',
      beforeLoad: false,
      beforeSlide: false,
      afterSlide: false,
      justOne: false,
      numItems: 1,
      tabletBreakpoint: 800,
      tabletNumItems: 2,
      desktopBreakpoint: 1000,
      desktopNumItems: 3,
      showArrows: true,
      itemsToSlide: 1,
      slideSpeed: 200,
      slideAsGroup: true,
      cssTransform: true,
      auto: true,
      autoDelay: 5000,
      replayAtEnd: true,
      easing: 'swing'
    };
  };

  var sliderProto = TNY.Slider.prototype;

  sliderProto.init = function(element, options){

    // Quit early if no element
    if (!element) return;

    this.opts = $.extend(true, {}, this.defaults, options);

    this.$el = $(element);
    this.el = this.$el[0];

    this.loadContent();
  };

  sliderProto.loadContent = function(){
    var url = this.opts.jsonUrl,
        xhrSuccess, xhrError, errorClass;

    // Check for a before load hook and call it
    if (typeof this.opts.beforeLoad === 'function') {
      this.opts.beforeLoad.call(this);
    }

    // AJAX success callback
    xhrSuccess = function(data){
      var content = "", i, path;

        // JSON must be organized within a wrapper 'slides' object
        for (i in data.slides) {
          if (data.slides.hasOwnProperty(i)) {
            path = data.slides[i].path;
            content += '<img src="' + path + '" />';
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
        touchDevice = ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch;

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
    // this.previousItems = [];
    this.createNavigation();
    this.createEventListeners();

    // Start autoplay if set in options and bind context
    if (this.opts.auto) {
      this.autoPlayer = setInterval(this.autoPlay.bind(this), this.opts.autoDelay);
    }
  };

  sliderProto.updateItemLayout = function () {
    var winWidth = $(window).width();

    if (this.opts.justOne === true) {

      // TODO Use this block to reset all the other options that might affect
      // the way a single slide is displayed and return early
      return false;
    }

    if (winWidth < this.opts.tabletBreakpoint) {
      this.opts.numItems = this.opts.mobileNumItems;
    } else if (winWidth < this.opts.desktopBreakpoint) {
      this.opts.numItems = this.opts.tabletNumItems;
    } else if (winWidth > this.opts.desktopBreakpoint) {
      this.opts.numItems = this.opts.desktopNumItems;
    }

    // if number of items is less than declared
    if (this.opts.numItems > this.contentCount) this.opts.numItems = this.contentCount;
  };

  sliderProto.resizeAll = function(){
    this.itemWidth = Math.round(this.$el.width() / this.opts.numItems);

    // Set the width for wrapper
    this.wrapperWidth = this.contentCount * this.itemWidth;
    this.$slidesWrapper[0].style.width = this.wrapperWidth + 'px';

    if (!this.compatability.supportCSSAnim) {
      this.$slidesWrapper[0].style.left = 0;
    }

    // Set the width for each item
    this.$contentItems.each(function(i, el){
      el.style.width = this.itemWidth + 'px';
    }.bind(this));
  };

  sliderProto.createNavigation = function(){
    var $arrowsContainer;

    if (this.opts.showArrows === true) {

      // Create the navigational elements
      $arrowsContainer = $('<div class="tnySlider-arrows">');
      this.$leftArrow = $('<span class="tnySlider-arrow-left no-click">').appendTo($arrowsContainer);
      this.$rightArrow = $('<span class="tnySlider-arrow-right">').appendTo($arrowsContainer);

      // TODO add touch events and native event listeners
      $arrowsContainer.on('click', 'span', function(e){
        var $target = $(e.target);
        e.preventDefault();

        if (this.opts.auto) this.stopAutoPlay();

        if ($target.hasClass('tnySlider-arrow-left')) {
          this.goPrevious();
        } else if ($target.hasClass('tnySlider-arrow-right')) {
          this.goNext();
        }
      }.bind(this));

      // Add the navigation buttons to the page
      $arrowsContainer.appendTo(this.$el);
    }
  };

  sliderProto.createEventListeners = function(){

    this.el.addEventListener('tnySlider:reach:end', function(e){

      if (this.opts.replayAtEnd) {
        this.replayAtEnd();
      } else {
        this.$rightArrow.addClass('no-click');
        this.stopAutoPlay();
      }

      console.log('end reached');
    }.bind(this));

    this.el.addEventListener('tnySlider:leave:end', function(e){
      this.$rightArrow.removeClass('no-click');


      console.log('end left');
    }.bind(this));

    this.el.addEventListener('tnySlider:reach:start', function(e){
      this.$leftArrow.addClass('no-click');


      console.log('start reached');
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

      if (toBeLeft <= 1 || toBeLeft <= this.opts.numItems) {
        this.itemsLeft = this.contentCount;
        this.currItem = this.opts.numItems;
      } else {
        this.itemsLeft += this.opts.numItems;
        this.currItem -= this.opts.itemsToSlide;
      }

      this.goToSlide(this.currItem);
    }
  };

  sliderProto.goNext = function(){
    this.itemsLeft = this.contentCount - this.currItem;
    this.opts.itemsToSlide = this.opts.slideAsGroup ? this.opts.numItems : (this.opts.itemsToSlide || 1);

    if (this.itemsLeft) {

      if (((this.contentCount % this.opts.itemsToSlide) && (this.itemsLeft < this.opts.itemsToSlide)) || this.itemsLeft === 1) {
        this.itemsLeft = 0;
        this.currItem = this.contentCount;

      } else {
        this.itemsLeft -= this.opts.numItems;
        this.currItem += this.opts.itemsToSlide;
      }

      this.goToSlide(this.currItem);
    }

  };

  sliderProto.goToSlide = function(slide){
    var position = (slide - this.opts.numItems) * this.itemWidth * -1,
        fullWidth = this.itemWidth * this.contentCount * -1,
        customEvent;

    // Check for a before slide hook and call it
    // TODO switch these to calls to noop
    if (typeof this.opts.beforeSlide === 'function') {
      this.opts.beforeSlide.call(this);
    }

    if (!(this.currItem - this.opts.numItems)) {
      this.triggerCustomEvent('tnySlider:reach:start');
    }

    // Trigger event's related to the end
    if (!this.itemsLeft) {
      this.triggerCustomEvent('tnySlider:reach:end');
    }

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

      // TODO add rejection animation
      // TODO add looping support

      // Stop any current animations and slide to position
      this.$slidesWrapper.stop(true, true)
                         .animate({
                           'left': position
                         }, this.opts.slideSpeed, this.opts.easing, function(){
                           if (typeof this.opts.afterSlide === 'function') {
                             this.opts.afterSlide.call(this);
                           }
                         }.bind(this));

    }

  };

  sliderProto.replayAtEnd = function(){
    // debugger
    // this.goToSlide(0);
  };

})(jQuery, window, document);
