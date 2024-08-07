import numpy as np
import pygame
from pygame import*
from pygame.display import set_mode,update,set_caption,set_icon
from pygame.surfarray import make_surface,array3d
from random import randint,choice
from PIL import Image
import ctypes
lib=ctypes.CDLL('./CODERROR.so')
lib.initialize_fonts()
lib.initialize_fonts_dicts()
char32_t=ctypes.c_uint32
global pixels,W,H
W,H=640,480
pixels=np.zeros((W,H,3),dtype=np.uint8)
def set_pixel(array,x,y,red,green,blue,alpha=255):lib.set_pixel(array.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8)),array.shape[0],array.shape[1],array.shape[2],x,y,red,green,blue,alpha)
def write_symbol_frame(array,x,y,symbol,direction=0,red=0,green=0,blue=0,alpha=0):lib.write_symbol_frame(array.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8)),array.shape[0],array.shape[1],array.shape[2],x,y,symbol.ctypes.data_as(ctypes.POINTER(ctypes.c_bool)),len(symbol[0]),len(symbol),direction,red,green,blue,alpha)
def write_symbol(array,x,y,symbol,direction=0,red=255,green=255,blue=255,alpha=255):lib.write_symbol(array.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8)),array.shape[0],array.shape[1],array.shape[2],x,y,symbol.ctypes.data_as(ctypes.POINTER(ctypes.c_bool)),len(symbol[0]),len(symbol),direction,red,green,blue,alpha)
def write_symbol_with_frame(array,x,y,symbol,direction=0,foreground_red=255,foreground_green=255,foreground_blue=255,foreground_alpha=255,background_red=0,background_green=0,background_blue=0,background_alpha=255):lib.write_symbol_with_frame(array.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8)),array.shape[0],array.shape[1],array.shape[2],x,y,symbol.ctypes.data_as(ctypes.POINTER(ctypes.c_bool)),len(symbol[0]),len(symbol),direction,foreground_red,foreground_green,foreground_blue,foreground_alpha,background_red,background_green,background_blue,background_alpha)
def visual_effect1(array):lib.visual_effect1(array.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8)),array.shape[0],array.shape[1],array.shape[2])
def str_to_char32_t(string):return(char32_t*len(string))(*[ord(c)for c in string])
def get_symbol_code(key,font_number=0):return lib.get_symbol_code(str_to_char32_t(key),font_number)
def draw_frame(array,x,y,frame_width=3,frame_height=3,frame_red=255,frame_green=255,frame_blue=255,frame_alpha=255,background_red=0,background_green=0,background_blue=0,background_alpha=255):lib.draw_frame(array.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8)),array.shape[0],array.shape[1],array.shape[2],x,y,frame_width,frame_height,frame_red,frame_green,frame_blue,frame_alpha,background_red,background_green,background_blue,background_alpha)
def write_text(array,x,y,text,symbols_direction=0,text_direction=0,foreground_red=255,foreground_green=255,foreground_blue=255,foreground_alpha=255,background_red=0,background_green=0,background_blue=0,background_alpha=255,width=-1,height=-1):lib.write_text(array.ctypes.data_as(ctypes.POINTER(ctypes.c_uint8)),array.shape[0],array.shape[1],array.shape[2],x,y,str_to_char32_t(text),symbols_direction,text_direction,foreground_red,foreground_green,foreground_blue,foreground_alpha,background_red,background_green,background_blue,background_alpha,width,height)
def blit_image(array,x,y,overlay_image):
    image=Image.fromarray(array)
    base=Image.new('RGBA',image.size,(0,0,0,0))
    base.paste(overlay_image,(y,x))
    result_image=Image.alpha_composite(image.convert('RGBA'),base)
    return np.array(result_image.convert('RGB'))
def path_to_PIL_image(path):return Image.open(path).transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.ROTATE_90)
def blit_image_from_path(array,x,y,path):return blit_image(array,x,y,path_to_PIL_image(path))
#создание массива словарей шрифтов (fonts)
font_dicts=[]
with open("fonts.py","r",encoding="utf-8")as fonts:
    while"fonts"not in fonts.readline().split("="):pass
    level=0;temp=[];i=-1
    while level>-1:
        symbol=fonts.read(1)
        if symbol=="[" or symbol=="(":
            if level==0:temp.append([]);font_dicts.append([]);i+=1
            level+=1
        elif symbol=="]" or symbol==")":level-=1
        elif symbol=="#":temp[i].append(fonts.readline().split())
    for i in range(len(temp)):
        for i1 in range(len(temp[i])):font_dicts[i].extend(temp[i][i1])
        font_dicts[i]=dict.fromkeys(font_dicts[i])
        for a in range(len(temp[i])):
            for b in range(len(temp[i][a])):font_dicts[i][temp[i][a][b]]=a
from fonts import*
for i in range(len(font_dicts)):
    for key in font_dicts[i].keys():
        symbol_matrix=np.zeros((len(fonts[i][font_dicts[i][key]]),len(fonts[i][font_dicts[i][key]][0])),dtype=np.bool_)
        for y in range(len(fonts[i][font_dicts[i][key]])):
            for x in range(len(fonts[i][font_dicts[i][key]][0])):
                symbol_matrix[y,x]=fonts[i][font_dicts[i][key]][y][x]
        font_dicts[i][key]=symbol_matrix
fonts=font_dicts;del font_dicts
#
screen=set_mode((W,H)#,NOFRAME
)
clock=pygame.time.Clock()
while 1:
    for event in pygame.event.get():
        if event.type==QUIT:exit()
    #создание иконки
    icon=np.zeros((16,16,3),dtype=np.uint8)
    write_symbol(icon,3,3,choice(list(fonts[0].values())),0,randint(0,255),randint(0,255),randint(0,255))
    icon=make_surface(icon).convert_alpha()
    pixel_array=PixelArray(icon)
    pixel_array.replace((0,0,0,255),(0,0,0,0))
    set_icon(icon)
    #
    pixels=np.zeros((W,H,3),dtype=np.uint8)
    #
    image=path_to_PIL_image("image.png")
    pixels=blit_image(pixels,0,0,image)
    #pixels=blit_image_from_path(pixels,0,0,"image.png")
    '''for y in range(H//10):
        for x in range(W//10):
            #write_symbol_frame(pixels,x*10,y*10,choice(list(fonts[0].values())))
            write_symbol(pixels,x*10,y*10,choice(list(fonts[0].values())),randint(0,3),randint(0,255),randint(0,255),randint(0,255))'''
    visual_effect1(pixels)
    #write_text(pixels,6*10,26*10,open("тексты/вступление/0.txt").read(),text_direction=3,symbols_direction=3)
    screen.blit(make_surface(pixels),(0,0));update();clock.tick(500);set_caption(f'FPS: {clock.get_fps():.0f}')