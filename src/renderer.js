// Vex Flow
// Mohit Muthanna <mohit@muthanna.com>
//
// Support for different rendering contexts: Canvas, Raphael
//
// Copyright Mohit Cheppudira 2010

/** @constructor */
Vex.Flow.Renderer = function(sel, backend) {
  if (arguments.length > 0) this.init(sel, backend)
}

Vex.Flow.Renderer.Backends = {
  CANVAS: 1,
  RAPHAEL: 2,
  SVG: 3,
  VML: 4
}

Vex.Flow.Renderer.buildContext = function(sel, backend, width, height) {
  var renderer = new Vex.Flow.Renderer(sel, backend);
  if (width && height) { renderer.resize(width, height); }
  return renderer.getContext();
}

Vex.Flow.Renderer.getCanvasContext = function(sel, width, height) {
  return Vex.Flow.Renderer.buildContext(sel,
      Vex.Flow.Renderer.Backends.CANVAS,
      width, height);
}

Vex.Flow.Renderer.getRaphaelContext = function(sel, width, height) {
  return Vex.Flow.Renderer.buildContext(sel,
      Vex.Flow.Renderer.Backends.RAPHAEL,
      width, height);
}

Vex.Flow.Renderer.bolsterCanvasContext = function(ctx) {
  ctx.clear = function() {
    // TODO: get real widht and height of context.
    ctx.clearRect(0, 0, 2000,2000);
  }
  ctx.setFont = function(family, size, weight) {
    this.font = (weight || "") + " " + size + "pt " + family;
    return this;
  }
  ctx.setFillStyle = function(style) {
    this.fillStyle = style;
    return this;
  }
  ctx.setStrokeStyle = function(style) {
    this.strokeStyle = style;
    return this;
  }
  return ctx;
}

Vex.Flow.Renderer.prototype.init = function(sel, backend) {
  // Verify selector
  this.sel = sel;
  if (!this.sel) throw new Vex.RERR("BadArgument",
      "Invalid selector for renderer.");

  // Get element from selector
  this.element = document.getElementById(sel);
  if (!this.element) this.element = sel;

  // Verify backend and create context
  this.ctx = null;
  this.paper = null;
  this.backend = backend;
  if (this.backend == Vex.Flow.Renderer.Backends.CANVAS) {
    // Create context.
    if (!this.element.getContext) throw new Vex.RERR("BadElement",
      "Can't get canvas context from element: " + sel);
    this.ctx = Vex.Flow.Renderer.bolsterCanvasContext(
        this.element.getContext('2d'));
  } else if (this.backend == Vex.Flow.Renderer.Backends.RAPHAEL) {
    this.ctx = new Vex.Flow.RaphaelContext(this.element);
  } else {
    throw new Vex.RERR("InvalidBackend",
      "No support for backend: " + this.backend);
  }
}

Vex.Flow.Renderer.prototype.resize = function(width, height) {
  if (this.backend == Vex.Flow.Renderer.Backends.CANVAS) {
    if (!this.element.getContext) throw new Vex.RERR("BadElement",
      "Can't get canvas context from element: " + sel);
    this.element.width = width;
    this.element.height = height;
    this.ctx = Vex.Flow.Renderer.bolsterCanvasContext(
        this.element.getContext('2d'));
  } else {
    this.ctx.resize(width, height);
  }

  return this;
}

Vex.Flow.Renderer.prototype.getContext = function() {
  return this.ctx;
}
