$(function () {
  var pseries = [
    {
    label: 'Men',
    data: [ ['0-4',1302329], ['5-9',1225196], ['10-14',1090872], ['15-19',1158983], ['20-24',1339972], ['25-29',1667557], ['30-34',2072016], ['35-39',2117802], ['40-44',1945472], ['45-49',1746832], ['50-54',1521581], ['55-59',1282107], ['60-64',1173175], ['65-69',990405], ['70-74',800274], ['75-79',732383], ['80-84',477597], ['85-89',241915], ['90-94',69987], ['95-99',15332], ['100+',2060] ]
  },
  {
    label: 'Women',
    data: [ ['0-4',1224757], ['5-9',1129454], ['10-14',1030163], ['15-19',1084773], ['20-24',1220879], ['25-29',1527463], ['30-34',1960767], ['35-39',2043411], ['40-44',1904849], ['45-49',1747880], ['50-54',1551797], ['55-59',1330712], ['60-64',1262386], ['65-69',1107169], ['70-74',980444], ['75-79',994168], ['80-84',764408], ['85-89',475115], ['90-94',171929], ['95-99', 40284], ['100+',5498] ],
    pyramid: {
      direction: 'L'
    }
  }
  ];

  $.plot($('#pyramid'), pseries, {
    series: {
      pyramid: {
        show: true
      },
    },
    xaxis: {
      tickFormatter: function(v) {
        return v == 0 ? v : v/1000 + " K";
      }
    },
    grid: {
        hoverable: true
    }
  });


  function showTooltip(x, y, contents) {
      $('<div id="tooltip">' + contents + "</div>").css({
        position: "absolute",
        display: "none",
        top: y + 5,
        left: x + 5,
        border: "1px solid #fdd",
        padding: "2px",
        "background-color": "#fee",
        opacity: .8
      }).appendTo("body").fadeIn(200);
  }

  var previousPoint = null,
      previousSeries = null;

  $('#pyramid').bind('plothover', function(event, pos, item) {
      $("#x").text(pos.x.toFixed(2));
      $("#y").text(pos.y.toFixed(2));

      if (item) {
          if (previousPoint != item.dataIndex || previousSeries != item.series) {
              previousPoint = item.dataIndex;
              previousSeries = item.series;
              $("#tooltip").remove();
              var data = item.series.data[item.dataIndex];
              var x = data[1];
              var group = item.series.yaxis.ticks[data[0]].label;
              showTooltip(item.pageX, item.pageY, item.series.label + " with age in " + group + " = " + x);
          }
      } else {
          $("#tooltip").remove();
          previousPoint = null;
      }
  });
});
