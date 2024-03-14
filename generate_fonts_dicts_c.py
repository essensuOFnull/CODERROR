from fonts import *
count_of_fonts=len(fonts)
fonts_dicts=[]
with open("fonts.py","r",encoding="utf-8")as fonts:
    while"fonts"not in fonts.readline().split("="):pass
    level=0;temp=[];i=-1
    while level>-1:
        symbol=fonts.read(1)
        if symbol=="[" or symbol=="(":
            if level==0:temp.append([]);fonts_dicts.append([]);i+=1
            level+=1
        elif symbol=="]" or symbol==")":level-=1
        elif symbol=="#":temp[i].append(fonts.readline().split())
    for i in range(len(temp)):
        for i1 in range(len(temp[i])):fonts_dicts[i].extend(temp[i][i1])
        fonts_dicts[i]=dict.fromkeys(fonts_dicts[i])
        for a in range(len(temp[i])):
            for b in range(len(temp[i][a])):fonts_dicts[i][temp[i][a][b]]=a
with open('fonts_dicts.c','w')as file:
    file.write("struct symbol_dict{char32_t*key;int number;};\n")
    file.write("struct symbol_dict**fonts_dicts=NULL;\n")
    file.write("int len_of_fonts_dicts[]={"+','.join(str(len(font_dict))for font_dict in fonts_dicts)+'};\n')
    file.write("void initialize_fonts_dicts(){\n")
    file.write("\tfonts_dicts=malloc(sizeof(struct symbol_dict*)*"+str(count_of_fonts)+");\n")
    for i in range(count_of_fonts):
        file.write("\tfonts_dicts["+str(i)+"]=malloc(sizeof(struct symbol_dict)*"+str(len(fonts_dicts[i]))+");\n")
    for i in range(count_of_fonts):
        for j in range(len(fonts_dicts[i])):
            string=list(fonts_dicts[i].keys())[j].replace("\\","\\\\").replace("%","%%").replace('"','\\"')
            file.write('\tfonts_dicts['+str(i)+']['+str(j)+'].key=U"'+string+'";\n')
            file.write('\tfonts_dicts['+str(i)+']['+str(j)+'].number='+str(list(fonts_dicts[i].values())[j])+';\n')
    file.write("}")
print("создан файл fonts_dicts.c")