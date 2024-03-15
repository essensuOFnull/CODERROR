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
void write_symbol_with_frame(uint8_t*pixels,int width,int height,uint8_t depth,int x,int y,bool*symbol,int symbol_width,int symbol_height,uint8_t direction,uint8_t foreground_red,uint8_t foreground_green,uint8_t foreground_blue,uint8_t foreground_alpha,uint8_t background_red,uint8_t background_green,uint8_t background_blue,uint8_t background_alpha){
    write_symbol_frame(pixels,width,height,depth,x,y,symbol,symbol_width,symbol_height,direction,background_red,background_green,background_blue,background_alpha);
    write_symbol(pixels,width,height,depth,x,y,symbol,symbol_width,symbol_height,direction,foreground_red,foreground_green,foreground_blue,foreground_alpha);}
void visual_effect1(uint8_t*pixels,int width,int height,uint8_t depth){
    int y,x;
    for(y=0;y<height;y+=10){
        for(x=0;x<width;x+=10){
            write_symbol(pixels,width,height,depth,x,y,fonts[0][rand()%count_of_symbols[0]].data,10,10,rand()%4,rand()%256,rand()%256,rand()%256,255);}}}
void draw_frame(uint8_t*pixels,int width,int height,uint8_t depth,int x,int y,int frame_width,int frame_height,uint8_t frame_red,uint8_t frame_green,uint8_t frame_blue,uint8_t frame_alpha,uint8_t background_red,uint8_t background_green,uint8_t background_blue,uint8_t background_alpha){
    int i,j=y+(frame_height-1)*10,symbol_code=get_symbol_code(U"-",0);
    for(i=x+10;i<x+(frame_width-1)*10;i+=10){
        write_symbol_with_frame(pixels,width,height,depth,i,y,fonts[0][symbol_code].data,fonts[0][symbol_code].width,fonts[0][symbol_code].height,0,frame_red,frame_green,frame_blue,frame_alpha,background_red,background_green,background_blue,background_alpha);
        write_symbol_with_frame(pixels,width,height,depth,i,j,fonts[0][symbol_code].data,fonts[0][symbol_code].width,fonts[0][symbol_code].height,0,frame_red,frame_green,frame_blue,frame_alpha,background_red,background_green,background_blue,background_alpha);}
    symbol_code=get_symbol_code(U"|",0);
    i=x+(frame_width-1)*10;
    for(j=y+10;j<y+(frame_height-1)*10;j+=10){
        write_symbol_with_frame(pixels,width,height,depth,x,j,fonts[0][symbol_code].data,fonts[0][symbol_code].width,fonts[0][symbol_code].height,0,frame_red,frame_green,frame_blue,frame_alpha,background_red,background_green,background_blue,background_alpha);
        write_symbol_with_frame(pixels,width,height,depth,i,j,fonts[0][symbol_code].data,fonts[0][symbol_code].width,fonts[0][symbol_code].height,0,frame_red,frame_green,frame_blue,frame_alpha,background_red,background_green,background_blue,background_alpha);}
    symbol_code=get_symbol_code(U"+",0);
    write_symbol_with_frame(pixels,width,height,depth,x,y,fonts[0][symbol_code].data,fonts[0][symbol_code].width,fonts[0][symbol_code].height,0,frame_red,frame_green,frame_blue,frame_alpha,background_red,background_green,background_blue,background_alpha);
    symbol_code=get_symbol_code(U".",0);
    write_symbol_with_frame(pixels,width,height,depth,x+(frame_width-1)*10,y,fonts[0][symbol_code].data,fonts[0][symbol_code].width,fonts[0][symbol_code].height,0,frame_red,frame_green,frame_blue,frame_alpha,background_red,background_green,background_blue,background_alpha);
    symbol_code=get_symbol_code(U"'",0);
    write_symbol_with_frame(pixels,width,height,depth,x+(frame_width-1)*10,y+(frame_height-1)*10,fonts[0][symbol_code].data,fonts[0][symbol_code].width,fonts[0][symbol_code].height,0,frame_red,frame_green,frame_blue,frame_alpha,background_red,background_green,background_blue,background_alpha);
    symbol_code=get_symbol_code(U"`",0);
    write_symbol_with_frame(pixels,width,height,depth,x,y+(frame_height-1)*10,fonts[0][symbol_code].data,fonts[0][symbol_code].width,fonts[0][symbol_code].height,0,frame_red,frame_green,frame_blue,frame_alpha,background_red,background_green,background_blue,background_alpha);}