// ParsingAPI

// Author: Luuk de Waal Malefijt

// Easy API for sequentially adding notes and rendering them once finished.
// this class takes care of the management of elements (this.elements) that used to be in
// the VexTab parser class. This class shouldnt contain any this.state assignments, as they belong in a parser
// for now, this is a procedural api that could be used when parsing partiture data (in your custom parser)

// TODO: autobeaming, bends, vibrato, ties, slides, effects
// TODO: better error checking
// TODO: compare with undefined AND with null

// mode could be manual (for the procedural vextab parser) or automatic (stavenumbers are optional)
Vex.Flow.ParsingAPI = function(parser, mode, notation, barsPerStave) {
  this.init(parser, mode, notation);
}

/**
* Initialize Rendering API.
* @constructor
*/
Vex.Flow.ParsingAPI.prototype.init = function(parser, mode, notation, barsPerStave) 
{
  this.parser = parser; 				// needed to calculate height etc
  this.mode = mode; 					// manual or automatic
  this.cur_stave = -1; 						// default for automatic mode. 
  this.cur_bar = 1;
  this.barsPerStave = 3; 				// bars per stave as specified in the format that the parser is parsing
  this.tuning = new Vex.Flow.Tuning(); 	// Defaults to standard tuning.
  this.notation = notation || false; 	// default
  this.height = 0; 						// height of generated elements (mostly staves)
	this.last_stave = -1;				// stave that was used last to add a note

	if (barsPerStave !== undefined) this.barsPerStave = barsPerStave;

  // The VexFlow elements generated from the parser (VexTab, MusicXML) code.
  this.elements = {
    staves: [],
    tabnotes: [],
    notes: [],
    ties: [],
    beams: []
  };
  
	// array that remembers notes that should be in a single chord
	this.chord_collector = {
		notes: []
	};
}

Vex.Flow.ParsingAPI.prototype.hasNotation = function()
{
	return this.notation;
}

Vex.Flow.ParsingAPI.prototype.isAutomaticMode = function()
{
	return this.mode == "auto";
}

// GETTERS AND SETTERS

Vex.Flow.ParsingAPI.prototype.getHeight = function()
{
	//return 30 + this.height;
	return this.height;
}

// return the stave number we are currently adding to
Vex.Flow.ParsingAPI.prototype.getStave = function()
{
	// in manual mode, staves should be specified
	// throw error
	if (this.mode == "manual") throw new Vex.RuntimeError("InvalidArgumentException", "Can't calculate stave in manual mode");
	return this.cur_stave;
}

// return the stave number we are currently adding to
Vex.Flow.ParsingAPI.prototype.getBar = function()
{
	return this.cur_bar;
}

Vex.Flow.ParsingAPI.prototype.getElements = function() {
  return this.elements;
}

Vex.Flow.ParsingAPI.prototype.getNotes = function() {
  return this.elements.notes;
}

Vex.Flow.ParsingAPI.prototype.getStaves = function() {
  return this.elements.staves;
}

Vex.Flow.ParsingAPI.prototype.getTabNotes = function() {
  return this.elements.tabnotes;
}

Vex.Flow.ParsingAPI.prototype.getTies = function() {
  return this.elements.ties;
}

Vex.Flow.ParsingAPI.prototype.getBeams = function() {
  return this.elements.beams;
}

Vex.Flow.ParsingAPI.prototype.hasStave = function() {
	return this.elements.staves.length > 0;
}

// returns last added tabnote (useful for creating chords)
Vex.Flow.ParsingAPI.prototype.getLastTabNote = function() 
{
	return this.elements.tabnotes[this.last_stave].pop();
}

// returns last added note
Vex.Flow.ParsingAPI.prototype.getLastNote = function(str, remove) 
{
	return this.elements.notes[this.last_stave].pop();
}

