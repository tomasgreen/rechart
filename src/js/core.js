/**!
 * # Rechart
 * Author: Tomas Green (http://www.github.com/tomasgreen)
 * License: MIT
 * Version: 0.1.0
 */
(function () {

	'use strict';

	function _removeChildren(el) {
		if (!el) return;
		while (el.firstChild) {
			el.removeChild(el.firstChild);
		}
	}

	function _removeNode(el) {
		if (!el || !el.parentNode) return;
		el.parentNode.removeChild(el);
		return undefined;
	}

	function _createElement(type, attributes, parent) {
		var el;
		if (type.indexOf('.') !== -1) {
			var arr = type.split('.');
			type = arr[0];
			el = document.createElementNS('http://www.w3.org/2000/svg', arr[0]);
			arr.shift();
			el.setAttribute('class', arr.join(' '));
		} else {
			el = document.createElementNS('http://www.w3.org/2000/svg', type);
		}
		for (var i in attributes) el.setAttribute(i, attributes[i]);
		if (parent) parent.appendChild(el);
		return el;
	}

	function _catmullRom2bezier(points, denominator) {
		if (denominator === undefined) denominator = 12;
		var d = [];
		for (var i = 0; i < points.length - 1; i++) {
			var p = [points[i - 1], points[i], points[i + 1], points[i + 2]];
			if (points.length - 2 === i) {
				p[3] = p[2];
			} else if (!i) {
				p[0] = {
					x: +p[1].x,
					y: +p[1].y
				};
			}
			d.push([
				(-p[0].x + denominator * p[1].x + p[2].x) / denominator, (-p[0].y + denominator * p[1].y + p[2].y) / denominator, (p[1].x + denominator * p[2].x - p[3].x) / denominator, (p[1].y + denominator * p[2].y - p[3].y) / denominator,
				p[2].x,
				p[2].y
			]);
		}
		return d;
	}

	function _on(el, events, func, useCapture) {
		if (!el || (el.length === 0 && el != window)) return;
		if (useCapture === undefined) useCapture = false;
		if (el.length) {
			for (var i = 0; i < el.length; i++) {
				_on(el[i], events, func, useCapture);
			}
			return;
		}
		var ev = events.split(' ');
		for (var e in ev) {
			el.addEventListener(ev[e], func, useCapture);
		}
	}

	function _toInt(n) {
		return parseInt(n, 10);
	}

	function _getLargest(dataset) {
		var combined = [];
		for (var i in dataset) {
			combined = combined.concat(dataset[i].data);
		}
		return Math.max.apply(Math, combined);
	}

	function _pointsToCoordinates(points) {
		var arr = [];
		for (var i = 1; i < points.length; i++) {
			arr.push('L' + points[i].x + ',' + points[i].y);
		}
		return arr.join(' ');
	}

	var defaults = {
		minHeight: 0,
		maxHeight: Infinity,
		ratio: undefined,
		keepRatio: true,
		contentOffsetTop: 10,
		contentOffsetRight: 10,
		contentOffsetBottom: 10,
		contentOffsetLeft: 10,
		tooltipOffset: 10,
		tickOffset: 8,
		touchDelay: 300,
		lockScrollOnTouchPress: true,
		textSpacing: 4,
		bezier: false,
		bezierDenominator: 9,
		click: undefined,
		responsive: true,
		reduceData: true,
		labelOutside: false,
		reduceXAxisLabel: true,
		circleRadius: 4,
		circleRadiusHover: 8,

		xAxisGridFollowLabel: false,
		xAxisGridMinDistance: 34,
		xAxisMinDistance: 17,
		xAxisNumerals: true,
		yAxisMinDistance: 30,

		showXAxisLabel: true,
		showXAxisGrid: true,
		showXAxisLine: true,
		showYAxisLabel: true,
		showYAxisGrid: true,
		showYAxisLine: true,

		showBar: false,
		showArea: true,
		showLine: true,
		showCircle: true,
		showTooltip: true,
		showXAxisGuideline: true,

		sizeMedium: 768,
		sizeLarge: 992

	};


	var Rechart = function (data, options) {
		if (!data.element || !data.dataset || !data.xAxis) return;
		var _this = this;
		this.isTouch = 'ontouchstart' in document.documentElement;
		this.opt = {};

		for (var i in defaults) {
			this.opt[i] = (options[i] !== undefined) ? options[i] : defaults[i];
		}

		this.element = data.element;
		this.xAxis = [];
		this.dataset = data.dataset;
		this.largest = _getLargest(this.dataset);
		this.vars = {};
		var xAxisTempEl = _createElement('text.xaxis-tick-text', {
			style: 'visiblility: hidden'
		}, this.element);

		for (i in data.xAxis) {
			this.xAxis[i] = this.createLabel(data.xAxis[i], xAxisTempEl);
		}

		if (this.opt.showBar) {
			if (options.labelOutside === undefined) this.opt.labelOutside = true;
			if (options.xAxisMinDistance === undefined) this.opt.xAxisMinDistance = this.opt.xAxisGridMinDistance;
		}
		if (this.opt.bezier && this.xAxis.length < 3) this.opt.bezier = false;

		if (this.opt.labelOutside) {
			var yAxisTempEl = _createElement('text.yaxis-tick-text', {
				style: 'visiblility: hidden'
			}, this.element);
			yAxisTempEl.textContent = this.yAxisText(this.orderOfMagnitude()) + this.opt.textSpacing;
			if (this.opt.showXAxisLabel) this.opt.contentOffsetLeft += yAxisTempEl.clientWidth;
			if (this.opt.showYAxisLabel) this.opt.contentOffsetBottom = xAxisTempEl.clientHeight;
			_removeNode(yAxisTempEl);
		}

		_removeNode(xAxisTempEl);

		this.xAxisCount = this.xAxis.length;

		if (this.opt.ratio === undefined) {
			this.opt.ratio = this.element.clientHeight / this.element.clientWidth;
			if (isNaN(this.opt.ratio)) {
				this.opt.ratio = this.element.getAttribute('height') / this.element.getAttribute('width');
			}
		}

		for (var d in this.dataset) {
			if (!this.dataset[d].color) continue;

			if (!this.dataset[d].circleClass) this.dataset[d].circleClass = 'fill-' + this.dataset[d].color;
			if (!this.dataset[d].barClass) this.dataset[d].barClass = 'fill-' + this.dataset[d].color;
			if (!this.dataset[d].lineClass) this.dataset[d].lineClass = 'stroke-' + this.dataset[d].color;
			if (!this.dataset[d].tooltipClass) this.dataset[d].tooltipClass = 'bg-' + this.dataset[d].color;
			if (!this.dataset[d].pathClass) this.dataset[d].pathClass = 'fill-' + this.dataset[d].color;
		}

		_on(this.element.parentNode, 'touchmove mousemove', function (ev) {
			if (!_this.isTouch || _this.isHovering) _this.move(ev);
		});

		_on(this.element.parentNode, 'touchend mouseleave', function (ev) {
			setTimeout(function () {
				_this.isHovering = false;
				_this.isPressing = false;
				_this.leave(ev);
				if (_this.hoverTimeout) clearTimeout(_this.hoverTimeout);
			}, _this.isTouch ? 10 : 0);
		});

		_on(this.element.parentNode, 'touchstart mouseenter', function (ev) {
			_this.isPressing = true;
			_this.hoverTimeout = setTimeout(function () {
				if (!_this.isPressing) return;
				_this.isHovering = true;
				_this.move(ev);
			}, _this.isTouch ? _this.opt.touchDelay : 0);
		});

		_on(this.element.parentNode, 'click', function (ev) {
			_this.click(ev);
		});

		_on(document, 'touchmove', function (e) {
			if (_this.isHovering && _this.opt.lockScrollOnTouchPress) e.preventDefault();
		});

		_on(window, 'resize', function () {
			if (_this.opt.responsive) _this.draw();
		});

		_on(window, 'orientationchange', function () {
			var t = document.querySelectorAll('div.rechart-tooltip');
			for (var i in t) _removeNode(t[i]);
			_this.elements.tooltip = undefined;
		});

		this.draw();
	};


	Rechart.prototype.draw = function (force) {
		if (!this.prepare(force)) return;

		this.elements.gridGroup = _createElement('g', {
			transform: 'translate(0.5,0.5)'
		}, this.element);

		if (this.opt.showXAxisGrid) this.drawXAxisGrid();
		if (this.opt.showYAxisGrid) this.drawYAxisGrid();
		if (this.opt.showXAxisLabel) {
			this.drawXAxisGridTick(this.opt.showBar);
		}

		if (this.opt.showYAxisLabel) this.drawYAxisGridTick();
		if (this.opt.showXAxisLine) this.drawXAxisLine();
		if (this.opt.showYAxisLine) this.drawYAxisLine();

		this.elements.dataGroup = _createElement('g', null, this.element);

		if (this.opt.showBar) this.drawBar();
		if (this.opt.showArea) this.drawArea();
		if (this.opt.showLine) this.drawLine();
		if (this.opt.showCircle) this.drawCircle();
	};


	Rechart.prototype.prepare = function (force) {
		var R = {
			elementWidth: 0,
			elementHeight: 0,
			containerWidth: this.element.parentNode.clientWidth,
			chartWidth: 0,
			chartHeight: 0,
			xAxisVisibleCount: this.xAxisCount,
			xAxisVisibleCountStart: 0,
			xAxisVisibleLabelMod: 1,
			xAxisGridMod: 1,
			xAxisPadding: 0,
			yAxisInterval: 0,
			yAxisPadding: 0,
			yAxisScale: 0,
			yAxisVisibleCount: 0
		};
		this.elementBoundingRect = undefined;

		if (!force && this.opt.responsive && (this.previousContainerWidth == R.containerWidth || isNaN(R.containerWidth) || R.containerWidth < 1)) {
			return false;
		}

		_removeChildren(this.element);

		this.vars = R;
		this.elements = {};
		this.previousContainerWidth = R.containerWidth;

		if (this.opt.responsive) {
			R.elementWidth = this.previousContainerWidth;
			this.element.setAttribute('width', R.elementWidth);
			if (this.opt.keepRatio) {
				var newHeight = _toInt(R.elementWidth * this.opt.ratio);
				if (newHeight >= this.opt.minHeight && newHeight <= this.opt.maxHeight) {
					R.elementHeight = newHeight;
				} else if (newHeight > this.opt.maxHeight) {
					R.elementHeight = this.opt.maxHeight;
				} else if (newHeight < this.opt.minHeight) {
					R.elementHeight = this.opt.minHeight;
				}
				this.element.setAttribute('height', R.elementHeight);
			} else {
				R.elementHeight = this.element.clientHeight;
			}
		} else {
			R.elementWidth = this.element.clientWidth;
			R.elementHeight = this.element.clientHeight;
		}


		R.chartWidth = R.elementWidth - this.opt.contentOffsetLeft - this.opt.contentOffsetRight;
		R.chartHeight = R.elementHeight - this.opt.contentOffsetTop - this.opt.contentOffsetBottom;


		if (this.opt.reduceData && _toInt(R.chartWidth / this.opt.xAxisMinDistance) < this.xAxisCount) {
			R.xAxisVisibleCount = _toInt(R.chartWidth / this.opt.xAxisMinDistance);
			R.xAxisVisibleCountStart = (this.xAxisCount - R.xAxisVisibleCount);
		}

		if (this.opt.showXAxisLabel && this.opt.reduceXAxisLabel) {
			var xAxisLabelWidth = 0;
			for (var b in this.xAxis) {
				xAxisLabelWidth += this.xAxis[b].getWidth();
			}
			var xAxisLabelModTemp = _toInt(R.xAxisVisibleCount / (R.chartWidth / (xAxisLabelWidth / this.xAxisCount))) + 1;
			if (xAxisLabelModTemp > 1) {
				R.xAxisVisibleLabelMod = xAxisLabelModTemp;
			}
		}


		var gridMod = _toInt(R.xAxisVisibleCount / (R.chartWidth / this.opt.xAxisGridMinDistance)) + 1;
		if (gridMod > 1) {
			R.xAxisGridMod = gridMod;
		}

		R.xAxisPadding = R.chartWidth / (R.xAxisVisibleCount - (this.opt.showBar ? 0 : 1));
		R.yAxisVisibleCount = (_toInt(R.chartHeight / this.opt.yAxisMinDistance));
		R.yAxisPadding = R.chartHeight / R.yAxisVisibleCount;
		R.yAxisInterval = this.orderOfMagnitude() / R.yAxisVisibleCount;
		R.yAxisScale = R.chartHeight / (R.yAxisInterval * R.yAxisVisibleCount);
		return true;
	};

	Rechart.prototype.drawLine = function () {
		this.drawPath(false);
	};

	Rechart.prototype.drawArea = function () {
		this.drawPath(true);
	};

	Rechart.prototype.drawBar = function () {
		this.elements.bars = [];
		var w = _toInt((this.vars.xAxisPadding / this.dataset.length) * 0.8);
		if (w < 1) w = 1;
		var rectPadd = _toInt((this.vars.xAxisPadding - w * this.dataset.length) / 2);
		for (var d = 0; d < this.dataset.length; d++) {
			this.elements.bars[d] = [];
			var data = this.dataset[d];
			for (var i = this.vars.xAxisVisibleCountStart; i < this.xAxisCount; i++) {
				var x = 1 + w * d + this.opt.contentOffsetLeft + this.vars.xAxisPadding * (i - this.vars.xAxisVisibleCountStart);
				var y = this.opt.contentOffsetTop + this.vars.chartHeight - data.data[i] * this.vars.yAxisScale;
				var h = this.vars.chartHeight - y + this.opt.contentOffsetTop;
				this.elements.bars[d][i] = _createElement('rect', {
					class: 'bar ' + data.circleClass,
					x: x + rectPadd - 1,
					y: y - 1,
					width: w,
					height: h
				}, this.elements.dataGroup);
			}
		}
	};

	Rechart.prototype.drawPath = function (withArea) {
		for (var d = 0; d < this.dataset.length; d++) {
			var data = this.dataset[d];
			var points = [];
			var cls = withArea ? 'area ' + data.pathClass : 'line ' + data.lineClass;
			var svgPathString = 'M';
			for (var i = this.vars.xAxisVisibleCountStart; i < this.xAxisCount; i++) {
				points.push({
					x: this.opt.contentOffsetLeft + this.vars.xAxisPadding * (i - this.vars.xAxisVisibleCountStart),
					y: this.opt.contentOffsetTop + this.vars.chartHeight - data.data[i] * this.vars.yAxisScale
				});
			}
			if (withArea) svgPathString += this.opt.contentOffsetLeft + ',' + (this.vars.chartHeight + this.opt.contentOffsetTop) + ' ';
			svgPathString += points[0].x + ',' + points[0].y + ' ';
			if (this.opt.bezier) {
				var cr = _catmullRom2bezier(points, this.opt.bezierDenominator);
				for (var k = 0; k < cr.length; k++) {
					svgPathString += 'C' + cr[k].join();
				}
			} else {
				svgPathString += _pointsToCoordinates(points);
			}
			if (withArea) svgPathString += ' L' + (this.vars.chartWidth + this.opt.contentOffsetLeft) + ',' + (this.vars.chartHeight + this.opt.contentOffsetTop) + ' Z';
			var path = _createElement('path', {
				class: cls
			}, this.elements.dataGroup);
			path.setAttribute('d', svgPathString);
		}
	};

	Rechart.prototype.drawCircle = function () {
		this.elements.circles = [];
		for (var d = 0; d < this.dataset.length; d++) {
			this.elements.circles[d] = [];
			var data = this.dataset[d];
			for (var i = this.vars.xAxisVisibleCountStart; i < this.xAxisCount; i++) {
				var x = this.opt.contentOffsetLeft + this.vars.xAxisPadding * (i - this.vars.xAxisVisibleCountStart);
				var y = this.opt.contentOffsetTop + this.vars.chartHeight - data.data[i] * this.vars.yAxisScale;
				this.elements.circles[d][i] = _createElement('circle', {
					class: 'circle ' + data.circleClass,
					r: this.opt.circleRadius,
					cx: x,
					cy: y
				}, this.elements.dataGroup);
			}
		}
	};

	Rechart.prototype.drawXAxisGrid = function () {
		var _this = this;
		var drawLine = function (x) {
			_createElement('line.xaxis-grid', {
				x1: x,
				y1: 0,
				x2: x,
				y2: _this.vars.elementHeight
			}, _this.elements.gridGroup);
		};
		for (var i = 0; i <= this.vars.xAxisVisibleCount; i++) {
			if (this.opt.xAxisGridFollowLabel && i % this.vars.xAxisVisibleLabelMod !== 0) continue;
			if (i % this.vars.xAxisGridMod !== 0) continue;
			drawLine(_toInt(this.opt.contentOffsetLeft + i * this.vars.xAxisPadding));

		}
	};

	Rechart.prototype.drawYAxisGrid = function () {
		for (var i = 0; i < this.vars.yAxisVisibleCount; i++) {
			var y = _toInt(this.opt.contentOffsetTop + i * this.vars.yAxisPadding);
			_createElement('line.yaxis-grid', {
				x1: (this.opt.labelOutside ? this.opt.contentOffsetLeft : 0),
				y1: y,
				x2: this.vars.elementWidth,
				y2: y
			}, this.elements.gridGroup);
		}
	};

	Rechart.prototype.drawYAxisLine = function () {
		_createElement('line.xaxis-line', {
			x1: this.opt.contentOffsetLeft,
			y1: 0,
			x2: this.opt.contentOffsetLeft,
			y2: this.vars.elementHeight
		}, this.elements.gridGroup);
	};

	Rechart.prototype.drawXAxisLine = function () {
		var y = _toInt(this.opt.contentOffsetTop + this.vars.yAxisVisibleCount * this.vars.yAxisPadding) - 1;
		_createElement('line.yaxis-line', {
			x1: 0,
			y1: y,
			x2: this.vars.elementWidth,
			y2: y
		}, this.elements.gridGroup);
	};

	Rechart.prototype.drawXAxisGridTick = function (leftAlign) {
		var s = leftAlign ? 0 : 1;
		var e = leftAlign ? 1 : 0;
		for (var i = s; i < this.vars.xAxisVisibleCount - e; i++) {
			if (i % this.vars.xAxisVisibleLabelMod !== 0) continue;
			var x = _toInt(this.opt.contentOffsetLeft + i * this.vars.xAxisPadding);
			var lineY1 = this.vars.elementHeight - this.opt.contentOffsetBottom;
			var lineY2 = this.vars.elementHeight - this.opt.contentOffsetBottom;
			var textY = this.vars.elementHeight - this.opt.contentOffsetBottom;

			if (this.opt.labelOutside) {
				lineY2 += this.opt.tickOffset;
				textY = lineY2 + this.opt.tickOffset + this.opt.textSpacing;
			} else {
				lineY1 -= this.opt.tickOffset;
				textY -= this.opt.tickOffset + this.opt.textSpacing;
			}
			if (leftAlign) {
				var text = _createElement('text.xaxis-tick-text', {
					x: x + (this.vars.xAxisPadding / 2),
					y: textY - this.opt.tickOffset
				}, this.elements.gridGroup);
				text.textContent = this.xAxis[i + this.vars.xAxisVisibleCountStart].getValue();
			} else {
				_createElement('line.xaxis-tick', {
					x1: x,
					y1: lineY1,
					x2: x,
					y2: lineY2
				}, this.elements.gridGroup);
				var text = _createElement('text.xaxis-tick-text', {
					x: x,
					y: textY
				}, this.elements.gridGroup);
				text.textContent = this.xAxis[i + this.vars.xAxisVisibleCountStart].getValue();
			}
		}
	};

	Rechart.prototype.drawYAxisGridTick = function () {
		for (var i = 0; i < this.vars.yAxisVisibleCount; i++) {
			var y = _toInt(this.opt.contentOffsetTop + i * this.vars.yAxisPadding),
				lineX1 = this.opt.contentOffsetLeft,
				textX, lineX2;
			if (this.opt.labelOutside) {
				lineX2 = this.opt.contentOffsetLeft - this.opt.tickOffset;
				textX = lineX1 - this.opt.textSpacing - this.opt.tickOffset;
			} else {
				lineX2 = this.opt.contentOffsetLeft + this.opt.tickOffset;
				textX = this.opt.contentOffsetLeft + this.opt.tickOffset + this.opt.textSpacing;
			}
			_createElement('line.yaxis-tick', {
				x1: lineX1,
				y1: y,
				x2: lineX2,
				y2: y,
			}, this.elements.gridGroup);
			var text = _createElement('text.yaxis-tick-text', {
				x: textX,
				y: y + this.opt.textSpacing
			}, this.elements.gridGroup);
			text.textContent = this.yAxisText(this.vars.yAxisInterval * (this.vars.yAxisVisibleCount - i));
			if (this.opt.labelOutside) text.setAttribute('x', textX - text.clientWidth);
		}
	};

	Rechart.prototype.move = function (ev) {
		if (!this.elementBoundingRect) this.elementBoundingRect = this.element.getBoundingClientRect();
		var dataIndex = this.dataIndexFromEvent(ev);
		if (dataIndex >= this.xAxisCount || dataIndex < 0) return;
		if (this.vars.lastDataIndex != dataIndex) {
			if (this.opt.showXAxisGuideline) {
				this.removeXAxisGuideline();
				this.drawXAxisGuideline(dataIndex);
			}
			if (this.opt.showTooltip) {
				this.drawTooltip(dataIndex);
				this.positionTooltip(ev, dataIndex);
			}
			this.vars.lastDataIndex = dataIndex;
		}
	};

	Rechart.prototype.leave = function () {
		if (this.opt.showXAxisGuideline) this.removeXAxisGuideline();
		if (this.elements.tooltip) {
			this.elements.tooltip = _removeNode(this.elements.tooltip);
		}
		this.vars.lastDataIndex = undefined;
	};

	Rechart.prototype.click = function (ev) {
		if (!this.opt.click) return;
		var dataIndex = this.dataIndexFromEvent(ev);
		if (dataIndex >= this.xAxisCount || dataIndex < 0) return;
		var arr = [];
		for (var i in this.dataset) {
			arr.push({
				data: this.dataset[i].data[dataIndex],
				color: this.dataset[i].color,
				label: this.dataset[i].label
			});
		}
		this.opt.click(this.xAxis[dataIndex], arr, dataIndex);
	};

	Rechart.prototype.drawXAxisGuideline = function (dataIndex) {
		if (!this.opt.showXAxisGuideline) return;
		var x1x2 = _toInt(this.opt.contentOffsetLeft + this.vars.xAxisPadding * (dataIndex - this.vars.xAxisVisibleCountStart));
		if (!this.elements.guidelineGroup) {
			this.elements.guidelineGroup = _createElement('g', {
				transform: 'translate(0.5,0.5)'
			});
			this.element.insertBefore(this.elements.guidelineGroup, this.elements.dataGroup);

			_createElement('line.xaxis-guideline', {
				x1: x1x2,
				y1: 0,
				x2: x1x2,
				y2: this.vars.elementHeight
			}, this.elements.guidelineGroup);
			if (this.opt.showBar) {
				_createElement('line.xaxis-guideline', {
					x1: x1x2 + _toInt(this.vars.xAxisPadding),
					y1: 0,
					x2: x1x2 + _toInt(this.vars.xAxisPadding),
					y2: this.vars.elementHeight
				}, this.elements.guidelineGroup);
			}
		} else {
			var line = this.elements.guidelineGroup.firstChild;
			line.setAttribute('x1', x1x2);
			line.setAttribute('x2', x1x2);
		}
		if (this.opt.showCircle) {
			for (var j = 0; j < this.elements.circles.length; j++) {
				var circle = this.elements.circles[j][dataIndex];
				if (circle) circle.setAttribute('r', this.opt.circleRadiusHover);
			}
		}
	};

	Rechart.prototype.removeXAxisGuideline = function () {
		if (!this.opt.showXAxisGuideline || this.vars.lastDataIndex === undefined) return;
		if (this.elements.guidelineGroup) {
			this.elements.guidelineGroup = _removeNode(this.elements.guidelineGroup);
		}
		if (this.opt.showCircle) {
			for (var j = 0; j < this.elements.circles.length; j++) {
				var circle = this.elements.circles[j][this.vars.lastDataIndex];
				if (circle) circle.setAttribute('r', this.opt.circleRadius);
			}
		}
	};

	Rechart.prototype.dataIndexFromEvent = function (ev) {
		var d = (this.opt.showBar) ? 0 : (this.vars.xAxisPadding / 2);
		var x = ev.pageX - this.elementBoundingRect.left, //this.isTouch ? ev.layerX : ev.offsetX,
			start = _toInt(this.opt.contentOffsetLeft - d),
			end = _toInt(this.vars.chartWidth + d + this.opt.contentOffsetRight);
		if (x < start) return this.vars.xAxisVisibleCountStart;
		if (x > end) return this.xAxisCount - 1;
		return this.vars.xAxisVisibleCountStart + _toInt((x - start) / this.vars.xAxisPadding);
	};

	Rechart.prototype.drawTooltip = function (dataIndex) {
		var html = '<div class="yaxis-label">' + this.xAxis[dataIndex].tooltip + '</div>';
		for (var j = 0; j < this.dataset.length; j++) {
			html += '<div class="data-wrapper">';
			html += '<div class="data-color ' + this.dataset[j].tooltipClass + '"></div>';
			html += '<div class="data-label">' + this.dataset[j].label + ' </div>';
			html += '<div class="data-value">' + this.dataset[j].data[dataIndex] + '</div>';
			html += '</div>';
		}
		if (!this.elements.tooltip) {
			this.elements.tooltip = document.createElement('div');
			this.elements.tooltip.setAttribute('class', 'rechart-tooltip');
			this.element.parentNode.insertBefore(this.elements.tooltip, this.element.parentNode.firstChild);
		}
		this.elements.tooltip.innerHTML = html;
		this.vars.tooltipWidth = this.elements.tooltip.clientWidth;
	};

	Rechart.prototype.positionTooltip = function (ev, dataIndex) {
		if (!this.elements.tooltip) return;
		var x = (dataIndex - this.vars.xAxisVisibleCountStart) * this.vars.xAxisPadding + this.opt.contentOffsetLeft;
		if (x + this.vars.tooltipWidth + this.opt.tooltipOffset + (this.opt.showBar ? this.vars.xAxisPadding : 0) > this.vars.chartWidth) {
			x -= (this.vars.tooltipWidth + this.opt.tooltipOffset);
			if (x < 0) {
				x = this.opt.contentOffsetLeft;
			}
		} else {
			x += this.opt.tooltipOffset + (this.opt.showBar ? this.vars.xAxisPadding : 0);
		}
		this.elements.tooltip.setAttribute('style', 'top: 0px; left:' + x + 'px');
	};

	Rechart.prototype.orderOfMagnitude = function () {
		// var unroundedTickSize = this.largest / (lines - 1);
		// var x = Math.ceil((Math.log(unroundedTickSize) / Math.LN10) - 2);
		// var pow10x = Math.pow(10, x);
		// return Math.ceil(unroundedTickSize / pow10x) * pow10x;
		var len = _toInt(this.largest).toString().length - 2;
		var rounded = Math.ceil(this.largest / Math.pow(10, len)) * Math.pow(10, len);
		return (rounded === 0) ? 1 : rounded;
	};

	Rechart.prototype.yAxisText = function (val) {
		var numeral = '';
		if (this.opt.xAxisNumerals) {
			if (val > 1000000) {
				val = val / 1000000;
				numeral = 'm';
			} else if (val > 1000) {
				val = val / 1000;
				numeral = 'k';
			}
		}
		return ((val < 1) ? val.toFixed(1) : _toInt(val)) + numeral;
	};

	Rechart.prototype.createLabel = function (obj, el) {
		var _this = this;
		var l = JSON.parse(JSON.stringify(obj));
		if (l.mw === undefined && l.medium) {
			el.textContent = l.medium;
			l.mw = el.clientWidth + this.opt.textSpacing;
		}
		if (l.sw === undefined && l.small) {
			el.textContent = l.small;
			l.sw = el.clientWidth + this.opt.textSpacing;
		}
		if (l.lw === undefined && l.large) {
			el.textContent = l.large;
			l.lw = el.clientWidth + this.opt.textSpacing;
		}

		l.getValue = function () {
			if (l.large && _this.vars.chartWidth >= _this.opt.sizeLarge) return l.large;
			if (l.medium && _this.vars.chartWidth >= _this.opt.sizeMedium) return l.medium;
			return l.small;
		};
		l.getWidth = function () {
			if (l.large && _this.vars.chartWidth >= _this.opt.sizeLarge) return l.lw;
			if (l.medium && _this.vars.chartWidth >= _this.opt.sizeMedium) return l.mw;
			return l.sw;
		};
		if (l.tooltip === undefined) {
			l.tooltip = l.getValue();
		}
		return l;
	};
	this.rechart = function (data, options) {
		return new Rechart(data, options);
	};
	this.rechart.globals = defaults;

}).call(this);