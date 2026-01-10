let d,f={
init_printable_symbols() {
    d.printable_symbols = '';
    let ranges = [
        [0x0020, 0x007F], /* Basic Latin (ASCII) */
        [0x00A0, 0x00FF], /* Latin-1 Supplement */
        [0x0400, 0x04FF], /* Cyrillic */
        [0x0370, 0x03FF], /* Greek */
        [0x3040, 0x309F], /* Hiragana */
        [0x30A0, 0x30FF], /* Katakana */
        [0x4E00, 0x9FFF], /* CJK Unified Ideographs (кандзи) */
        [0x0600, 0x06FF], /* Arabic */
        [0x0900, 0x097F], /* Devanagari */
        [0x0E00, 0x0E7F], /* Thai */
        [0xAC00, 0xD7AF], /* Hangul Syllables (корейский) */
        
        // Символы для TUI (терминальных интерфейсов)
        [0x2500, 0x257F], /* Box Drawing - рамки и линии */
        [0x2580, 0x259F], /* Block Elements - блоки и заливки */
        [0x25A0, 0x25FF], /* Geometric Shapes - геометрические фигуры */
        [0x2600, 0x26FF], /* Miscellaneous Symbols - разные символы */
        [0x2700, 0x27BF], /* Dingbats - декоративные символы */
        [0x1F600, 0x1F64F], /* Emoticons - эмодзи */
        [0x1F300, 0x1F5FF], /* Miscellaneous Symbols and Pictographs */
        [0x1F680, 0x1F6FF], /* Transport and Map Symbols */
        [0x1F700, 0x1F77F], /* Alchemical Symbols */
        
        // Дополнительные технические символы
        [0x2300, 0x23FF], /* Miscellaneous Technical */
        [0x2400, 0x243F], /* Control Pictures */
        [0x2440, 0x245F], /* Optical Character Recognition */
        [0x2460, 0x24FF], /* Enclosed Alphanumerics */
        [0x2900, 0x297F], /* Supplemental Arrows-B */
        [0x2B00, 0x2BFF], /* Miscellaneous Symbols and Arrows */
    ];
    
    for (let range of ranges) {
        for (let codePoint = range[0]; codePoint <= range[1]; codePoint++) {
            try {
                d.printable_symbols += String.fromCodePoint(codePoint);
            } catch (e) {
                // Игнорируем невалидные символы
                console.warn(`Не удалось добавить символ с кодом ${codePoint.toString(16)}: ${e}`);
            }
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