// returns last added note
// type = (tab|note)
Vex.Flow.ParsingAPI.prototype.getLastNoteForString = function(str, type) 
{
	var notearray = {note: this.elements.notes, tab: this.elements.tabnotes}[type];
	
	// find index
	var index = -1;
	if (str !== undefined)
	{
		// loop backwards through collection of notes in array of staves
		for (var stave = notearray.length-1; stave >= 0; stave--)
		{
			// loop backwards through generated tabnote collection
			for (var i = notearray[stave].length-1; i >= 0; i--)
			{
				var note = notearray[stave][i];
				
				// skip bar notes
				if (note.getDuration() == "b") continue;
				
				// if we want a tabnote
				if (type == "tab")
				{
					var positions = note.getPositions();
					for (var position = 0; position < positions.length; position++)
					{
						// we found the first tab position on the string
						// we were looking for
						if (positions[position]["str"] == str) 
							return {tabnote: note, chordindex: position}; // return position in chord
					}
				}
				
				// if we want a note
				else
				{
					var keyProps = note.getKeyProps();
					// TODO
				}
			}
		}
	}
	
	// not found
}

// find tie that contains the given note
Vex.Flow.ParsingAPI.prototype.getTie = function(tabnote, remove)
{
	// loop through all ties (includes staveties)
	for (var stave = 0; stave < this.elements.ties.length; stave++)
	{
		// every tie in this stave array
		for (var i = 0; i < this.elements.ties[stave].length; i++)
		{
			var tie = this.elements.ties[stave][i];
			
			// if we removed this item earlier
			if (tie === undefined) continue; // TODO: completely remove item
			
			if (tie.first_note === tabnote || tie.last_note === tabnote)
			{
				// remove tie if asked
				if (remove !== undefined && remove === true)
					this.elements.ties[stave][i] = undefined;
					
				return tie;
			}
		}
	}
}

// MANUAL CALLS, NEEDED BY VEXTAB

// manually add stave
// returns new height
Vex.Flow.ParsingAPI.prototype.addStave = function(current_stave, notation)
{
	Vex.LogDebug("[parserapi] Adding stave.");
	
	// if we are in automatic mode, the working stave number might not be given
	if (this.isAutomaticMode()) 
	{
		this.cur_stave++;
		current_stave = this.getStave();
	}
	if (notation === undefined) notation = this.notation;
	
  var notestave = notation ? new Vex.Flow.Stave(20, this.parser.getHeight(), 380).addTrebleGlyph().setNoteStartX(40) : null;
  var tabstave = new Vex.Flow.TabStave(20, notation ? notestave.getHeight() + this.parser.getHeight() : this.parser.getHeight(), 380).
    addTabGlyph().setNoteStartX(40);

  this.elements.staves.push({tab: tabstave, note: notestave});
  this.elements.tabnotes[current_stave] = [];
  this.elements.notes[current_stave] = [];
  this.elements.ties[current_stave] = [];

	//this.cur_stave++;

  // return new height
  this.height += tabstave.getHeight() + (notation ? notestave.getHeight() : null);
  return this.height;
}

// manually add bar
Vex.Flow.ParsingAPI.prototype.addBar = function(current_stave) 
{
	Vex.LogDebug("[parserapi] Adding bar.");
	
	if (this.isAutomaticMode()) 
	{
		if (!this.hasStave()) this.addStave();
		current_stave = this.getStave();
		
		if (this.cur_bar >= this.barsPerStave)
		{
			Vex.LogDebug("[parserapi] Automatically pushing new bars to new stave.");
			this.addStave();
			this.cur_bar = 1; // reset
			return; // a stave is a bar, return to prevent a bar line next to the key
		}
	}
	
	this.elements.tabnotes[current_stave].push(new Vex.Flow.BarNote());
	this.elements.notes[current_stave].push(new Vex.Flow.BarNote());
	
	this.cur_bar++;
}

// manually add note tie
// de notes in the tie that gets added should be added to the notes
// element list too
Vex.Flow.ParsingAPI.prototype.addTie = function(effect, current_stave)
{
	if (this.isAutomaticMode()) 
	{
		if (!this.hasStave()) this.addStave();
		current_stave = this.getStave();
	}
	this.elements.ties[current_stave].push(effect);
}

