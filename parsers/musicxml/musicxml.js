// vex musicxml parser
// based on VexTab parser
// Author: Luuk de Waal Malefijt

// written on MusicXML 2.0

// TODO untested for time-wise oriented musicxml
// TODO MusicXML 2.0 does not support dead notes, so we need
// a non-standardized hack. there are two options: 
// 	1 - a unpitched element 
/*		(The unpitched element indicates musical elements 
 * 		that are notated on the staff but lack definite pitch, such as
 *		unpitched percussion and speaking voice - ) */
// 	2 - a other-notation
// TODO: custom support for versions of MusicXML

// part is the track from the musicxml that should be parsed and rendered
Vex.Flow.Parser.MusicXML = function(notation, part, barlimit, barsPerStave, baroffset)
{
	if (notation === undefined) notation = true; // default to no classic notation
	if (part === undefined) 	part = 0; // default first part
	if (barlimit === undefined)	barlimit = 30;
	if (baroffset === undefined) baroffset = 0;
	
	this.hasParsed = false; // flag needed for editor recursion
	
	this.init(notation, part, barlimit, barsPerStave, baroffset);
}

Vex.Flow.Parser.MusicXML.prototype.init = function(notation, part, barlimit, barsPerStave, baroffset)
{
	// retrieve old values of they have been set
	if (this.hasParsed && (notation === undefined || part === undefined))
	{
		notation = this.showNotation();
		part = this.part;
	}
	
	this.parsingapi = new Vex.Flow.ParsingAPI(this, "auto", notation, 2);
	this.tuning = new Vex.Flow.Tuning();
	this.part = part;
	this.firstbar = true;
	this.valid = true;
	this.barlimit = barlimit;
	this.baroffset = baroffset;
}

// interface method needed by parserapi
Vex.Flow.Parser.MusicXML.prototype.getHeight = function() {
	return this.parsingapi.getHeight();
}

// do we render the classic notation?
Vex.Flow.Parser.MusicXML.prototype.showNotation = function() {
	return this.parsingapi.hasNotation();
}

// mapping of musicxml durations to vexflow durations
Vex.Flow.Parser.MusicXML.prototype.durationMapping = 
{
  "whole": "w",
  "half": "h",
  "quarter": "q",
  "eighth": "8",
  "16th": "16",
  "32nd": "32",
}

// parse MusicXML http link or plain XML
// interface method needed by tabdiv
Vex.Flow.Parser.MusicXML.prototype.parse = function(code)
{
	Vex.LogDebug("Start parsing xml partiture with musicXML parser: " + code);
	
	if (code === undefined || code == "") this.parseError("No xml found");
	
	// (re-)init parsingapi state (clear generated elements etc)
	if (this.hasParsed) this.init(); // parsingapi should always be defined from here, so notation should be set
	
	// this parser instance
	var instance = this;
	
	// TODO check whether the code isnt xml itself
	
	// retrieve XML from local server (external is forbidden)
	// doesnt work in chrome: http://stackoverflow.com/questions/3701277/jquery-xml-parse-with-ajax-does-not-work-in-chrome-but-works-in-ie-ff-opera
	// synchronous blocking (a)jax request
	$.ajax({
         url:    code,
         success: function(musicxml) { instance.parseXML(musicxml); },
         error: function(XMLHttpRequest, textStatus, errorThrown) { instance.parseError(errorThrown); },
         async:   false
    });
    
    // flag to let this class know it has parsed for a possible second iteration (when editor gets edited)
    this.hasParsed = true;
    
    return this;
}

// TODO: move to common parser class
Vex.Flow.Parser.MusicXML.prototype.parseError = function(message) {
  this.valid = false;
  this.last_error = message;
  
  // Create and throw the RuntimeError exception.
  var error = new Vex.RERR("ParseError", message);
  throw error;
}

// return wether the xml is valid or whether some required data in the xml
// wasnt available
// interface method needed by tabdiv
Vex.Flow.Parser.MusicXML.prototype.isValid = function()
{
	return this.valid;
}

// interface function
Vex.Flow.Parser.MusicXML.prototype.getElements = function()
{
	return this.parsingapi.getElements();
}

Vex.Flow.Parser.MusicXML.prototype.parseXML = function(musicxml)
{
	// de part id is not standardized, so we cant use a jquery selector
	// we have to loop 
	var part = this.part;
	var instance = this;
	$(musicxml).find("part").each(function(index)
	{
		if (index == part) instance.parseXMLPart(this);
	});
}

Vex.Flow.Parser.MusicXML.prototype.parseXMLPart = function(part)
{		
	Vex.LogDebug("Parsing part");
	
	// this parser instance
	var instance = this;
	
	// for every measure (bar)
	$(part).find("measure").each(function(index)
	{
		// dont exceed limit
		if (index > instance.barlimit)
		{
			Vex.LogDebug("Reached bar limit.");
			return false;
		}
			
		// start at baroffset	
		if (index >= instance.baroffset)
			instance.parseXMLMeasure(this);
	});
}

