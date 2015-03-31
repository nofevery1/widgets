(function( nVotingWidget, $, undefined ) {

    // Public methods
    nVotingWidget.renderChart = function(chartDiv, options) {
      var barColors = options.barColors;
      var nScore = options.nScore;
      var nScoreDiv = options.nScoreDiv;
      var isMouseOverBar = false;
      var defaultBarColor = "#777777";

      // django's json formatter returns True as "true", need to convert those string values to bools
      var votingPermissions = _.map(options.votingPermissions, function(item) { return item === "true" });

      var categoryIdentifiers = options.categoryIdentifiers;
      var barBaseLabels = [
                            capitalizeString(options.categoryIdentifiers[0]) + " Score = ", 
                            capitalizeString(options.categoryIdentifiers[1]) + " Score = ", 
                            capitalizeString(options.categoryIdentifiers[2]) + " Score = "
                          ];
      var viewHasBeenRegistered = false;
      var currentIndex = -1;
      setDimensionsOfDiv(chartDiv, options.width, options.height);
      updateNScore(nScore);

      // TODO add configuration items for the below 2 lines instead of hardcoding
      $(nScoreDiv).css("color", "#25AAE1");
      var dim = ($("#n-of-text").height()-5) + "px";
      $("#n-of-image").height(dim).width(dim);

      var c3Chart = c3.generate({
        bindto: chartDiv,
        data: {
          columns: [ //novelty, reproducibility, soundness
            options.categoryScores,
          ],
          axes: {
            scores: "y"
          },
          types: {
            scores: "bar"
          },
          color: function (color, dataItem) {
            return options.barColors[dataItem.index];
          },
          onmouseover: function(dataItem) {
            var bar = getBarContainerAtIndex(dataItem.index);
            $(bar).css("opacity", 1);
            currentIndex = dataItem.index;

            setBarColorsExcept(currentIndex, defaultBarColor);
            setBarColorAtIndex(currentIndex, barColors[currentIndex]);

            // hide any previously shown tooltips associated with other data items
            $(nScoreDiv).parent().css("opacity", options.nScoreDivHiddenOpacity);
            toggleTooltips("all", null, false);

            // show the tooltips for the current bar
            if(votingPermissions[dataItem.index]) {
              enableVotingButtonsForBar(bar);
            } else {
              toggleTooltips("bottom", bar, true);
            }
          },
          onmouseout: function() {
            $(nScoreDiv).parent().css("opacity", 1);
            toggleTooltips("bottom", null, false);
            resetAllBarColors();
          }
        },
        legend: {
          show: false
        },
        tooltip: {
          show: false
        },
        axis: {
          x: {
            type: "categorized",
            show: false
          },
          y: {
            max: 5,
            show: false
          }
        },
        bar: {
          width: {
            ratio: 0.80 // this makes bar width 80% of the tick length (very small gaps between bars)
          }
        },
        onrendered: function() {
          updateNScore(nScore);

          var index = 0;
          var bars = $("g.c3-event-rects").children();
          var currOffset = $(chartDiv).position().left + bars[0].width.baseVal.value / 1.5;

          _.forEach(bars, function(bar) {
            createTooltipsAtIndex(index, currOffset, bar);
            currOffset += bar.width.baseVal.value;
            index++;
          });

          // register a view when the page first finishes loading
          if(!viewHasBeenRegistered) {
            $.ajax({
              url: 'view',
              success: function(data) {
                if(!data.success) {
                  alert("A validation error occurred while loading the chart: " + data.message);
                } else {
                  viewHasBeenRegistered = true;
                }
              },
              error: function() {
                alert("An internal error occurred while loading the chart. Try again in a few minutes.")
                toggleTooltips("top", bar, true);
              }
            });
          }
        }
      });

      $(chartDiv).mouseleave(function(event) {
        var relatedTarget = event.originalEvent.relatedTarget;

        // HACK: due to the way the tooltips are drawn, if a mouseover is triggered on them it's considered a "leave" on the chart div
        // work around this by making sure the mouse was not over the voting buttons when "leaving" the chart div
        if(relatedTarget.className !== "tooltipster-content") {
          toggleTooltips("top", null, false);
        }        
      });

      function enableVotingButtonsForBar(bar) {
        toggleTooltips("all", bar, true);
        $(".vote-polygon").css("fill", options.barColors[currentIndex]);
        $(".tooltipster-content").mouseover(function(event){
          $(nScoreDiv).parent().css("opacity", options.nScoreDivHiddenOpacity);
          toggleTooltips("bottom", bar, true);

          setBarColorsExcept(currentIndex, defaultBarColor);
          setBarColorAtIndex(currentIndex, barColors[currentIndex]);
        });
        $(".tooltipster-content").mouseout(function(event){
          resetAllBarColors();
        });
        $(".upvote").unbind("click");
        $(".upvote").click(function(e) {
          voteClick(currentIndex, true);
        });

        $(".downvote").unbind("click");
        $(".downvote").click(function(e) {
          voteClick(currentIndex, false);
        });
      }

      function createTooltipsAtIndex(index, currOffset, bar) {
        var bottomDiv = document.createElement("div");
        bottomDiv.className = "bottom-div";

        var topDiv = document.createElement("div");
        topDiv.className = "top-div";

        bar.appendChild(bottomDiv);
        bar.appendChild(topDiv);
        var barSVG = getBarSVGAtIndex(index);

        // TODO improve performance by building the SVG like the above
        var voteArrowsSVG = $('<div><svg class="upvote" width="20" height="20">'+
                          '<polygon class="vote-polygon" points="0, 20 10, 0 20, 20" />'+
                        '</svg><span style="position: absolute; margin-left: 5px; margin-top:15px;">Vote</span></div>'+
                        '<div style="padding-top: 5px;"><svg class="downvote" width="20" height="20">'+
                          '<polygon class="vote-polygon" points="0, 0 20, 0 10, 20" />'+
                        '</svg></div>');

        $(topDiv).tooltipster({
          content: $(voteArrowsSVG),
          offsetX: currOffset,
          offsetY: $(chartDiv).height() - barSVG.getBoundingClientRect().height - 61/2,
          interactive: true,
          autoClose: false,
          position: "top",
          theme: "tooltipster-invisible"
        });

        
        $(bottomDiv).tooltipster({
          content: $("<span>" + barBaseLabels[index] + " " + roundNumber(options.categoryScores[index + 1], 2) + "</span>"),
          offsetX: $(chartDiv).position().left + ($(chartDiv).width() / 2), //currOffset
          offsetY: $(chartDiv).position().top + $(chartDiv).height() - 10,
          position: "bottom",
          theme: "tooltipster-invisible"
        });
      }

      function toggleTooltips(location, barDiv, shouldShow) {
        var tooltipBottomDivs = typeof barDiv !== "undefined" ? $(".bottom-div.tooltipstered", barDiv) : $(".bottom-div.tooltipstered");
        var tooltipTopDivs = typeof barDiv !== "undefined" ? $(".top-div.tooltipstered", barDiv) : $(".top-div.tooltipstered");
        var mode = shouldShow ? "show" : "hide";
        if(location === "top" || location === "all") {
          tooltipTopDivs.tooltipster(mode);
        }

        if(location === "bottom" || location === "all") {
          tooltipBottomDivs.tooltipster(mode);
        }
      }

      // Private methods

      function updateNScore(nScore) {

        if(nVotingWidget.nScore === nScore) {
          return;
        }

        nVotingWidget.nScore = nScore;
        var fadeMilliseconds = 250;

        $(options.nScoreDiv).fadeOut(fadeMilliseconds, function() {
          $(this).text(nVotingWidget.nScore).fadeIn(fadeMilliseconds);
        });
      }

      function voteClick(index, isUpvote) {
        var bar = getBarContainerAtIndex(index);
        var voteType = isUpvote ? "upvote" : "downvote";
        var updatedNScore = !_.contains(votingPermissions, false) ? nScore + 1 : nScore;

        votingPermissions[index] = false;
        toggleTooltips("top", bar, false);
        
        $.ajax({
          url: getCategoryNameAtIndex(index) + '/' + voteType,
          success: function(data) {
            if(data.success) {
              reloadChart(index, isUpvote, updatedNScore);
            } else {
              alert("A validation error occurred while voting: " + data.message);
            }
          },
          error: function() {
            alert("An internal error occurred while voting. Try again in a few minutes.");
            toggleTooltips("top", bar, true);
          }
        });
      }

      function setDimensionsOfDiv(div, widthPx, heightPx) {
        $(div).width(widthPx).height(heightPx);
        $("#n-score-container").width(widthPx);
      }

      function setBarColorAtIndex(index, color) {
        var bar = $(getBarSVGAtIndex(index));
        bar.css("fill", color);
      }

      function setBarColorsExcept(index, color) {
        for(var i = 0; i < categoryIdentifiers.length; i++) {
          if(i == index) {
            continue;
          } else {
            setBarColorAtIndex(i, color);
          }
        }
      }

      function resetAllBarColors() {
        for(var i = 0; i < categoryIdentifiers.length; i++) {
          setBarColorAtIndex(i, barColors[i]);
        }
      }

      function getBarContainerAtIndex(index) {
        return $("g.c3-event-rects").children()[index];
      }

      function getBarSVGAtIndex(index) {
        return $("path.c3-bar")[index];
      }

      function getValueAtIndex(chart, index) {
        return chart.data()[0].values[index].value;
      }

      function getCategoryNameAtIndex(index) {
        return categoryIdentifiers[index];
      }

      function reloadChart(index, shouldUpvote, newNScore) {
        if(shouldUpvote) {
          options.upvotes[index]++;
        } else {
          options.downvotes[index]++;
        }

        nScore = newNScore;
        options.categoryScores[index+1] = options.upvotes[index] / options.downvotes[index];

        c3Chart.load({
            columns: [
              options.categoryScores
            ],
            unload: options.categoryScores[0]
        });
      }

      function roundNumber(number, decimalPlaces) {   
        return +(Math.round(number + "e+" + decimalPlaces)  + "e-" + decimalPlaces);
      }

      function capitalizeString(str) {
        return str.charAt(0).toUpperCase() + str.substring(1);
      }
    }
}( window.nVotingWidget = window.nVotingWidget || {}, jQuery ));