// manualy add note in tab
Vex.Flow.ParsingAPI.prototype.addTabNote = function(note, current_stave)
{
	if (this.isAutomaticMode()) 
	{
		if (!this.hasStave()) this.addStave();
		current_stave = this.getStave();
	}
	this.elements.tabnotes[current_stave].push(note);
	this.last_stave = current_stave;
}

// manually add normal notation note
Vex.Flow.ParsingAPI.prototype.addNote = function(note, current_stave)
{
	if (this.isAutomaticMode()) 
	{
		if (!this.hasStave()) this.addStave();
		current_stave = this.getStave();
	}
	this.elements.notes[current_stave].push(note);
	this.last_stave = current_stave;
}

// manually add beam
Vex.Flow.ParsingAPI.prototype.addBeam = function(beam_notes)
{
	this.elements.beams.push(new Vex.Flow.Beam(beam_notes));
}

// UTIL

// tuning is optional
// TODO: place in tabnote model (note = tabnote.convertToNote())
Vex.Flow.ParsingAPI.prototype.convertToNote = function(tabnote, tuning)
{
	// taken from vextab.js:773 (6-10-2010)
	
	// keys is a collection of tones for all the classic notes in this 'position' (in time).
	// however, this function only adds a single note to just this position
	var keys = [];
    var accidentals = [];
    var positions = tabnote.getPositions();
    
    if (tuning === undefined) tuning = this.tuning; // Defaults to standard tuning.
    
    var keys = [];
    var accidentals = [];
	
	// for each fretboard position of notes in this tabnote object
    for (var j = 0; j < positions.length; ++j) 
    {
        var notefret = positions[j];
        
        // TODO support dead note
        if (notefret.fret == "x") notefret.fret = 24;
        
        var spec = tuning.getNoteForFret(notefret.fret, notefret.str);
        var props = Vex.Flow.keyProperties(spec);
        accidentals.push(props.accidental);
        keys.push(spec);
    }

    var note = new Vex.Flow.StaveNote({ keys: keys, duration: tabnote.getDuration() });

    for (var j = 0; j < accidentals.length; ++j) 
    {
        var acc = accidentals[j];
        if (acc) note.addAccidental(j, new Vex.Flow.Accidental(accidentals[j]));
    }

    return note;
}

// convert a step and octave to a fret/str combination
// TODO: place in note model
Vex.Flow.ParsingAPI.prototype.convertToFretboardPos = function(step, octave, alter, tuning)
{
	// TODO
	return [{fret: "", str: ""}];
}

// AUTOMATIC CALLS, SHOULD CALCULATE EVERYTHING

