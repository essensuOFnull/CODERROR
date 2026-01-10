let d,f={
init_printable_symbols(){
	d.printable_symbols='';
	let ranges=[
		[0x0020,0x007F], /*Basic Latin (ASCII)*/
		[0x00A0,0x00FF], /*Latin-1 Supplement*/
		[0x0400,0x04FF], /*Cyrillic*/
		[0x0370,0x03FF], /*Greek*/
		[0x3040,0x309F], /*Hiragana*/
		[0x30A0,0x30FF], /*Katakana*/
		[0x4E00,0x9FFF], /*CJK Unified Ideographs (кандзи)*/
		[0x0600,0x06FF], /*Arabic*/
		[0x0900,0x097F], /*Devanagari*/
		[0x0E00,0x0E7F], /*Thai*/
		[0xAC00,0xD7AF], /*Hangul Syllables (корейский)*/
		[0x1F600,0x1F64F]/*Emoji*/
	];
	for(let range of ranges){
		for(let codePoint=range[0];codePoint<=range[1];codePoint++){
			d.printable_symbols+=String.fromCodePoint(codePoint);
		}
	}
},
get_random_char(){
	return d.printable_symbols[Math.floor(Math.random()*d.printable_symbols.length)];
},
get_random_color(){
	return Math.floor(Math.random()*0xFFFFFF);
},
}
if(_.get(window,`CODERROR.__originals__.functions`)){
    d=window.CODERROR.__originals__.data;
    _.merge(window.CODERROR.__originals__.functions,f);
}
if(_.get(window,`f`)){
    d=window.d;
    _.merge(window.f,f);
}