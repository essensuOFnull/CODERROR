import os
exec(open("generate_fonts_c.py").read())#создание файла fonts.c
os.system("gcc -fPIC -shared -o CODERROR.so CODERROR.c")#компиляция CODERROR.c и CODERROR.h в бибилотеку CODERROR.so