// if this note is the first note of a chord, then chordNote should be undefined or false
// for the other notes in the chord, it should be true.
// when new notes should be added to the previous to make a chord,
// this function retrieves the previous notes and adds the new
// - bend = {release: true|false, alter: step}
Vex.Flow.ParsingAPI.prototype.addNewTabNote = function(duration, str, fret, tuning, chordNote, vibratoType, noteType, bend)
{
	// mappings from note types to annotations
	var notetypemappings = 	{
								palmmute: 			"P.M.",
								pitchharmonic: 		"P.H.",
								naturalharmonic: 	"N.H.",
								pm:					"P.M.",
								ph:					"P.H.",
								nh:					"N.H.",
								staccato:			".",
								st:					"."
							};
	
	var vibratomappings = 	{
								normalvibrato: false,
								harshvibrato: true,
								normal: false,
								harsh: true
							};
	
	var newChord = null;
	
	// if this is a note thats part of a chord, we have to collect the other notes that are part of it
	if (chordNote !== undefined && chordNote == true)
	{
		if (this.notation) this.getLastNote();					// just remove the regular note
		var previousTabNote = this.getLastTabNote(); 			// removes previous note from elements
		
		// this previous tabnote may be tied.
		// if we remove this note from the element list (we just did)
		// and add it back again with an added position, the tie wont recognize
		// the reference to the original object.
		// so we have to find out if this previous note is tied,
		// and if so, we have to update the tie with the updated note
		var previousTabNoteTie = this.getTie(previousTabNote);
		
		var previousDuration = previousTabNote.getDuration(); 	// get first duration
		var previousPositions = previousTabNote.getPositions(); // get previous positions
		previousPositions.push({str: str, fret: fret});			// add new note to previous positions
		newChord = this.addNewChord(previousDuration, previousPositions);	// automatically adds regular note again
		
		// replace old note in tie with new chord with new note
		if (previousTabNoteTie !== undefined) previousTabNoteTie.last_note = newChord.tabnote;
	}
	
	// add normal note
	else newChord = this.addNewChord(duration, [{str: str, fret: fret}], tuning);
	
	// index of the new note in the created chord
	// we didnt sort the positions so our new note is usually the last one
	var newNoteIndex = newChord.tabnote.getPositions().length-1;
	
	// add annotation
	if (noteType !== undefined) newChord.tabnote.addAnnotation(new Annotation(notetypemappings[noteType]), newNoteIndex);
	
	// add vibrato
	if (vibratoType !== undefined) newChord.tabnote.addmodifier(new Vex.Flow.Vibrato().setHarsh(vibratomappings[vibratoType]), newNoteIndex);
	
	// add bend
	if (bend !== undefined)
	{
		var release = bend.release; // boolean
		var to_fret = parseInt(newChord.tabnote.getPositions()[newNoteIndex].fret) + parseInt(bend.alter);
		
		// switch the alter element, specifed in the number of half steps
		switch (parseInt(bend.alter))
		{
			case 1: newChord.tabnote.addModifier(new Vex.Flow.Bend("1/2", release), newNoteIndex); break;
			case 2: newChord.tabnote.addModifier(new Vex.Flow.Bend("Full", release), newNoteIndex); break;
			case 3: newChord.tabnote.addModifier(new Vex.Flow.Bend("1 1/2", release), newNoteIndex); break;
			case 4: newChord.tabnote.addModifier(new Vex.Flow.Bend("2 Steps", release), newNoteIndex); break;
			default: newChord.tabnote.addModifier(new Vex.Flow.Bend("Bend to " + to_fret, release), newNoteIndex);
		}
	}
	
	return newChord;
}

// create note 
Vex.Flow.ParsingAPI.prototype.addNewNote = function(duration, step, octave, alter, tuning, chordNote)
{
	// TODO: what if note is out of guitar range?
	var fretStr = this.convertToFretboardPos(step, octave, alter, tuning);
	this.addNewTabNote(duration, fretStr["str"], fretStr["fret"], tuning, chordNote);
}

// palm mutes cant be tied
Vex.Flow.ParsingAPI.prototype.addPalmMute = function(duration, str, fret, tuning, isChord, vibratoType) // wrapper
{
	this.addNewTabNote(duration, str, fret, tuning, isChord, vibratoType, "palmmute");
}

// cant be tied
// harmonictypes: 
Vex.Flow.ParsingAPI.prototype.addHarmonic = function(duration, str, fret, harmonictype, tuning, isChord, vibratoType) // wrapper
{
	this.addNewTabNote(duration, str, fret, tuning, isChord, vibratoType, harmonictype);
}

Vex.Flow.ParsingAPI.prototype.addSlide = function(duration, str, fret, tuning, isChord, vibratoType) // wrapper
{
	this.addNewTabNote(duration, str, fret, tuning, isChord, vibratoType, "slide");
}

// TODO: tablature doesnt support rest
Vex.Flow.ParsingAPI.prototype.addRest = function(duration)
{
	// add rest just to notes:
	/*var tabNote = new Vex.Flow.TabNote({positions: [{fret: 24, str: 1}], duration: duration+"r"});
	var note = this.convertToNote(tabNote, this.tuning);
	this.addNote(note);*/
	
	// add rest to both tablature and normal notes
	this.addNewTabNote(duration+"r", 1, 24, undefined, false);
}

Vex.Flow.ParsingAPI.prototype.addDeadNote = function(duration, step, octave)
{
	// TODO: convert step and octave to string number
	this.addNewTabNote(duration, 3, "x"); // x stands for dead note
}

