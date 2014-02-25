/*! slider - v0.0.1 - 2014-02-24
* Copyright (c) 2014 Jorge Colindres; Licensed  */
(function($, window, document, undefined){
  'use strict';

  window.TNY = window.TNY || {};

  TNY.Slider = function(){
    this.defaults = {
      'jsonUrl' : 'seeds.json',
      'beforeInit' : false
    };
  };


  TNY.Slider.prototype.init = function(element, options){

    if (element[0] === '.') {
      this.el = document.getElementsByClassName(element.slice(1, element.length))[0];
    } else if (element[0] === '#') {
      this.el = document.getElementById(element.slice(1, element.length));
    } else {
      this.el = document.getElementsByTagName(element)[0];
    }

    this.$el = $(element);

    this.opts = $.extend(true, {}, this.defaults, options);

    this.loadContent();

  };

  TNY.Slider.prototype.loadContent = function(){

    var url = this.opts.jsonUrl;

    // Check for a before init hook
    if (typeof this.opts.beforeInit === 'function') {
      this.opts.beforeInit.apply(this, []);
    }

    // Grab the data using AJAX
    if (typeof url === 'string') {


      $.ajax({
        url: url,
        type: 'get'
      })
      .done(function(response){
        var i, content;

        // JSON must be organized within a wrapper 'slides' object
        for (i in data.slides) {
          if (data.slides.hasOwnProperty(i)) {
            content += data.slides[i].item;
          }
        }

        this.$el.html(content);
      });
    }

  };



})(jQuery, window, document);
