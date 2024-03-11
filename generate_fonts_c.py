from fonts import *
count_of_fonts=len(fonts)
with open('fonts.c','w')as file:
    file.write('struct Symbol{int width;int height;bool*data;};\n')
    file.write("struct Symbol**fonts=NULL;\n")
    file.write('int count_of_fonts={};\n'.format(count_of_fonts))
    file.write('int count_of_symbols[]={'+','.join(str(len(font))for font in fonts)+'};\n')
    file.write('void fonts_initialization(){\n')
    file.write('\tfonts=malloc(sizeof(struct Symbol*)*{});\n'.format(count_of_fonts))
    for i,font in enumerate(fonts):
        file.write('\tfonts[{}]=malloc(sizeof(struct Symbol)*{});\n'.format(i,len(font)))
    data_values_number=0
    for font_index,font in enumerate(fonts):
        for symbol_index,symbol in enumerate(font):
            file.write('\tfonts[{}][{}].height={};\n'.format(font_index,symbol_index,len(symbol)))
            file.write('\tfonts[{}][{}].width={};\n'.format(font_index,symbol_index,len(symbol[0])))
            data_values=[pixel for row in symbol for pixel in row]
            file.write('\tbool data_values'+str(data_values_number)+'[]={'+','.join(str(value)for value in data_values)+'};\n')
            file.write('\tfonts[{}][{}].data=malloc(sizeof(bool)*{});\n'.format(font_index,symbol_index,len(data_values)))
            file.write('\tmemcpy(fonts[{}][{}].data,data_values{},sizeof(bool)*{});\n'.format(font_index,symbol_index,data_values_number,len(data_values)))
            data_values_number+=1
    file.write('}\n')
print("создан файл fonts.c")