
/* ================================================================================== 
 * 
 * jQuery.WowBox-0.2.js
 * date: May 2014
 * Author: Dan Mantyla - http://dannix.net
 * License: MIT
 * example:
 *    $('#mydiv').wowbox({src:'myimage.png'});
 * 
 * ================================================================================== */


// the semi-colon before function invocation is a safety net against concatenated
// scripts and/or other plugins which may not be closed properly.
;
(function ($, window, document, undefined) {

    // undefined is used here as the undefined global variable in ECMAScript 3 is
    // mutable (ie. it can be changed by someone else). undefined isn't really being
    // passed in so we can ensure the value of it is truly undefined. In ES5, undefined
    // can no longer be modified.

    // window and document are passed through as local variable rather than global
    // as this (slightly) quickens the resolution process and can be more efficiently
    // minified (especially when both are regularly referenced in your plugin).

    // Create the defaults once
    var pluginName = "wowbox",
        defaults = {
            src: "",
            id: "",
            height: 0,
            width: 0,
            viewDistance: 12.5,
            fov: 0,
            fovAdjustment: 0.9,
            xRotationAdjustment: 1.5,
            yRotationAdjustment: 2.0,
            boxSizeAdjustment: 1.1,
            topGradientColor: "rgba(100,100,100,0.4)",
            bottomGradientColor: "rgba(50,50,50,0.6)",
            borderColor: "rgba(0,0,0, 0.8)",
        };

    function Point3D(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;

        this.rotateX2 = function (angle) {
            var rad, cosa, sina, y, z;
            rad = angle * Math.PI / 180;
            cosa = Math.cos(rad);
            sina = Math.sin(rad);
            y = this.y * cosa - this.z * sina;
            z = this.y * sina + this.z * cosa;
            return new Point3D(this.x, y, z);
        };

        this.rotateX = function (angle) {
            var rad, cosa, sina, y, z;
            rad = angle * Math.PI / 180;
            cosa = Math.cos(rad);
            sina = Math.sin(rad);
            y = this.y * cosa - this.z * sina;
            return new Point3D(this.x, y, this.z);
        };


        this.rotateY = function (angle) {
            var rad, cosa, sina, x, z;
            rad = angle * Math.PI / 180;
            cosa = Math.cos(rad);
            sina = Math.sin(rad);
            //z = this.z * cosa - this.x * sina;
            x = this.z * sina + this.x * cosa;
            return new Point3D(x, this.y, this.z);
        };

        this.rotateY2 = function (angle) {
            var rad, cosa, sina, x, z;
            rad = angle * Math.PI / 180;
            cosa = Math.cos(rad);
            sina = Math.sin(rad);
            z = this.z * cosa - this.x * sina;
            x = this.z * sina + this.x * cosa;
            return new Point3D(x, this.y, z);
        };

        this.rotateZ = function (angle) {
            var rad, cosa, sina, x, y;
            rad = angle * Math.PI / 180;
            cosa = Math.cos(rad);
            sina = Math.sin(rad);
            x = this.x * cosa - this.y * sina;
            y = this.x * sina + this.y * cosa;
            return new Point3D(x, y, this.z);
        };

        this.project = function (viewWidth, viewHeight, fov, viewDistance) {
            var factor, x, y;
            factor = fov / (viewDistance + this.z);
            x = this.x * factor + viewWidth / 2;
            y = this.y * factor + viewHeight / 2;
            return new Point3D(x, y, this.z);
        };
    }

    // The actual plugin constructor
    function Plugin(element, options) {
        this.element = element;
        // jQuery has an extend method which merges the contents of two or
        // more objects, storing the result in the first object. The first object
        // is generally empty as we don't want to alter the default options for
        // future instances of the plugin
        this.settings = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;
        this.init();
        //$(document).ready(function() {
        //    $(document).scroll(); // fire the scroll event manually
        //});
        this.update();
    }

    Plugin.prototype = {
        init: function () {
            // Place initialization logic here
            // You already have access to the DOM element and
            // the options via the instance, e.g. this.element and this.settings
            // you can add more functions like the one below and
            // call them like so: this.yourOtherFunction(this.element, this.settings).

            // Define the vertices that compose each of the 6 faces. These numbers are
            // indices to the vertex list defined above.
            this.vertices = [
                new Point3D(-2, 1, -1),
                new Point3D(2, 1, -1),
                new Point3D(2, -1, -1),
                new Point3D(-2, -1, -1),
                new Point3D(-2, 1, 1),
                new Point3D(2, 1, 1),
                new Point3D(2, -1, 1),
                new Point3D(-2, -1, 1)
            ];
            this.faces = [
                [0, 1, 2, 3],
                [1, 5, 6, 2],
                [5, 4, 7, 6],
                [4, 0, 3, 7],
                [0, 4, 5, 1],
                [3, 2, 6, 7]
            ];

            var newCanvas = document.createElement('canvas');
            var canvasStyle = {
                border: 'none',
                background: 'none'
            };
            $(newCanvas).css(canvasStyle);
            if (this.settings.id != "") {
                $(newCanvas).attr('id', this.settings.id);
            }
            $(this.element).append(newCanvas);
            this.canvas = newCanvas;

            var imageO = new Image();
            imageO.src = this.settings.src;
            this.imageObj = imageO;
            this.imageObj.mycanvas = this;
            this.imageObj.onload = function (event) {
                // looks hackish but works [o_0]
                this.mycanvas.setCanvasSizeByImg(this)
            };

            // now bind our update function to the scroll event, so everytime the page is scrolled up/down the box shape is redrawn
            document.addEventListener("scroll", this.update.bind(this), false);

            // add this to $(document).ready() to initiate:
            // $('html, body').animate({scrollTop: 200}, 2000);
        },

        setCanvasSizeByImg: function (img) {
            this.settings.width = img.width * this.settings.boxSizeAdjustment;
            this.settings.height = img.height * this.settings.boxSizeAdjustment;
            this.canvas.width = this.settings.width;
            this.canvas.height = this.settings.height;

            // determine the FOV (field of view) used in projecting the box
            this.settings.fov = (100 + (Math.min(this.settings.width, this.settings.height) * 5)) * this.settings.fovAdjustment;

            // get the ratio of width to height
            var x = this.settings.width / this.settings.height;
            var y = 1
            this.vertices = [
                new Point3D(-1 * x, 1 * y, -1),
                new Point3D(1 * x, 1 * y, -1),
                new Point3D(1 * x, -1 * y, -1),
                new Point3D(-1 * x, -1 * y, -1),
                new Point3D(-1 * x, 1 * y, 1),
                new Point3D(1 * x, 1 * y, 1),
                new Point3D(1 * x, -1 * y, 1),
                new Point3D(-1 * x, -1 * y, 1)
            ];
        },

        update: function () {
            var canvas = this.canvas;
            var ctx = canvas.getContext("2d");
            //ctx.globalCompositeOperation = "darken";
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            var sexy = true;

            // do some math
            var windowCenterY = $(window).height() / 2;
            var canvasCenterY = canvas.getBoundingClientRect().top + (canvas.height / 2);
            var angleX = (canvasCenterY - windowCenterY) * 0.04 * this.settings.xRotationAdjustment;

            // do some more math
            var windowCenterX = $(window).width() / 2;
            var canvasCenterX = canvas.getBoundingClientRect().left + (canvas.width / 2);
            var angleY = (canvasCenterX - windowCenterX) * -0.02 * this.settings.yRotationAdjustment;

            // make the rotations, projections
            var t = new Array();
            for (var i = 0; i < this.vertices.length; i++) {
                var v = this.vertices[i];
                var r = v.rotateX(angleX).rotateY(angleY);
                // for rotating in all 3 dimentions: 
                // var r = v.rotatX(angle).rotateY(angle).rotateZ(angle);
                var p = r.project(this.settings.width, this.settings.height, this.settings.fov, this.settings.viewDistance);
                t.push(p);
            }

            // now draw the box
            ctx.strokeStyle = this.settings.borderColor;
            for (var i = 0; i < this.faces.length; i++) {
                var f = this.faces[i];
                ctx.beginPath();
                ctx.moveTo(t[f[0]].x, t[f[0]].y);
                ctx.lineTo(t[f[1]].x, t[f[1]].y);
                ctx.lineTo(t[f[2]].x, t[f[2]].y);
                ctx.lineTo(t[f[3]].x, t[f[3]].y);
                ctx.closePath();
                ctx.stroke();

                var grd = ctx.createLinearGradient(t[f[3]].x, t[f[3]].y, t[f[3]].x, canvas.height);
                grd.addColorStop(0, this.settings.topGradientColor);
                grd.addColorStop(1, this.settings.bottomGradientColor);
                ctx.fillStyle = grd;
                ctx.fill();
            }

            // and now add the image. put it in the center of the front face
            var cornerX = ((t[this.faces[0][3]].x + t[this.faces[1][0]].x) / 2) - this.imageObj.width / 2;
            var cornerY = ((t[this.faces[0][3]].y + t[this.faces[1][0]].y) / 2) - this.imageObj.height / 2;
            ctx.drawImage(this.imageObj, cornerX, cornerY);
        },
    };

    // A really lightweight plugin wrapper around the constructor,
    // preventing against multiple instantiations
    $.fn[pluginName] = function (options) {
        return this.each(function () {
            if (!$.data(this, "plugin_" + pluginName)) {
                $.data(this, "plugin_" + pluginName, new Plugin(this, options));
            }
        });
    };

})(jQuery, window, document);


 
 