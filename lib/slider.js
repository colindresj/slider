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
      itemsToSlide: 2,
      slideSpeed: 100,
      easing: 'swing'
    };
  };

  var sliderProto = TNY.Slider.prototype;

  sliderProto.init = function(element, options){
    this.opts = $.extend(true, {}, this.defaults, options);

    this.$el = $(element);

    if (element[0] === '.') {
      this.el = document.getElementsByClassName(element.slice(1, element.length))[0];
    } else if (element[0] === '#') {
      this.el = document.getElementById(element.slice(1, element.length));
    } else {
      this.el = document.getElementsByTagName(element)[0];
    }

    this.loadContent();
  };

  sliderProto.loadContent = function(){
    var url = this.opts.jsonUrl,
        xhrSuccess;

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

    // Grab the data using AJAX if a url is
    // specified in the options
    if (typeof url === 'string') {
      $.ajax({
        url: url,
        type: 'get'
      })
      .done(xhrSuccess.bind(this))
      .error(function(){
        console.log('something went wrong');
      });
    } else {
      this.getStarted();
    }
  };

  sliderProto.getStarted = function(){
    this.checkSupport();
    // this.el.style.opacity = '0';
    this.opts.mobileNumItems = this.opts.numItems;
    this.organizeSlides();
  };

  sliderProto.checkSupport = function() {
    var tempEl = document.createElement('div'),
        transforms, i, matrix, has3d, touchDevice;

        transforms = {
          'webkitTransform': '-webkit-transform',
          'OTransform': '-o-transform',
          'msTransform': '-ms-transform',
          'MozTransform': '-moz-transform',
          'transform': 'transform'
        };

        // Add it to the body to get the computed style
        document.body.insertBefore(tempEl, document.body.lastChild);

        for (i in transforms) {
          if(tempEl.style[i] !== undefined){
            tempEl.style[i] = 'translate3d(1px, 1px, 1px)';
            matrix = window.getComputedStyle(tempEl).getPropertyValue(transforms[i]);
            break;
          }
        }

        // Check if 3d matrix returned undefined, empty string or 'none'
        has3d = (matrix !== undefined && matrix.length > 0 && matrix !== 'none');

        // Check for touch events
        touchDevice = ('ontouchstart' in window || window.navigator.msMaxTouchPoints);

        this.compatability = {
          'touch': touchDevice,
          'support3d': has3d
        };
  };

  sliderProto.organizeSlides = function(){
    this.$contentItems = this.$el.children();
    this.contentCount = this.$contentItems.length;
    this.setWrapper();
    this.startSlider();
  };

  sliderProto.setWrapper = function() {

    // TODO make this a native wrap
    this.$slides = this.$contentItems.wrapAll('<div class="tnySlider-wrapper">')
                                            .wrap('<div class="slide"></div>')
                                            .parent();

    this.$slidesWrapper = this.$slides.parent();

    this.$slidesContainer = this.$slidesWrapper.wrap('<div class="tnySlider-container">')
                                               .parent();

    this.el.style.display = 'block';
  };

  sliderProto.startSlider = function(){
    this.updateItemLayout();
    this.resizeAll();
    this.createNavigation();
  };

  sliderProto.updateItemLayout = function () {
    var winWidth = $(window).width();

    if (this.opts.justOne === true) {

      // Use this block to reset all the other options that might affect
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
    this.wrapperWidth = this.$slides.length * this.itemWidth;
    this.$slidesWrapper.css({
      'width': this.wrapperWidth,
      'left' : 0
    });

    // Set the width for each item
    this.$contentItems.each(function(i, el){
      el.style.width = this.itemWidth.toString() + 'px';
    }.bind(this));
  };

  sliderProto.createNavigation = function(){
    var $arrowsContainer, $leftArrow, $rightArrow;

    if (this.opts.showArrows === true) {

      // Create the navigational elements
      $arrowsContainer = $('<div class="tnySlider-arrows">');
      $leftArrow = $('<span class="tnySlider-arrow-left">').appendTo($arrowsContainer);
      $rightArrow = $('<span class="tnySlider-arrow-right">').appendTo($arrowsContainer);

      // TODO add touch events
      $arrowsContainer.on('click', 'span', function(e){
        var $target = $(e.target);
        e.preventDefault();

        if ($target.hasClass('tnySlider-arrow-left')) {
          this.goToSlide(this.opts.itemsToSlide);
        } else if ($target.hasClass('tnySlider-arrow-right')) {
          this.goToSlide(this.opts.itemsToSlide);
        }
      }.bind(this));

      // Add the navigation buttons to the page
      $arrowsContainer.appendTo(this.$el);
    }
  };

  sliderProto.goToSlide = function(itemsToSlide){

    // Check for a before slide hook and call it
    if (typeof this.opts.beforeSlide === 'function') {
      this.opts.beforeSlide.call(this);
    }

    // Use CSS 3d transform if supported
    if (this.compatability.support3d !== true) {

    } else {

      // stop any current animations and slide in the direction
      // specified in params
      this.$slidesWrapper.stop(true, true)
                         .animate({
                           'left': this.itemWidth * this.opts.itemsToSlide * -1
                         }, this.opts.slideSpeed, this.opts.easing, function(){
                           if (typeof this.opts.afterSlide === 'function') {
                             this.opts.afterSlide.call(this);
                           }
                         }.bind(this));

    }

  };

})(jQuery, window, document);
