#include<stdint.h>
#include<stdbool.h>
#include<stdlib.h>
#include<string.h>
#include"fonts.c"
void set_pixel(uint8_t*pixels,int width,int height,int x,int y,uint8_t red,uint8_t green,uint8_t blue){if(x>=0&&x<width&&y>=0&&y<height){int index=(x*height+y)*3;pixels[index]=red;pixels[index+1]=green;pixels[index+2]=blue;}}
void write_symbol_frame(uint8_t*pixels,int width,int height,int x,int y,bool*symbol,int symbol_width,int symbol_height,uint8_t direction,uint8_t red,uint8_t green,uint8_t blue){
    int y1,x1;
    for(y1=0;y1<symbol_height;y1++){
        for(x1=0;x1<symbol_width;x1++){
            if(symbol[y1*symbol_width+x1]==0){
                if(direction==0){
                    set_pixel(pixels,width,height,x+x1,y+y1,red,green,blue);}
                else if(direction==1){
                    set_pixel(pixels,width,height,x+symbol_width-1-y1,y+x1,red,green,blue);}
                else if(direction==2){
                    set_pixel(pixels,width,height,x+symbol_width-1-x1,y+symbol_height-1-y1,red,green,blue);}
                else{
                    set_pixel(pixels,width,height,x+y1,y+symbol_height-x1,red,green,blue);}}}}
}
void write_symbol(uint8_t*pixels,int width,int height,int x,int y,bool*symbol,int symbol_width,int symbol_height,uint8_t direction,uint8_t red,uint8_t green,uint8_t blue){
    int y1,x1;
    for(y1=0;y1<symbol_height;y1++){
        for(x1=0;x1<symbol_width;x1++){
            if(symbol[y1*symbol_width+x1]==1){
                if(direction==0){
                    set_pixel(pixels,width,height,x+x1,y+y1,red,green,blue);}
                else if(direction==1){
                    set_pixel(pixels,width,height,x+symbol_width-1-y1,y+x1,red,green,blue);}
                else if(direction==2){
                    set_pixel(pixels,width,height,x+symbol_width-1-x1,y+symbol_height-1-y1,red,green,blue);}
                else{
                    set_pixel(pixels,width,height,x+y1,y+symbol_height-x1,red,green,blue);}}}}
}
void visual_effect1(uint8_t*pixels,int width,int height){
    int y,x;
    for(y=0;y<height;y+=10){
        for(x=0;x<width;x+=10){
            write_symbol(pixels,width,height,x,y,fonts[0][rand()%count_of_symbols[0]].data,10,10,rand()%4,rand()%256,rand()%256,rand()%256);}}
}