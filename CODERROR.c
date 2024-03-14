#include<stdint.h>
#include<stdbool.h>
#include<stdlib.h>
#include<string.h>
#include<uchar.h>
#include"fonts.c"
#include"fonts_dicts.c"
bool compare_char32_strings(const char32_t*str1,const char32_t*str2){
    while(*str1!=U'\0'||*str2!=U'\0'){
        if(*str1!=*str2){
            return 0;}
        str1++;
        str2++;}
    return 1;}
int get_symbol_code(char32_t*key,int font_number){
    for(int i=0;i<len_of_fonts_dicts[font_number];i++){
        if(compare_char32_strings(fonts_dicts[font_number][i].key,key)){
            return fonts_dicts[font_number][i].number;}}
    return-1;}
void set_pixel(uint8_t*pixels,int width,int height,uint8_t depth,int x,int y,uint8_t red,uint8_t green,uint8_t blue,uint8_t alpha){if(x>=0&&x<width&&y>=0&&y<height){
    int index=(x*height+y)*depth;pixels[index]=red;pixels[index+1]=green;pixels[index+2]=blue;
    if(depth==4)
        pixels[index+3]=alpha;}}
void write_symbol_frame(uint8_t*pixels,int width,int height,uint8_t depth,int x,int y,bool*symbol,int symbol_width,int symbol_height,uint8_t direction,uint8_t red,uint8_t green,uint8_t blue,uint8_t alpha){
    int y1,x1;
    for(y1=0;y1<symbol_height;y1++){
        for(x1=0;x1<symbol_width;x1++){
            if(symbol[y1*symbol_width+x1]==0){
                if(direction==0){
                    set_pixel(pixels,width,height,depth,x+x1,y+y1,red,green,blue,alpha);}
                else if(direction==1){
                    set_pixel(pixels,width,height,depth,x+symbol_width-1-y1,y+x1,red,green,blue,alpha);}
                else if(direction==2){
                    set_pixel(pixels,width,height,depth,x+symbol_width-1-x1,y+symbol_height-1-y1,red,green,blue,alpha);}
                else{
                    set_pixel(pixels,width,height,depth,x+y1,y+symbol_height-x1,red,green,blue,alpha);}}}}}
void write_symbol(uint8_t*pixels,int width,int height,uint8_t depth,int x,int y,bool*symbol,int symbol_width,int symbol_height,uint8_t direction,uint8_t red,uint8_t green,uint8_t blue,uint8_t alpha){
    int y1,x1;
    for(y1=0;y1<symbol_height;y1++){
        for(x1=0;x1<symbol_width;x1++){
            if(symbol[y1*symbol_width+x1]==1){
                if(direction==0){
                    set_pixel(pixels,width,height,depth,x+x1,y+y1,red,green,blue,alpha);}
                else if(direction==1){
                    set_pixel(pixels,width,height,depth,x+symbol_width-1-y1,y+x1,red,green,blue,alpha);}
                else if(direction==2){
                    set_pixel(pixels,width,height,depth,x+symbol_width-1-x1,y+symbol_height-1-y1,red,green,blue,alpha);}
                else{
                    set_pixel(pixels,width,height,depth,x+y1,y+symbol_height-x1,red,green,blue,alpha);}}}}}
void visual_effect1(uint8_t*pixels,int width,int height,uint8_t depth){
    int y,x;
    for(y=0;y<height;y+=10){
        for(x=0;x<width;x+=10){
            write_symbol(pixels,width,height,depth,x,y,fonts[0][rand()%count_of_symbols[0]].data,10,10,rand()%4,rand()%256,rand()%256,rand()%256,255);}}}