// measure == bar
Vex.Flow.Parser.MusicXML.prototype.parseXMLMeasure = function(measure)
{
	Vex.LogDebug("Parsing measure");

	// this parser instance
	var instance = this;
	var tuning = this.tuning; // default is EADGBE (guitar)

	var staff_details = $(measure).find("staff-details");
	var measure_num = $(measure).attr("number");

	// add bar before elements if this is not the first bar
	// every stave is a bar itself, and a bar is just a note
	if (!this.firstbar) 
	{
		// TODO only if it is not the last measure AND there are playable notes (prevent adding dummy bars)
		this.parsingapi.addBar();
	}
	
	this.firstbar = false;

	// if there is a possible alternate tuning for this measure
	if (staff_details.length)
	{
		Vex.LogDebug("Parsing tuning for measure " + measure_num);
		
		var lines = []; // array to store pairs of tuning-step and tuning-octave
		$(measure).find("staff-tuning").each(function()
		{
			var line = $(this).attr("line");							// 1-6
			var tuning_step = $(this).find("tuning-step").text();		// A-G
			var tuning_octave = $(this).find("tuning-octave").text();	// 0-9

			// TODO: create tuning from this staff-tuning
			
			// override saved tuning with newly found
			// this.tuning = newTuning;
		});
	}
				
	// every note
	// http://www.recordare.com/dtds/note.html
	$(measure).find("note").each(function(index)
	{
		instance.parseXMLNote(this, tuning);
	});
}

Vex.Flow.Parser.MusicXML.prototype.parseXMLNote = function(note, tuning)
{	
	/* Type indicates the graphic note type, Valid values (from
	shortest to longest) are 256th, 128th, 64th, 32nd, 16th,
	eighth, quarter, half, whole, breve, and long */
	var duration = $(note).find("type").text();
		
	// map musicxml to vex duration
	var vexDuration = this.durationMapping[duration];
	
	// add the 'd' for 'dotted' to vex duration
	// see: tables.js
	if (this.isDotted(note)) vexDuration += "d"; 
	
	// parse note depending on type
	switch (this.getNoteType(note))
	{
		case "dead": 	this.parseDeadNote(note, vexDuration); 	break;
		case "rest": 	this.parseRest(note, vexDuration);		break;
		case "tie": 	this.parseTie(note, vexDuration);		break;
		case "tab":		this.parseTabNote(note, vexDuration);	break;
		case "normal":	this.parseNote(note, vexDuration);		break;
	}
}

Vex.Flow.Parser.MusicXML.prototype.parseTie = function(note, duration)
{
	// is this a hammeron or pulloff?
	var tieType = ""; // default normal tie
	if (this.isHammeron(note)) 	tieType = "hammeron";
	if (this.isPulloff(note)) 	tieType = "pulloff";
	if (this.isSlide(note)) 	tieType = "slide";
	
	// not every musicxml implementation specifies a tie start, so we have to work with just stop
	if ($($(note).find("tie")).attr("type") == "stop" || tieType !== "")
	{
		this.parsingapi.addTiedNote(duration, 
									$(note).find("string").text(), 
									$(note).find("fret").text(),
									this.tuning, 
									this.isChord(note),
									tieType);
	}
	
	// parsingapi automatically adds note to element list too	
}

Vex.Flow.Parser.MusicXML.prototype.parseDeadNote = function(note, duration)
{
	// dead notes have a step and octave,
	// we have to convert this to a fret and string to be able to place it
	this.parsingapi.addDeadNote(duration, $(note).find("step").text(), $(note).find("octave").text());
}

Vex.Flow.Parser.MusicXML.prototype.parseRest = function(note, duration) {
	this.parsingapi.addRest(duration);
}

// parse a note from technical tablature notation
Vex.Flow.Parser.MusicXML.prototype.parseTabNote = function(note, duration)
{
	if (this.isBend(note))
	{
		var alter = $(note).find("bend-alter").text(); // number of semitones in bend
		var release = $(note).find("release").length;
		var pre_bend = $(note).find("pre-bend").length;
		var dorelease = release || pre_bend;
		var bend = 	{ release: dorelease, alter: alter };
	}
	
	this.parsingapi.addNewTabNote(	duration, 
									$(note).find("string").text(), 
									$(note).find("fret").text(), 
									this.tuning, 
									this.isChord(note),
									undefined, // vibratotype
									undefined, // notetype
									bend
									);
}

// parse a note from the specified tone characteristics
Vex.Flow.Parser.MusicXML.prototype.parseNote = function(note, duration)
{
	if (!this.showNotation()) return;
	var step = $(note).find("step").text(); // A, B, C, D, E, F, G
	var octave = $(note).find("octave").text(); // 0 - 9 (4 = middle C)
	var alter = $(note).find("alter").text(); // -1 for flat (semitone down), 1 for sharp (#, semitone up)
	this.parsingapi.addNewNote(duration, step, octave, alter, this.tuning);
}

// is this note part of a chord?
Vex.Flow.Parser.MusicXML.prototype.isChord = function(note) {
	return $(note).find("chord").length;
}

// is this note part of a chord?
Vex.Flow.Parser.MusicXML.prototype.isDotted = function(note) {
	return $(note).find("dot").length;
}

Vex.Flow.Parser.MusicXML.prototype.isHammeron = function(note) {
	return $(note).find("hammer-on").attr("type") == "stop";
}

Vex.Flow.Parser.MusicXML.prototype.isPulloff = function(note) {
	return $(note).find("pull-off").attr("type") == "stop";
}

Vex.Flow.Parser.MusicXML.prototype.isSlide = function(note) {
	return $(note).find("slide").attr("type") == "stop";
}

Vex.Flow.Parser.MusicXML.prototype.isBend = function(note) {
	return $(note).find("bend").length;
}

Vex.Flow.Parser.MusicXML.prototype.getNoteType = function(note)
{
	// dead note
	if ($(note).find("unpitched").length) 	return "dead";
	
	// rest
	if ($(note).find("rest").length) 		return "rest";
	
	// ties
	if ($(note).find("tie").length ||
		$(note).find("hammer-on").length ||
		$(note).find("pull-off").length ||
		$(note).find("slide").length)		return "tie";
		
	// tab note
	if ($(note).find("fret").length && 
		$(note).find("string").length)		return "tab";
		
	// normal
	return "normal"; // default
}
