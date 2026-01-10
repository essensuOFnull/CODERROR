{
let f=window.f,
d=window.d;
/*для иконки*/
f.init_printable_symbols();
d.dpr=window.devicePixelRatio||1;
/**размер иконки сайта*/
d.favicon.size=Math.round(16*d.dpr);
/**холст иконки сайта*/
d.favicon.canvas=document.createElement('canvas');
d.favicon.canvas.width=d.favicon.size;
d.favicon.canvas.height=d.favicon.size;
d.favicon.ctx=d.favicon.canvas.getContext('2d');
d.favicon.ctx.font=`${d.symbol_size}px CODERROR`;
d.favicon.ctx.textAlign='center';
d.favicon.ctx.textBaseline='middle';
/**ссылка на элемент иконки*/
d.favicon.link=document.querySelector('link[rel="icon"]');
/**автообновлятель иконки сайта*/
d.favicon.interval=setInterval(()=>{
    f.generate_favicon();
},1000/5);
}