// we expect the tie start note to be on the same string as the tie end note
// use this function on the tie stop note.
// 
Vex.Flow.ParsingAPI.prototype.addTiedNote = function(duration, str, fret, tuning, isChord, tieType)
{
	// TODO: ties are expected to have the same durations
	//			we want to be able to tie notes of different durations
	
	var tiemappings = 	{
							slide: "slide",
							normal: "",
							hammeron: "H.O.",
							pulloff: "P.O."
						};
	
	if (tieType === undefined) tieType = ""; // default to regular tie
	
	function createTie(type, first_note, last_note, first_indices, last_indices)
	{
		// TODO: make smaller, generic class loading
		if (type == "slide")
		{
			return new Vex.Flow.TabSlide(
			{
		        first_note: first_note,
		        last_note: last_note,
		        first_indices: first_indices,
		        last_indices: last_indices
			});
		}
		
		else
		{
			return new Vex.Flow.TabTie(
			{
		        first_note: first_note,
		        last_note: last_note,
		        first_indices: first_indices,
		        last_indices: last_indices
			}, type); // name of the tie (hammeron, pulloff)
		}
	}
	
	// TAB
	
    // find previous note on specified string
    var struct = this.getLastNoteForString(str, "tab");
    var tieStartTabNote = struct.tabnote;
    var chordIndex = struct.chordindex;			// the index of the fret/str in de chord that was found 
    
    // add the new note to element list
    // if this note will belong to a chord, the chord note will get updated
    // ties that contain the old chord will be updated too						
	var newNote = this.addNewTabNote(duration, str, fret, tuning, isChord);
	var newTabNote = newNote.tabnote;
							
	// check if we already have a tie between these notes
	if (tieType == "" || tieType == "normal") // only if we are adding normal ties
		var previousTie = this.getTie(tieStartTabNote, true); 		// remove tie if found
		
	if (previousTie !== undefined) // dont reuse ties if we are adding hammerons and pullofs
	{
		// remove tie, add note to tie, add new tie
		var oldTieFirstNote = previousTie.first_note;
		var oldTieLastNote = previousTie.last_note;
		var oldTieFirstIndices = previousTie.first_indices; // indices in possible chord that are tied
		var oldTieLastIndices = previousTie.last_indices;
		
		// add new index
		oldTieFirstIndices.push(chordIndex);				// index of first note were tieing to
		oldTieLastIndices.push(newTabNote.getPositions().length-1); // index of newly added note to old tie
		
		// update old tie
		tabTie = createTie(tiemappings[tieType], oldTieFirstNote, newTabNote, oldTieFirstIndices, oldTieLastIndices);
	}
	
	// create new tie
	else tabTie = createTie(tiemappings[tieType], tieStartTabNote, newTabNote, [chordIndex], [0]);	
      
    this.addTie(tabTie);
      
    // NOTE
    
    if (!this.notation) return;
      
    //var tieStartNote = this.getLastNoteForString(str, "note");
    //var newNote = this.convertToNote(newTabNote);
    
    /*var noteTie = new Vex.Flow.StaveTie({
            first_note: tieStartNote,
            last_note: newNote
          });*/
          
    //this.addTie(noteTie);
}

// positions is an array [{str: stringnumber, fret: fretnumber}, {...}]
// that specifies all note positions on the fretboard for this (time) position
Vex.Flow.ParsingAPI.prototype.addNewChord = function(duration, fretboardpositions, tuning)
{
	if (tuning === undefined) tuning = this.tuning;
	
	// TODO accept dead notes in a chord
	
	// see tabnote.js:20
	// a position is a position in time. a chord is a note too, but with multiple (literal) positions (string, fret combination)
	var tabNote = new Vex.Flow.TabNote({positions: fretboardpositions, duration: duration});
	this.addTabNote(tabNote);
	
	// TODO: workaround convert dead note to note
	if (this.notation)
	{
		var note = this.convertToNote(tabNote, tuning);
		this.addNote(note);
	}
	
	// return generated notes
	return {tabnote: tabNote, note: note}; // note is undefined if not notation
}

