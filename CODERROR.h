#ifndef PIXEL_OPERATIONS_H
#define PIXEL_OPERATIONS_H
#include<stdint.h>
void set_pixel(uint8_t*pixels,int width,int height,int x,int y,uint8_t red,uint8_t green,uint8_t blue);
void write_symbol_frame(uint8_t*pixels,int width,int height,int x,int y,bool*symbol,int symbol_width,int symbol_height,uint8_t direction,uint8_t red,uint8_t green,uint8_t blue);
void write_symbol(uint8_t*pixels,int width,int height,int x,int y,bool*symbol,int symbol_width,int symbol_height,uint8_t direction,uint8_t red,uint8_t green,uint8_t blue);
#endif