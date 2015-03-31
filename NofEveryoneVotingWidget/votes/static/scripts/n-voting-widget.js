(function( nVotingWidget, $, undefined ) {

    // Public methods
	
	/*
	* renderChart
	* params: chartDiv - a jQuery-friendly div id i.e. #chartDiv, options - object containing various configuration options.
	*
	*  Examples for all current configuration options:
	*  width: 200,
    *  height: 200,
    *  categoryScores: [1, 2, 3],
    *  categoryIdentifiers: ["soundness","novelty","reproducibility"],
    *  nScore: 2,
    *  nScoreDiv: "#n-score",
    *  nScoreDivHiddenOpacity: 0.1, //  10% opacity when n score is hidden
    *  upvotes: [1, 2, 3],
    *  downvotes: [4, 5, 6],
    *  barColors: ["gold", "#CF5300", "brown"],
    *  votingPermissions: ["true", "false", "true"]
	*/
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
      $(nScoreDiv).css("color", "#25AAE1"); // set the color of the N score to blue
      var textHeight = ($("#n-of-text").height()-5) + "px";
      $("#n-of-image").height(textHeight).width(textHeight);

	  /* 
	  * See http://c3js.org/reference.html in order to understand what the various parameters passed to generate() do.
	  */
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

		  // For each bar that was drawn by c3, we need to generate tooltips that will be shown when the user hovers over a bar (these contain the voting arrows)
          _.forEach(bars, function(bar) {
            createTooltipsAtIndex(index, currOffset, bar);
            currOffset += bar.width.baseVal.value;
            index++;
          });

          // register a view when the page first finishes loading
          if(!viewHasBeenRegistered) {
            $.ajax({
              url: 'view', // TODO: need to specify list of URLs as a parameter to this function so that this can work cross-domain
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

	  // register mouseleave event for when the mouse leaves the chart
      $(chartDiv).mouseleave(function(event) {
        var relatedTarget = event.originalEvent.relatedTarget;

        // HACK: due to the way the tooltips are drawn, if a mouseover is triggered on them it's considered a "leave" on the chart div
        // work around this by making sure the mouse was not over the voting buttons when "leaving" the chart div
        if(relatedTarget.className !== "tooltipster-content") {
          toggleTooltips("top", null, false); // turn off all the tooltips on the top
        }        
      });

	  
	  // Private methods
	  
	  /*
	   * enableVotingButtonsForBar
	   * params: bar - jQuery object representing a bar with the css class c3-event-rect
	   * 
	   * Shows the voting buttons above the given bar, binds the appropriate click events to the upvote and downvote arrows, and grays out all the other bars
	   */
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
	  
	  /*
	   * createTooltipsAtIndex
	   * params: index - either 0, 1, or 2 for the left, center, or right bar respectively.
	   *		 currOffset - calculated offset used to determine where the current bar should be placed in the coordinate plane
	   *         bar - jQuery object representing the bar at the given index with the css class c3-event-rect
	   *
	   * Creates the divs which the voting arrows sit in for the current bar. Also registers the tooltipster plugin for the bar at the given index.
	   */
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
	  
	  /*
	   * toggleTooltips
	   * params: location - either "top" to only show top tooltips for the given bar, "bottom" to only show bottom tooltips, or "all" to show both top and bottom tooltips
	   *		 barDiv - jQuery object representing the bar
	   *         shouldShow - if true, show the tooltips, otherwise hide the tooltips.
	   *
	   * Toggles voting tooltips and/or category scores for the given bar
	   */
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

	  /*
	   * updateNScore
	   * params: nScore - the new score to update the div with
	   *
	   * Updates the N score near the bottom of the chart, fading the new score in.
	   */
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

	  /*
	   * voteClick
	   * params: index - 0, 1, or 2 for the left, center, or right bar respectively
	   * 	     isUpvote - true if the upvote button handler should be triggered, otherwise the downvote button handler will be called
	   *
	   * Determines which voting button was clicked at the given index, and then sends an AJAX request in order to save the vote in the database. Displays errors if any were encountered.
	   */
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

	  /*
	   * setDimensionsOfDiv
	   * params: div - jQuery friendly div, widthPx - number of pixels for the width of the chart, heightPx - number of pixels for the height of the chart
	   *
	   * Sets the main chart and container for the N score to the same given width, and sets the main chart height to the given height.
	   */
      function setDimensionsOfDiv(div, widthPx, heightPx) {
        $(div).width(widthPx).height(heightPx);
        $("#n-score-container").width(widthPx);
      }

	  /*
	   * setBarColorAtIndex
	   * params: index - 0, 1, or 2 for the left, center, or right bar respectively
	   *		 color - hex or natural (i.e. "red", "blue", "green", etc.) color that should be used as the new color for the bar at the given index.
	   *
	   * Sets the given bar to the given color
	   */
      function setBarColorAtIndex(index, color) {
        var bar = $(getBarSVGAtIndex(index));
        bar.css("fill", color);
      }

	  /*
	   * setBarColorsExcept
	   * params: index - 0, 1, or 2 to exclude the left, center, or right bar respectively
	   *		 color - hex or natural (i.e. "red", "blue", "green", etc.) color that should be used as the new color for the bar at the given index.
	   *
	   * Sets all of the bars except the bar at the given index to a given color. Used to gray out all of the bars except the current bar.
	   */
      function setBarColorsExcept(index, color) {
        for(var i = 0; i < categoryIdentifiers.length; i++) {
          if(i == index) {
            continue;
          } else {
            setBarColorAtIndex(i, color);
          }
        }
      }

	  /*
	  * resetAllBarColors
	  * Resets all bars to the default colors defined in the initializer.
	  */
      function resetAllBarColors() {
        for(var i = 0; i < categoryIdentifiers.length; i++) {
          setBarColorAtIndex(i, barColors[i]);
        }
      }

	 /*
	  * getBarContainerAtIndex
	  * params: index - 0, 1, or 2 for the left, center, or right bar respectively
	  * Returns the container for the current bar. Used when properties for the current bar need to be set i.e. opacity
	  */
      function getBarContainerAtIndex(index) {
        return $("g.c3-event-rects").children()[index];
      }

	 /*
	  * getBarSVGAtIndex
	  * params: index - 0, 1, or 2 for the left, center, or right bar respectively
	  * Returns the current bar's raw path (HTML5 canvas) element. Used as a point of reference to place tooltips.
	  */
      function getBarSVGAtIndex(index) {
        return $("path.c3-bar")[index];
      }

	 /*
	  * getValueAtIndex
	  * params: chart - the c3.js chart object, index - 0, 1, or 2 for the left, center, or right bar respectively
	  * Returns the current bar's value i.e. in this case, ratio of upvotes to downvotes
	  */
      function getValueAtIndex(chart, index) {
        return chart.data()[0].values[index].value;
      }

	 /*
	  * getCategoryNameAtIndex
	  * params: index - 0, 1, or 2 for the left, center, or right bar respectively
	  * Returns the current bar's category name i.e. reproducibility, novelty, soundness
	  */
      function getCategoryNameAtIndex(index) {
        return categoryIdentifiers[index];
      }

	 /*
	  * getCategoryNameAtIndex
	  * params: index - 0, 1, or 2 for the left, center, or right bar respectively; shouldUpvote - true if an upvote action was executed successfully and the chart needs to be updated; newNScore - the new N Score to update the chart with, if any
	  *
	  * Recalculates the category scores, n score, and number of upvotes/downvotes for the bar at the given index, and then forces the chart to redraw to reflect the changes
	  */
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

	  // Utility functions TODO: move these into a helper class
	  
	  // rounds number (double) to the given number of decimal places (int)
      function roundNumber(number, decimalPlaces) {   
        return +(Math.round(number + "e+" + decimalPlaces)  + "e-" + decimalPlaces);
      }

	  // capitalizes the first letter in str
      function capitalizeString(str) {
        return str.charAt(0).toUpperCase() + str.substring(1);
      }
    }
}( window.nVotingWidget = window.nVotingWidget || {}, jQuery ));