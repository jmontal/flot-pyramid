//
// This is a plugin for drawing [population pyramids](http://en.wikipedia.org/wiki/Population_pyramid) with
// [flot](http://code.google.com/p/flot/).
//

// Ok, let's wrap everything in a warm, secure closure.
var FlotPyramid = (function(){

  // Some declarations follow:

  // The yaxis tick values will be stored in here.
  var yaxisTicks = [],

  // An object which will be thrown when the data to plot
  // is invalid.
  InvalidData = {
    plugin: 'flot.pyramid',
    msg: 'Invalid series for pyramid plot! The supplied data must have exactly the same labels!'
  },

  // And another one which will be thrown when any of the data series
  // directions specified by the user has a wrong value.
  InvalidDirection = {
    plugin: 'flot.pyramid',
    msg: 'Invalid direction specified for pyramid series. Use \'L\' or \'W\' for left, or \'R\' or \'E\' for right (default is right)'
  }

  // ## Flot plumbing

  // Hooks the pyramid plugin options processor when _flot_ initializes the
  // _plot_.
  function init(plot) {
    plot.hooks.processOptions.push(processOptions);
  }

  // Processes the plot options.
  function processOptions(plot, options) {
    // When the pyramid plugin is active (i.e. shown)
    if (options.series.pyramid && options.series.pyramid.show) {
      // Configure _flot_ options in order to plot the data using _bars_,
      // extending any user defined _bars_ options to get _hotizontal_,
      // _centered_ bars. If the user supplies a custom barWidth, use it.
      $.extend(options.series.bars, {
        show: true,
        horizontal: true,
        align: 'center',
        barWidth: options.series.pyramid.barWidth || 0.6
      });

      var xaxis = options.xaxes[options.series.xaxis - 1 || 0];

      // Configure the custom pyramid X axis tick formatter, preserving the
      // user defined one, if any.
      $.extend(xaxis, {
        tickFormatter: xaxisTickFormatter(xaxis.tickFormatter)
      });

      var yaxis = options.yaxes[options.series.yaxis - 1 || 0];

      // Use custom Y axis ticks.
      $.extend(yaxis, {
        ticks: yaxisTicks
      });

      // Register the pyramid raw data processor...
      plot.hooks.processRawData.push(processRawData);
      // ... and the pyramid data points processor.
      plot.hooks.processDatapoints.push(processDatapoints);
    }
  }

  // Processes the data _as-is_
  function processRawData(plot, series, datapoints) {
    // The pyramid plugin needs to change the data label values, so, in order
    // to preserve the original data, a deep clone is made
    series.data = $.extend(true, [], series.data);
    // Now the Y axis can be fixed using the series data.
    fixYaxis(series.data);
    // And also the X axis.
    fixXaxis(plot.getOptions(), series);
  }

  // Processes the data points generated by _flot_.
  function processDatapoints(plot, series, datapoints) {
    var swapped = [],
      points = datapoints.points,
      // Calculate the _multiplier_ factor given the data plot direction
      // (_left_ or _west_ values must be drawn towards the negative part of
      // the X axis)
      mult = (series.pyramid.direction || 'R').match(/L|W/) ? -1 : 1;

    // For each data point, originally in the form _(X,Y,whatever)_, swap the X
    // and Y axis values, giving the X value the right direction using the
    // previously calculated _multiplier_.
    for(var i = 0, len = points.length; i < len; i += datapoints.format.length) {
      swapped.push(points[i+1] * mult);
      swapped.push(points[i]);
      swapped.push(points[i+2]);
    }

    // Complete the swap!
    datapoints.points = swapped;
  }

  // ## X axis formatting

  // Formats the X axis tick values
  function xaxisTickFormatter(oldFormatter) {
    return function(val, axis) {
      // turning negative values into positive ones.
      val = val < 0 ? -val: val;
      // Returns the formatted (abs) value, optionally formatted through the original
      // user-supplied formatter (that's a formatting party!).
      return oldFormatter ? oldFormatter(val, axis) : val;
    }
  }

  // Fixes the X axis values in the series.
  function fixXaxis(options, series) {
    var max,
        currentMax = options.xaxes[0].max || 0,
        data = series.data,
        values;

    // Check whether the series direction declaration is OK.
    checkSeriesDirection(series);

    // Define a helper function which reduces the given _data_ applying _f_.
    function reduce(data, f) {
      return data.reduce(function(prev, current, index, array) {
        return f(prev, current);
      });
    }

    // Get the maximum value in the series data.
    values = data.map(function(d){return d[1]});
    max = reduce(values, Math.max);

    // Compare the maximum value to the global maximum for the axis.
    // TODO: replace that 0 with the relevant axis index
    options.xaxes[0].max = Math.max(max, currentMax);
    // Set the minimum to _-maximum_ in order to get a symmetrical chart.
    options.xaxes[0].min = -options.xaxes[0].max;
  }

  // Checks the series direction declaration, if present.
  function checkSeriesDirection(series) {
    var direction = series.pyramid.direction;

    // And if, indeed, it is present, and has an unknown value
    if (direction && !direction.match(/L|W|R|E/)) {
      // throw _InvalidDirection_.
      throw(InvalidDirection);
    }
  }

  // ## Y axis formatting

  // Fixes the Y axis values in the data and fixes the Y axis ticks values.
  function fixYaxis(data) {
    // If this is the first series to be processed (and therefore the
    // _yaxisTicks_ array is empty)
    if (yaxisTicks.length == 0) {
      // use it to extract the tick values. All the data labels (which will be
      // used as tick values) in all the plotted series must be exactly the
      // same,
      extractTicks(data);
    } else {
      // so, if the data labels have already been extracted, every other
      // series' data is checked.
      checkTicks(data);
    }

    // Once extracted (or checked) the labels, the data can be rewritten in
    // order to be plotted.
    rewriteTicks(data);
  }

  // Extracts the Y axis ticks given the data to be plotted,
  function extractTicks(data) {
    var i, len;
    for(i = 0, len = data.length; i < len; i += 1) {
      // extracting the data label and building an array in the form _[[1,
      // "0-10"], [2, "10-20"],..., [9, "90+"]]_
      yaxisTicks.push([i, data[i][0]]);
    }
  }

  // Checks whether the given data is "well formed",
  function checkTicks(data) {
    // i.e. it has so many data values as Y axis ticks, and every data value is
    // labeled with a label which is present in the Y axis ticks (labels) array. Wow.
    if (!sameTicksLength(data) || !allTicksPresent(data)) {
      // Oh, if something is wrong with the data, just throw _InvalidData_.
      throw(InvalidData);
    }
  }

  // Checks whether the given data has the same length as the Y axis extracted
  // ticks array.
  function sameTicksLength(data) {
    return yaxisTicks.length == data.length;
  }

  // Checks whether every tick in the Y axis has a corresponding labeled data
  // entry in the _data_ array.
  function allTicksPresent(data) {
    var labels, expected_labels;

    // Get the actual and expected labels
    expected_labels = $.map(yaxisTicks, function(e) { return e[1] });
    labels = $.map(data, function(e) { return e[0] });

    // And compare them.
    return expected_labels.toString() == labels.toString();
  }

  // Rewrites the data label values,
  function rewriteTicks(data) {
    // removing the label and replacing it with the data value ordinal.
    for (var i = 0, len = data.length; i < len; i+= 1) {
      data[i][0] = i;
    }
  }

// ## Wrap it up!

// Expose only the minimum stuff, i.e.
  return {
// The init function...
    init: init,
// And the InvalidDirection and InvalidData "exception" objects...
    InvalidDirection: InvalidDirection,
    InvalidData: InvalidData
  }
}());

// Once the document is ready, add the plugin to the list of available flot
// plugins.
(function ($) {
  $.plot.plugins.push({
      init: FlotPyramid.init,
      name: "pyramid",
      version: "1.0.0"
  });
})(jQuery);
